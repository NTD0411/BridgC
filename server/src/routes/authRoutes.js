import { Router } from 'express';
import { googleLogin, login, register } from '../controllers/authController.js';

const router = Router();
router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);
export default router;
