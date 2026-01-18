require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Sending tokens from account:", deployer.address);

    let contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
        console.log("CONTRACT_ADDRESS not set. Please provide the contract address:");
        console.log("Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/sendTokens.js --network localhost");
        console.log("Or update the script with your contract address.");
        process.exit(1);
    }

    const ERC20_ABI = [
        "function balanceOf(address account) public view returns (uint256)",
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() public view returns (uint8)"
    ];

    const token = new ethers.Contract(contractAddress, ERC20_ABI, deployer);

    const decimals = await token.decimals();
    const balance = await token.balanceOf(deployer.address);
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log(`Deployer balance: ${formattedBalance} MTK`);

    const recipientIndex = process.argv.indexOf('--recipient');
    const amountIndex = process.argv.indexOf('--amount');

    let recipient, amount;

    if (recipientIndex !== -1 && recipientIndex + 1 < process.argv.length) {
        recipient = process.argv[recipientIndex + 1];
    } else {
        console.log("\nPlease provide recipient address and amount:");
        console.log("Usage: npx hardhat run scripts/sendTokens.js --network localhost -- --recipient 0x... --amount 100");
        console.log("\nOr use interactive mode (edit script to enable prompts)");
        process.exit(1);
    }

    if (amountIndex !== -1 && amountIndex + 1 < process.argv.length) {
        amount = parseFloat(process.argv[amountIndex + 1]);
    } else {
        console.log("\nPlease provide amount:");
        console.log("Usage: npx hardhat run scripts/sendTokens.js --network localhost -- --recipient 0x... --amount 100");
        process.exit(1);
    }

    if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address");
    }

    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    if (balance < amountWei) {
        throw new Error(`Insufficient balance. Have ${formattedBalance} MTK, trying to send ${amount} MTK`);
    }

    console.log(`\nSending ${amount} MTK to ${recipient}...`);

    const tx = await token.transfer(recipient, amountWei);
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transfer successful! Confirmed in block ${receipt.blockNumber}`);

    const newDeployerBalance = await token.balanceOf(deployer.address);
    const newRecipientBalance = await token.balanceOf(recipient);
    
    console.log(`\nNew balances:`);
    console.log(`Deployer: ${ethers.formatUnits(newDeployerBalance, decimals)} MTK`);
    console.log(`Recipient: ${ethers.formatUnits(newRecipientBalance, decimals)} MTK`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
