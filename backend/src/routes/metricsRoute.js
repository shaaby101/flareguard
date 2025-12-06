// backend/src/routes/metricsRoute.js
const express = require('express');
const router = express.Router();
const metricsService = require('../services/metricsService');

router.get('/status', (req, res) => {
    const data = metricsService.getLatestMetrics();
    res.json({
        success: true,
        data: data
    });
});

module.exports = router;