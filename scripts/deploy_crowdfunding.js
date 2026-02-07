const hre = require("hardhat");

async function main() {
  const rewardTokenAddress = process.env.REWARD_TOKEN_ADDRESS || process.argv[2];
  if (!rewardTokenAddress) {
    throw new Error("Missing RewardToken address. Pass REWARD_TOKEN_ADDRESS or argv[2].");
  }

  const rewardPerEth = hre.ethers.parseUnits("100", 18); // 100 GMAT per 1 ETH

  const CF = await hre.ethers.getContractFactory("GameCrowdfunding");
  const cf = await CF.deploy(rewardTokenAddress, rewardPerEth);
  await cf.waitForDeployment();

  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = RewardToken.attach(rewardTokenAddress);
  const tx = await rewardToken.setMinter(cf.target, true);
  await tx.wait();

  console.log("GameCrowdfunding deployed to:", cf.target);
  console.log("RewardToken (GMAT):", rewardTokenAddress);
  console.log("Reward rate:", hre.ethers.formatUnits(rewardPerEth, 18), "GMAT per ETH");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});