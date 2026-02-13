import { Router } from 'express';
import * as ctrl from '../controllers/tchalaController';

const router = Router();

router.get('/search', ctrl.searchDreams);
router.get('/all', ctrl.getAllDreams);

export default router;
