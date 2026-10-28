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
 * @desc    Create a new post
 * @route   POST /api/posts
 * @access  Private
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, description, content, image, category, status } = req.body;

  if (status && !['draft', 'pending'].includes(status)) {
    throw new ApiError(400, 'Status can only be "draft" or "pending" when creating a post');
  }

  const post = await Post.create({
    title,
    description,
    content,
    image,
    category,
    status: status || 'draft',
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: { post },
  });
});

/**
 * @desc    Get all approved posts (public/authenticated)
 * @route   GET /api/posts
 * @access  Public
 */
const getPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;

  const filter = { status: 'approved' };

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Posts retrieved',
    data: {
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * @desc    Get posts created by the authenticated user
 * @route   GET /api/posts/mine
 * @access  Private
 */
const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Your posts retrieved',
    data: { posts },
  });
});

/**
 * @desc    Get a single post by ID
 * @route   GET /api/posts/:id
 * @access  Public
 */
const getPostById = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const post = await Post.findById(req.params.id).populate('createdBy', 'name email');

  if (!post || post.status !== 'approved') {
    throw new ApiError(404, 'Post not found');
  }

  res.status(200).json({
    success: true,
    message: 'Post retrieved',
    data: { post },
  });
});

/**
 * @desc    Update an existing post
 * @route   PUT /api/posts/:id
 * @access  Private (owner only)
 */
const updatePost = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only update your own posts');
  }

  const { title, description, content, image, category, status } = req.body;

  if (status && !['draft', 'pending'].includes(status)) {
    throw new ApiError(400, 'You can only set status to "draft" or "pending"');
  }

  // Track whether any content field changed
  let contentChanged = false;

  if (title !== undefined) {
    post.title = title;
    contentChanged = true;
  }
  if (description !== undefined) {
    post.description = description;
    contentChanged = true;
  }
  if (content !== undefined) {
    post.content = content;
    contentChanged = true;
  }
  if (image !== undefined) {
    post.image = image;
    contentChanged = true;
  }
  if (category !== undefined) {
    post.category = category;
    contentChanged = true;
  }

  // Handle status logic
  if (status) {
    // User explicitly provided a status ('draft' or 'pending') — use it
    post.status = status;
  } else if (
    (post.status === 'approved' || post.status === 'rejected') &&
    contentChanged
  ) {
    // Content changed on a previously approved/rejected post — reset to pending
    post.status = 'pending';
  }

  await post.save();

  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    data: { post },
  });
});

/**
 * @desc    Delete a post
 * @route   DELETE /api/posts/:id
 * @access  Private (owner only)
 */
const deletePost = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only delete your own posts');
  }

  await post.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully',
    data: null,
  });
});

export { createPost, getPosts, getMyPosts, getPostById, updatePost, deletePost };
