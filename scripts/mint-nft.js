require('dotenv').config();
const { ethers } = require("hardhat");

// Usage:
//   npx hardhat run scripts/mint-nft.js --network localhost
//   NFT_ADDRESS=0x... RECIPIENT=0x... URI="https://..." npx hardhat run scripts/mint-nft.js --network localhost
//
// If RECIPIENT is omitted, mints to the deployer (you).
// If URI is omitted, uses a placeholder.

async function main() {
    const nftAddress = process.env.NFT_ADDRESS;
    if (!nftAddress) {
        console.error("Set NFT_ADDRESS (your MyNFT contract address). Example:");
        console.error('  NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 npx hardhat run scripts/mint-nft.js --network localhost');
        process.exitCode = 1;
        return;
    }

    const [signer] = await ethers.getSigners();
    const recipient = process.env.RECIPIENT || signer.address;
    const uri = process.env.URI || "https://example.com/metadata/1.json";

    const nft = await ethers.getContractAt("MyNFT", nftAddress);
    const tx = await nft.mint(recipient, uri);
    await tx.wait();
    const newId = await nft.tokenIdCounter();

    console.log("Mint successful.");
    console.log("  Recipient:", recipient);
    console.log("  Token ID:", Number(newId) - 1);
    console.log("  URI:", uri);
    console.log("  Tx:", tx.hash);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
