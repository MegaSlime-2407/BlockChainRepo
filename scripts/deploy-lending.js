// Deploy TestToken + LendingPool for the frontend.
// npx hardhat run scripts/deploy-lending.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deploying from", deployer.address);

  const TestToken = await ethers.getContractFactory("TestToken");
  const token = await TestToken.deploy();
  await token.waitForDeployment();
  console.log("TestToken:", token.target, "(deployer has 1M TT)");

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(token.target);
  await pool.waitForDeployment();
  console.log("LendingPool:", pool.target);

  console.log("\n--- set Lending Pool in frontend to:", pool.target);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
