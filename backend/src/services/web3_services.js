const { ethers } = require("ethers");
require('dotenv').config();

// --- CONFIGURATION ---
const COSTON2_RPC = process.env.FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";

// 1. OFFICIAL FTSOv2 ADDRESS (Coston2 Testnet)
// We hardcode this to avoid Registry lookup errors.
const FTSO_V2_ADDRESS = "0x3d893C53D9e8056135C26C8c638B76C8b60Df726";

// 2. Feed ID for BTC/USD
const BTC_USD_FEED_ID = "0x014254432f55534400000000000000000000000000"; 

// --- ABI ---
// Defined as 'view' to force a read-only call (no transaction gas)
const FTSO_V2_ABI = [
    "function getFeedsById(bytes21[] calldata _feedIds) external view returns (uint256[] memory values, int8[] memory decimals, uint64 timestamp)"
];

const SMART_ACCOUNT_ABI = [
    "function updateRisk(uint256 marketRisk, bool hasPump) external",
    "function triggered() view returns (bool)"
];

// --- SETUP ---
const provider = new ethers.JsonRpcProvider(COSTON2_RPC);

const signer = process.env.OPERATOR_PRIVATE_KEY 
    ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider) 
    : null;

/**
 * 1. GET PRICE FROM FTSOv2 (Real-Time)
 */
async function getFTSOPrice() {
    try {
        // Use the hardcoded address directly
        const ftsoV2 = new ethers.Contract(FTSO_V2_ADDRESS, FTSO_V2_ABI, provider);
        
        // Fetch data
        const result = await ftsoV2.getFeedsById([BTC_USD_FEED_ID]);

        // Safely access result by index (safer than by name)
        // result[0] = values array
        // result[1] = decimals array
        const rawPrice = result[0][0]; 
        const decimals = result[1][0];
        
        // Convert to readable number
        const priceFormatted = ethers.formatUnits(rawPrice, decimals);
        
        // Return valid object
        return {
            price: parseFloat(priceFormatted),
            timestamp: Number(result[2]) * 1000 
        };

    } catch (error) {
        // Detailed error logging to help debug
        console.error("❌ FTSO Read Error:", error.message);
        return { price: 0, timestamp: Date.now() }; 
    }
}

/**
 * 2. UPDATE SMART ACCOUNT
 */
async function triggerSmartAccount(riskScore, isPump) {
    if (!signer) {
        console.error("❌ No Private Key found. Cannot sign transaction.");
        return;
    }

    const smartAccountAddr = process.env.RISK_CONTRACT_ADDRESS;
    if (!smartAccountAddr || smartAccountAddr.includes("00000000")) {
        console.error("❌ Invalid RISK_CONTRACT_ADDRESS. Skipping update.");
        return;
    }

    try {
        const contract = new ethers.Contract(smartAccountAddr, SMART_ACCOUNT_ABI, signer);
        console.log(`⚠️ TRIGGERING SMART ACCOUNT! Risk: ${riskScore}`);
        
        const tx = await contract.updateRisk(riskScore, isPump);
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        await tx.wait(1);
        console.log("✅ Smart Account Updated Successfully.");
        return tx.hash;

    } catch (error) {
        console.error("❌ Smart Account Update Failed:", error.message);
    }
}

module.exports = { getFTSOPrice, triggerSmartAccount };