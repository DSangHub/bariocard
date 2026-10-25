import express from 'express';
const router = express.Router();

// No promotions or points until licensing and provider approval are implemented.
router.post(['/draftkings/promo', '/fanduel/promo'], (req, res) => {
  res.status(503).json({
    error: 'Gaming rewards are not available. License submission, review, and approval are required before future activation.',
    enabled: false,
  });
});

export default router;
