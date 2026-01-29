require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying MyNFT with account:", deployer.address);

    const MyNFT = await ethers.getContractFactory("MyNFT");
    const nft = await MyNFT.deploy();

    await nft.waitForDeployment();
    console.log("MyNFT deployed to:", nft.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
