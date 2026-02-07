const hre = require("hardhat");

async function main() {
    const GMT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    if (!GMT_ADDRESS) throw new Error("GMT_ADDRESS not set in .env");

    const goalWei = hre.ethers.parseEther("500", 18);
    const durationSections = 3600;

    const CF = await hre.ethers.getContractFactory("Crowdfunding");
    const cf = await CF.deploy(GMT_ADDRESS, goalWei, durationSections);
    await cf.waitForDeployment();

    console.log("Crowdfunding deployed to:", cf.target);
    console.log("GMT: ", GMT_ADDRESS);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });