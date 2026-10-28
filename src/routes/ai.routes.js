import { Router } from 'express';
import { improvePost } from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/improve/:postId', protect, improvePost);

export default router;
