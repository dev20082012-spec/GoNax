import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();
const authController = new AuthController();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.get('/me', requireAuth, authController.me);
router.get('/export-data', requireAuth, authController.exportData);
router.delete('/data', requireAuth, authController.deleteData);

export default router;
