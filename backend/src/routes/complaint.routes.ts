import { Router } from 'express';
import { createComplaint, autoAssignComplaint, updateComplaintStatus, getMyComplaints, getAllComplaints } from '../controllers/complaint.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Endpoint for n8n to call back after classification (Public webhook target)
router.patch('/:id/auto-assign', autoAssignComplaint);

// Protected Routes
router.use(protect);
router.post('/', restrictTo(Role.GUEST), createComplaint);
router.patch('/:id/status', restrictTo(Role.SUPER_ADMIN, Role.MANAGER, Role.MAINTENANCE), updateComplaintStatus);
router.get('/my-complaints', restrictTo(Role.GUEST), getMyComplaints);
router.get('/', restrictTo(Role.SUPER_ADMIN, Role.MANAGER, Role.MAINTENANCE), getAllComplaints);

export default router;
