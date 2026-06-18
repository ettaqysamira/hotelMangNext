import { Router } from 'express';
import { createHostel, getAllHostels, getHostelById, updateHostel, deleteHostel } from '../controllers/hostel.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

router.post('/', restrictTo(Role.SUPER_ADMIN), createHostel);
router.get('/', getAllHostels);
router.get('/:id', getHostelById);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.MANAGER), updateHostel);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN), deleteHostel);

export default router;
