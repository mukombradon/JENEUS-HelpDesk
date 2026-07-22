import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginLimiter, passwordLimiter } from '../middleware/rateLimiter';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth';
import * as authController from '../controllers/authController';

const router = Router();

// ── Public routes (with rate limiting) ────────────────────────────────────
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post(
  '/forgot-password',
  passwordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  passwordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// ── Authenticated routes ───────────────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
