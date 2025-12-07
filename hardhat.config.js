require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

// Default to empty string to prevent crashing if .env is missing during initial setup
const PRIVATE_KEY ="";
if (!PRIVATE_KEY) {
  console.error("❌ ERROR: PRIVATE_KEY is missing! Check your .env file.");
} else {
  console.log("✅ PRIVATE_KEY loaded successfully!");
}

module.exports = {
  solidity: "0.8.20",
  networks: {
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
    }
  }
};