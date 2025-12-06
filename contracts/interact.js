const hre = require("hardhat");

// REPLACE THIS WITH YOUR DEPLOYED ADDRESS AFTER RUNNING DEPLOY.JS
const CONTRACT_ADDRESS = "0x2edf6f6C796e231865e32983E94DDC51914e0302"; 

async function main() {
  if (CONTRACT_ADDRESS === "YOUR_DEPLOYED_ADDRESS_HERE") {
    console.error("❌ Error: Update CONTRACT_ADDRESS in interact.js first!");
    return;
  }

  const [signer] = await hre.ethers.getSigners();
  const smartAccount = await hre.ethers.getContractAt("FlareGuardSmartAccount", CONTRACT_ADDRESS, signer);

  console.log(`📡 Interacting with contract at: ${CONTRACT_ADDRESS}`);

  // 1. Check Status
  console.log("1️⃣  Checking Status...");
  console.log("   - Triggered:", await smartAccount.triggered());

  // 2. Simulate High Risk
  console.log("2️⃣  Simulating HIGH RISK (Score: 99)...");
  const tx = await smartAccount.updateRisk(99, true);
  await tx.wait();
  console.log("   - Update Confirmed.");

  // 3. Verify Trigger
  console.log("3️⃣  Verifying Trigger...");
  console.log("   - Triggered:", await smartAccount.triggered());

  // 4. Reset
  console.log("4️⃣  Resetting System...");
  const resetTx = await smartAccount.manualReset();
  await resetTx.wait();
  console.log("   - System Reset to SAFE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});