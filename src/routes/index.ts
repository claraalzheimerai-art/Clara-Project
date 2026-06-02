import { Router } from 'express';
import analysisRoutes from './analysis.routes';
import historyRoutes from './history.routes';

const router = Router();

router.use('/analysis', analysisRoutes);
router.use('/history', historyRoutes);

export default router;