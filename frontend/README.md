# MyToken dApp Frontend

A complete decentralized application (dApp) frontend for interacting with the MyToken ERC20 contract.

## Features

- ✅ **Wallet Connection**: Connect to MetaMask wallet
- ✅ **Balance Viewing**: View your current token balance
- ✅ **Token Transfer**: Send tokens to other addresses
- ✅ **Real-time Updates**: Balance updates automatically when transfers occur
- ✅ **Event Listening**: Listens to Transfer events for real-time updates
- ✅ **Error Handling**: Proper handling of rejected transactions and errors
- ✅ **Async/Await**: All blockchain interactions use proper async/await patterns

## Prerequisites

1. **MetaMask Extension**: Install [MetaMask](https://metamask.io/) in your browser
2. **Deployed Contract**: You need the MyToken contract deployed and its address
3. **Local Network**: Connect MetaMask to your local Hardhat network (or deploy to a testnet)

## Setup Instructions

### 1. Deploy the Contract

First, make sure your contract is deployed. If not, run:

```bash
# Start local Hardhat node (in one terminal)
npx hardhat node

# Deploy the contract (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address from the output.

### 2. Configure MetaMask

1. Open MetaMask
2. Add a network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
3. Import one of the Hardhat test accounts (check the Hardhat node output for private keys)

### 3. Start the Frontend

You can serve the frontend in several ways:

**Option 1: Python Simple Server**
```bash
cd frontend
python3 -m http.server 8000
```

**Option 2: Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
```

**Option 3: VS Code Live Server**
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

### 4. Open the dApp

Navigate to `http://localhost:8000` (or the port you chose) in your browser.

### 5. Connect Contract Address

When you first open the dApp, you'll be prompted to enter the contract address. Enter the address from step 1. This will be saved in your browser's localStorage for future visits.

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and approve the connection in MetaMask
2. **View Balance**: Your current token balance will be displayed automatically
3. **Transfer Tokens**:
   - Enter the recipient address (must be a valid Ethereum address)
   - Enter the amount you want to send
   - Click "Transfer Tokens"
   - Approve the transaction in MetaMask
4. **View Events**: Recent transfer events will appear in the "Recent Transfers" section

## Troubleshooting

### "MetaMask is not installed"
- Install MetaMask browser extension
- Refresh the page

### "Contract address is required"
- Make sure you deployed the contract and have the address
- Enter the contract address when prompted

### "Transaction rejected by user"
- You clicked "Reject" in MetaMask - try again and approve the transaction

### "Insufficient balance"
- Check your token balance
- Make sure you have enough tokens to send

### Balance not updating
- Wait a few seconds for the transaction to confirm
- Check that the event listener is working (look for events in the "Recent Transfers" section)

## Project Structure

```
frontend/
├── index.html      # Main HTML structure
├── styles.css      # Styling
├── app.js          # Main JavaScript logic (wallet, contract, events)
└── README.md       # This file
```

## Code Highlights

### Async/Await Usage
All blockchain interactions use `async/await`:
```javascript
const balance = await contract.balanceOf(userAddress);
const tx = await contract.transfer(recipient, amount);
await tx.wait();
```

### Event Listener
Transfer events are listened to for real-time updates:
```javascript
contract.on('Transfer', async (from, to, value, event) => {
    // Update balance and display event
});
```

### Error Handling
Comprehensive error handling for user rejections and transaction failures:
```javascript
try {
    const tx = await contract.transfer(...);
} catch (error) {
    if (error.code === 4001) {
        // User rejected transaction
    } else {
        // Other errors
    }
}
```

## License

MIT
