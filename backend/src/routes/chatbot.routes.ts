import { Router } from 'express';
import { handleChat } from '../controllers/chatbot.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.post('/message', protect, handleChat);

export default router;
