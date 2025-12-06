// backend/src/index.js
const express = require('express');
const cors = require('cors'); // You might need to npm install cors
const metricsService = require('./services/metricsService');
const metricsRoute = require('./routes/metricsRoute');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/metrics', metricsRoute);

// Start Background Services
metricsService.startPolling();

// Start Server
app.listen(PORT, () => {
    console.log(`
    🚀 FlareGuard Backend running on http://localhost:${PORT}
    📡 Metrics Endpoint: http://localhost:${PORT}/api/metrics/status
    `);
});