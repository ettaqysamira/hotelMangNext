import { Router } from 'express';
import { createRoom, getAllRooms, getRoomById, updateRoom, deleteRoom, recommendRooms } from '../controllers/room.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

router.post('/recommend', recommendRooms);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.MANAGER), createRoom);
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.MANAGER), updateRoom);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN, Role.MANAGER), deleteRoom);

export default router;
