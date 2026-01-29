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
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
