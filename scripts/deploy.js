require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying from", deployer.address);

    const GMT = await ethers.getContractFactory("GMT");
    const gmt = await GMT.deploy(ethers.parseUnits("1000", 18));
    await gmt.waitForDeployment();
    console.log("GMT:", gmt.target);

    const FarmToken = await ethers.getContractFactory("FarmToken");
    const farm = await FarmToken.deploy(gmt.target, ethers.parseUnits("1", 18), ethers.parseUnits("10", 18), 300);
    await farm.waitForDeployment();
    console.log("Farm:", farm.target, "(need 1 GMT, 10 FARM/claim, 300s cooldown)");

    const RewardToken = await ethers.getContractFactory("RewardToken");
    const rewardToken = await RewardToken.deploy();
    await rewardToken.waitForDeployment();
    const price = await rewardToken.pricePerToken();
    console.log("RewardToken (GMAT):", rewardToken.target, "- Price:", ethers.formatEther(price), "ETH per token");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
