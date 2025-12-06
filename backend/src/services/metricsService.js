// backend/src/services/metricsService.js
const ftsoClient = require('../flare/ftsoClient'); 
const web3Service = require('./web3_services'); // <--- FIXED: Uses ./ to look in same folder
const riskEngine = require('../core/riskEngine');
const pumpDetector = require('../core/pumpDetector');

// In-Memory Storage
const priceHistoryCache = {};
const HISTORY_LIMIT = 10; 

let currentMarketStatus = {
    timestamp: Date.now(),
    status: 'INITIALIZING',
    tokens: []
};

const TOKENS = ['BTC', 'ETH', 'XRP'];

async function updateMetrics() {
    try {
        const tokenResults = [];
        let globalPumpDetected = false;

        for (const symbol of TOKENS) {
            let currentPrice;

            // --- HYBRID DATA SOURCE ---
            if (symbol === 'BTC') {
                // USE REAL FLARE FTSOv2 DATA FOR BTC
                const ftsoData = await web3Service.getFTSOPrice();
                if (ftsoData.price > 0) {
                    currentPrice = ftsoData.price;
                } else {
                    // Fallback to mock if RPC fails
                    currentPrice = await ftsoClient.getPrice(symbol);
                }
            } else {
                // Keep using Mock for ETH/XRP for the demo dashboard
                currentPrice = await ftsoClient.getPrice(symbol);
            }
            
            // 2. Update History
            if (!priceHistoryCache[symbol]) priceHistoryCache[symbol] = [];
            priceHistoryCache[symbol].push(currentPrice);
            if (priceHistoryCache[symbol].length > HISTORY_LIMIT) {
                priceHistoryCache[symbol].shift(); 
            }

            // 3. Analyze
            const history = priceHistoryCache[symbol];
            const startPrice = history[0]; 
            
            const { isPump, isDump, percentChange } = pumpDetector.analyzePumpDump(startPrice, currentPrice);
            const riskScore = riskEngine.calculateRiskScore(history, isPump, isDump);

            if (isPump) globalPumpDetected = true;

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
        const finalRiskScore = Math.round(avgRisk);
        
        currentMarketStatus = {
            timestamp: Date.now(),
            status: finalRiskScore > 75 ? 'DANGER' : avgRisk > 40 ? 'CAUTION' : 'SAFE',
            averageRisk: finalRiskScore,
            tokens: tokenResults
        };

        console.log(`[Metrics] Risk: ${finalRiskScore} | BTC Price: $${tokenResults.find(t=>t.symbol==='BTC').price}`);

        // --- 5. TRIGGER SMART ACCOUNT ON CHAIN ---
        // If Risk is High OR Pump Detected, we write to the blockchain
        if (finalRiskScore > 80 || globalPumpDetected) {
            // We use the new Web3 Service to send the transaction
            await web3Service.triggerSmartAccount(finalRiskScore, globalPumpDetected);
        }

    } catch (error) {
        console.error("Error in Metrics Service:", error);
    }
}

function startPolling() {
    updateMetrics(); 
    setInterval(updateMetrics, 10000); // Check every 10 seconds
}

function getLatestMetrics() {
    return currentMarketStatus;
}

module.exports = { startPolling, getLatestMetrics };