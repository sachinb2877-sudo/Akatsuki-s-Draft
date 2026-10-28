import { Router } from 'express';
import {
  getPendingPosts,
  approvePost,
  rejectPost,
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/role.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/posts/pending', getPendingPosts);
router.patch('/posts/approve/:id', approvePost);
router.patch('/posts/reject/:id', rejectPost);

export default router;
