import { Router } from 'express';
import * as ctrl from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/schemas';

const router = Router();

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/verify-email', ctrl.verifyEmail);
router.post('/resend-verification', ctrl.resendVerification);
router.post('/logout', authenticate, ctrl.logout);
router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), ctrl.updateProfile);

export default router;
