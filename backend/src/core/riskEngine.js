// backend/src/core/riskEngine.js

/**
 * Calculates standard deviation (volatility).
 * @param {number[]} prices - Array of historical prices
 */
function calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
}

/**
 * Computes the final Risk Score (0 = Safe, 100 = Dangerous).
 * @param {number[]} priceHistory - Last N prices
 * @param {boolean} isPump - From pumpDetector
 * @param {boolean} isDump - From pumpDetector
 */
function calculateRiskScore(priceHistory, isPump, isDump) {
    if (priceHistory.length === 0) return 0;

    const volatility = calculateVolatility(priceHistory);
    
    // Normalize volatility: We assume a stdDev of > 2% of price is "High Volatility"
    const meanPrice = priceHistory[0]; 
    const volatilityRatio = volatility / meanPrice; 
    
    // Base Score: Scale volatility to 0-60
    let score = Math.min(volatilityRatio * 1000, 60);

    // Penalties: Add points for pump/dump events
    if (isPump || isDump) {
        score += 30; // Immediate danger penalty
    }

    return Math.min(Math.round(score), 100);
}

module.exports = { calculateRiskScore };