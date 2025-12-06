// backend/src/flare/ftsoClient.js
const { ethers } = require('ethers');

// Base prices to simulate market data
const BASE_PRICES = {
    BTC: 65000,
    ETH: 3500,
    XRP: 0.60,
    FLR: 0.03
};

/**
 * Simulates fetching the latest price from Flare FTSO.
 * Includes random noise to simulate market volatility for testing.
 * @param {string} symbol - e.g., 'BTC'
 * @returns {Promise<number>}
 */
async function getPrice(symbol) {
    // In a real production app, you would use:
    // const ftsoRegistry = new ethers.Contract(REGISTRY_ADDR, ABI, provider);
    // const price = await ftsoRegistry.getCurrentPrice(symbol);
    
    // MOCK LOGIC:
    const base = BASE_PRICES[symbol] || 100;
    // Fluctuate price by +/- 0.5% randomly
    const fluctuation = 1 + (Math.random() * 0.01 - 0.005); 
    const price = base * fluctuation;

    return parseFloat(price.toFixed(4));
}

module.exports = { getPrice };