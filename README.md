# My Blockchain Project

This is my project for the blockchain course
## How to run

```bash
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy-lending.js --network localhost
```
## Re-entrancy exploit
```bash
npx hardhat run scripts/Attack.js          # exploits the vulnerable one
FIXED=1 npx hardhat run scripts/Attack.js  # run against fixed (doesn't drain)
```
