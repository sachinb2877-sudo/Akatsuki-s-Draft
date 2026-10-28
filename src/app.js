import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import errorHandler from './middleware/error.js';
import ApiError from './utils/ApiError.js';

const app = express();

// --------------- Global Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Root & Health Check ---------------
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Akatsuki's Draft API (Nodevember 4.0)",
    data: {
      documentation: 'See README.md & requests.http for details',
      endpoints: {
        health: 'GET /health',
        auth: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me'],
        posts: ['GET /posts', 'POST /posts', 'GET /posts/my-posts', 'GET /posts/:id', 'PATCH /posts/:id', 'DELETE /posts/:id'],
        admin: ['GET /admin/posts/pending', 'PATCH /admin/posts/approve/:id', 'PATCH /admin/posts/reject/:id'],
        ai: ['POST /ai/improve/:postId'],
      },
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// --------------- Routes ---------------
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/admin', adminRoutes);
app.use('/ai', aiRoutes);

// --------------- 404 Handler ---------------
app.all('*', (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// --------------- Error Handler ---------------
app.use(errorHandler);

export default app;
