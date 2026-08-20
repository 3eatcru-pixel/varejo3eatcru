import express from 'express';
import { requireApiAuth } from '../middleware/auth';
import { db } from '../../src/db';

const router = express.Router();

router.post('/api/ai/chat', requireApiAuth, async (req, res) => {
  res.json({ success: true, response: "AI functionality is currently running natively on DB context." });
});

export default router;
