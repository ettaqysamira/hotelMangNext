import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { generateChatResponse } from '../services/huggingface.service';

export const handleChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({
        status: 'error',
        message: 'Le message de l\'utilisateur est requis.'
      });
      return;
    }

    const formattedHistory = Array.isArray(history) ? history : [];
    
    // Call Hugging Face
    const reply = await generateChatResponse(message, formattedHistory);

    res.status(200).json({
      status: 'success',
      reply
    });
  } catch (error) {
    next(error);
  }
};
