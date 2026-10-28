import { Router } from 'express';
import {
  createPost,
  getPosts,
  getMyPosts,
  getPostById,
  updatePost,
  deletePost,
} from '../controllers/post.controller.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().trim().optional(),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
  category: z.string().trim().optional(),
  status: z.enum(['draft', 'pending']).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  description: z.string().trim().optional(),
  content: z.string().min(1, 'Content cannot be empty').optional(),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
  category: z.string().trim().optional(),
  status: z.enum(['draft', 'pending']).optional(),
});

// Public route – returns only approved posts
router.get('/', getPosts);

// Protected routes – IMPORTANT: /my-posts BEFORE /:id
router.get('/my-posts', protect, getMyPosts);
router.get('/:id', getPostById);

router.post('/', protect, validate(createPostSchema), createPost);
router.patch('/:id', protect, validate(updatePostSchema), updatePost);
router.delete('/:id', protect, deletePost);

export default router;
