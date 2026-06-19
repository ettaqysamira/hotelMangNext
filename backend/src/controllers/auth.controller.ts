import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { randomUUID } from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const generateAccessToken = (userId: string, email: string, role: string, firstName: string, lastName: string, organizationId?: string | null) => {
  return jwt.sign(
    { id: userId, email, role, firstName, lastName, organizationId },
    process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (userId: string, email: string, role: string, firstName: string, lastName: string, organizationId?: string | null) => {
  return jwt.sign(
    { id: userId, email, role, firstName, lastName, organizationId, jti: randomUUID() },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );
};

// Helper to manually parse cookies since we are avoiding cookie-parser overhead
const getCookie = (req: Request, name: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const parts = c.split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  return cookies[name];
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'Cette adresse e-mail est déjà utilisée.'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: role || 'GUEST'
        }
      });

      // If registered user is a guest, initialize profile
      if (newUser.role === 'GUEST') {
        await tx.guestProfile.create({
          data: {
            userId: newUser.id,
            preferences: {}
          }
        });
      }

      // Add to audit log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'REGISTER',
          entity: 'User',
          entityId: newUser.id,
          details: { email: newUser.email, role: newUser.role }
        }
      });

      return newUser;
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role, user.firstName, user.lastName, user.organizationId);
    const refreshTokenStr = generateRefreshToken(user.id, user.email, user.role, user.firstName, user.lastName, user.organizationId);

    // Save refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId: user.id,
        expiresAt
      }
    });

    // Set Refresh Token in Cookie (HTTP-only)
    res.cookie('refreshToken', refreshTokenStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // In milliseconds
    });

    // Send Response (Avoid returning passwordHash)
    res.status(201).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'Identifiants invalides ou compte inactif.'
      });
      return;
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordCorrect) {
      res.status(401).json({
        status: 'error',
        message: 'Identifiants invalides ou compte inactif.'
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role, user.firstName, user.lastName, user.organizationId);
    const refreshTokenStr = generateRefreshToken(user.id, user.email, user.role, user.firstName, user.lastName, user.organizationId);

    // Save refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId: user.id,
        expiresAt
      }
    });

    // Save login audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Set Refresh Token in Cookie (HTTP-only)
    res.cookie('refreshToken', refreshTokenStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshTokenStr = getCookie(req, 'refreshToken');

    if (!refreshTokenStr) {
      res.status(401).json({
        status: 'error',
        message: 'Session expirée ou refresh token manquant.'
      });
      return;
    }

    // Find and validate refresh token in DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true }
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      res.status(401).json({
        status: 'error',
        message: 'Session expirée ou refresh token invalide/révoqué.'
      });
      return;
    }

    // Verify token cryptographic signature
    let decoded;
    try {
      decoded = jwt.verify(refreshTokenStr, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret') as {
        id: string;
        email: string;
        role: string;
        organizationId?: string | null;
      };
    } catch (err) {
      res.status(401).json({
        status: 'error',
        message: 'Cryptographic validation failed'
      });
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(dbToken.user.id, dbToken.user.email, dbToken.user.role, dbToken.user.firstName, dbToken.user.lastName, dbToken.user.organizationId);

    // Optional Token Rotation: revoke current, generate new refresh token
    const newRefreshTokenStr = generateRefreshToken(dbToken.user.id, dbToken.user.email, dbToken.user.role, dbToken.user.firstName, dbToken.user.lastName, dbToken.user.organizationId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Database transaction to rotate tokens
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revoked: true }
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshTokenStr,
          userId: dbToken.user.id,
          expiresAt
        }
      })
    ]);

    // Set new Cookie
    res.cookie('refreshToken', newRefreshTokenStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshTokenStr = getCookie(req, 'refreshToken');

    if (refreshTokenStr) {
      // Revoke in database
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenStr },
        data: { revoked: true }
      });
    }

    // Clear client cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      status: 'success',
      message: 'Déconnexion réussie.'
    });
  } catch (error) {
    next(error);
  }
};
