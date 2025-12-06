const { ethers } = require("ethers");
require('dotenv').config();

// --- CONFIGURATION ---
const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";
// The official Flare Contract Registry
const FLARE_CONTRACT_REGISTRY_ADDR = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"; 

// BTC/USD Feed ID (FTSOv2)
const BTC_USD_FEED_ID = "0x014254432f55534400000000000000000000000000"; 

// --- ABIs ---
const REGISTRY_ABI = ["function getContractAddressByName(string name) public view returns (address)"];
const FTSO_V2_ABI = [
    "function getFeedsById(bytes21[] calldata _feedIds) external payable returns (uint256[] memory values, int8[] memory decimals, uint64 timestamp)"
];
const SMART_ACCOUNT_ABI = [
    "function updateRisk(uint256 marketRisk, bool hasPump) public",
    "function triggered() view returns (bool)",
    "function status() view returns (uint8)"
];

// --- SETUP PROVIDER & SIGNER ---
const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
// Fallback to read-only if no private key
const signer = process.env.OPERATOR_PRIVATE_KEY 
    ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider) 
    : null;

/**
 * 1. GET PRICE FROM FTSOv2
 * Fetches the real on-chain price of BTC.
 */
async function getFTSOPrice() {
    try {
        // A. Find FTSOv2 Address from Registry
        const registry = new ethers.Contract(FLARE_CONTRACT_REGISTRY_ADDR, REGISTRY_ABI, provider);
        const ftsoV2Address = await registry.getContractAddressByName("FtsoV2");
        
        // B. Call FTSOv2
        const ftsoV2 = new ethers.Contract(ftsoV2Address, FTSO_V2_ABI, provider);
        const result = await ftsoV2.getFeedsById([BTC_USD_FEED_ID]);

        // C. Format Data
        const rawPrice = result.values[0]; // BigInt
        const decimals = result.decimals[0]; // Number
        
        const priceFormatted = ethers.formatUnits(rawPrice, decimals);
        
        return {
            price: parseFloat(priceFormatted),
            timestamp: Number(result.timestamp)
        };
    } catch (error) {
        console.error("❌ FTSO Read Error:", error.message);
        return { price: 0, timestamp: Date.now() }; // Fail safe
    }
}

/**
 * 2. UPDATE SMART ACCOUNT
 * Called when Risk > 80.
 */
async function triggerSmartAccount(riskScore, isPump) {
    if (!signer) {
        console.error("❌ No Private Key found in .env. Cannot update Smart Account.");
        return;
    }

    // Your Deployed Contract Address (From .env)
    const smartAccountAddr = process.env.RISK_CONTRACT_ADDRESS;
    if (!smartAccountAddr) {
        console.error("❌ RISK_CONTRACT_ADDRESS missing in .env");
        return;
    }

    try {
        const contract = new ethers.Contract(smartAccountAddr, SMART_ACCOUNT_ABI, signer);
        
        console.log(`⚠️ TRIGGERING SMART ACCOUNT! Risk: ${riskScore}`);
        // Note: Make sure your contract function matches this signature
        const tx = await contract.updateRisk(riskScore, isPump);
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Smart Account Updated Successfully.");
        return tx.hash;
    } catch (error) {
        console.error("❌ Smart Account Update Failed:", error.message);
    }
}

module.exports = { getFTSOPrice, triggerSmartAccount };