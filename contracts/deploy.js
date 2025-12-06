const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FlareGuardSmartAccount to Coston2...");

  const SmartAccount = await hre.ethers.getContractFactory("FlareGuardSmartAccount");
  const smartAccount = await SmartAccount.deploy();

  await smartAccount.waitForDeployment();
  
  const address = await smartAccount.getAddress();
  
  console.log("----------------------------------------------------");
  console.log("✅ DEPLOYMENT SUCCESS!");
  console.log("📄 Contract Address:", address);
  console.log("----------------------------------------------------");
  console.log("👉 SAVE THIS ADDRESS for your Backend .env file!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});