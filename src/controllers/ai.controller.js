import mongoose from 'mongoose';
import Post from '../models/Post.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { improveContent } from '../services/gemini.service.js';

/**
 * Validates that the given ID is a valid MongoDB ObjectId.
 */
const validateObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid ID format');
  }
};

/**
 * @desc    Improve a post's content using AI and create a new draft
 * @route   POST /api/ai/improve/:postId
 * @access  Private (owner only)
 */
const improvePost = asyncHandler(async (req, res) => {
  validateObjectId(req.params.postId);

  const post = await Post.findById(req.params.postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only improve your own posts');
  }

  const improvedContent = await improveContent(post.content);

  const newPost = await Post.create({
    title: `${post.title} (AI Improved)`,
    description: post.description,
    content: improvedContent,
    image: post.image,
    category: post.category,
    createdBy: req.user._id,
    status: 'draft',
  });

  res.status(201).json({
    success: true,
    message: 'Post improved with AI successfully. A new draft has been created.',
    data: { post: newPost },
  });
});

export { improvePost };
