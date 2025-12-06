// backend/src/services/metricsService.js
const ftsoClient = require('../flare/ftsoClient');
const riskEngine = require('../core/riskEngine');
const pumpDetector = require('../core/pumpDetector');

// In-Memory Storage
// Structure: { 'BTC': [price1, price2...], 'ETH': [...] }
const priceHistoryCache = {};
const HISTORY_LIMIT = 10; // Keep last 10 data points

// The final object we serve to the API
let currentMarketStatus = {
    timestamp: Date.now(),
    status: 'INITIALIZING',
    tokens: []
};

const TOKENS = ['BTC', 'ETH', 'XRP'];

async function updateMetrics() {
    try {
        const tokenResults = [];

        for (const symbol of TOKENS) {
            // 1. Get Data
            const currentPrice = await ftsoClient.getPrice(symbol);
            
            // 2. Update History
            if (!priceHistoryCache[symbol]) priceHistoryCache[symbol] = [];
            priceHistoryCache[symbol].push(currentPrice);
            if (priceHistoryCache[symbol].length > HISTORY_LIMIT) {
                priceHistoryCache[symbol].shift(); // Remove oldest
            }

            // 3. Analyze
            const history = priceHistoryCache[symbol];
            const startPrice = history[0]; // Price roughly N minutes ago
            
            const { isPump, isDump, percentChange } = pumpDetector.analyzePumpDump(startPrice, currentPrice);
            const riskScore = riskEngine.calculateRiskScore(history, isPump, isDump);

            tokenResults.push({
                symbol,
                price: currentPrice,
                change: percentChange,
                isPump,
                isDump,
                riskScore
            });
        }

        // 4. Update Global State
        const avgRisk = tokenResults.reduce((sum, t) => sum + t.riskScore, 0) / tokenResults.length;
        
        currentMarketStatus = {
            timestamp: Date.now(),
            status: avgRisk > 50 ? 'CAUTION' : 'SAFE',
            averageRisk: Math.round(avgRisk),
            tokens: tokenResults
        };

        console.log(`[MetricsService] Updated. Market Risk: ${currentMarketStatus.averageRisk}`);

    } catch (error) {
        console.error("Error in Metrics Service:", error);
    }
}

// Start Polling Loop (every 5 seconds for demo purposes, usually 30s)
function startPolling() {
    updateMetrics(); // Run immediately
    setInterval(updateMetrics, 5000); 
}

function getLatestMetrics() {
    return currentMarketStatus;
}

module.exports = { startPolling, getLatestMetrics };