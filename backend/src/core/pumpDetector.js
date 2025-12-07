// backend/src/core/pumpDetector.js

const PUMP_THRESHOLD_PERCENT = 3.0; // +3% trigger
const DUMP_THRESHOLD_PERCENT = -3.0; // -3% trigger

/**
 * Detects if a token is pumping or dumping based on start vs end price.
 * @param {number} startPrice - Price N minutes ago
 * @param {number} currentPrice - Current Price
 */
function analyzePumpDump(startPrice, currentPrice) {
    if (!startPrice || startPrice === 0) {
        return { isPump: false, isDump: false, percentChange: 0 };
    }

    const percentChange = ((currentPrice - startPrice) / startPrice) * 100;

    return {
        isPump: percentChange >= PUMP_THRESHOLD_PERCENT,
        isDump: percentChange <= DUMP_THRESHOLD_PERCENT,
        percentChange: parseFloat(percentChange.toFixed(2))
    };
}

module.exports = { analyzePumpDump };