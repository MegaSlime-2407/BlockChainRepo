require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    let contractAddress = process.env.CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    
    const addressIndex = process.argv.indexOf('--address');
    let checkAddress;
    
    if (addressIndex !== -1 && addressIndex + 1 < process.argv.length) {
        checkAddress = process.argv[addressIndex + 1];
    } else {
        checkAddress = deployer.address;
        console.log("No address provided, checking deployer balance");
    }
    
    console.log(`\nChecking balance for: ${checkAddress}`);
    console.log(`Contract address: ${contractAddress}`);
    
    const ERC20_ABI = [
        "function balanceOf(address account) public view returns (uint256)",
        "function decimals() public view returns (uint8)",
        "function name() public view returns (string)",
        "function symbol() public view returns (string)"
    ];

    const token = new ethers.Contract(contractAddress, ERC20_ABI, deployer);

    try {
        const decimals = await token.decimals();
        const balance = await token.balanceOf(checkAddress);
        const formattedBalance = ethers.formatUnits(balance, decimals);
        const name = await token.name();
        const symbol = await token.symbol();
        
        console.log(`\n✅ Balance: ${formattedBalance} ${symbol}`);
        console.log(`   Raw balance: ${balance.toString()} (wei)`);
        
        if (checkAddress.toLowerCase() !== deployer.address.toLowerCase()) {
            const deployerBalance = await token.balanceOf(deployer.address);
            const formattedDeployerBalance = ethers.formatUnits(deployerBalance, decimals);
            console.log(`\n📊 Deployer (${deployer.address}): ${formattedDeployerBalance} ${symbol}`);
        }
        
    } catch (error) {
        console.error("Error checking balance:", error.message);
        if (error.message.includes("code") || error.message.includes("contract")) {
            console.log("\n⚠️  Make sure:");
            console.log("   1. The contract is deployed");
            console.log("   2. The contract address is correct");
            console.log("   3. Hardhat node is running");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
