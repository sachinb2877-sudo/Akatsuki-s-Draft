import mongoose from 'mongoose';
import Post from '../models/Post.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Validates that the given ID is a valid MongoDB ObjectId.
 */
const validateObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid ID format');
  }
};

/**
 * @desc    Get all pending posts for admin review
 * @route   GET /api/admin/posts/pending
 * @access  Private (admin only)
 */
const getPendingPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({ status: 'pending' })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Pending posts retrieved',
    data: { posts },
  });
});

/**
 * @desc    Approve a pending post
 * @route   PATCH /api/admin/posts/:id/approve
 * @access  Private (admin only)
 */
const approvePost = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.status !== 'pending') {
    throw new ApiError(400, 'Only pending posts can be approved');
  }

  post.status = 'approved';
  await post.save();

  res.status(200).json({
    success: true,
    message: 'Post approved successfully',
    data: { post },
  });
});

/**
 * @desc    Reject a pending post
 * @route   PATCH /api/admin/posts/:id/reject
 * @access  Private (admin only)
 */
const rejectPost = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.status !== 'pending') {
    throw new ApiError(400, 'Only pending posts can be rejected');
  }

  post.status = 'rejected';

  if (req.body.reason) {
    post.rejectionReason = req.body.reason;
  }

  await post.save();

  res.status(200).json({
    success: true,
    message: 'Post rejected',
    data: { post },
  });
});

export { getPendingPosts, approvePost, rejectPost };
