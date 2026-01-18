const ERC20_ABI = [
    "function name() public view returns (string)",
    "function symbol() public view returns (string)",
    "function decimals() public view returns (uint8)",
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let CONTRACT_ADDRESS = '';

let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let eventListener = null;
let contractChecked = false;

const connectWalletBtn = document.getElementById('connect-wallet-btn');
const walletAddressEl = document.getElementById('wallet-address');
const accountAddressEl = document.getElementById('account-address');
const contractAddressEl = document.getElementById('contract-address');
const balanceEl = document.getElementById('balance');
const transferForm = document.getElementById('transfer-form');
const transferBtn = document.getElementById('transfer-btn');
const recipientAddressInput = document.getElementById('recipient-address');
const transferAmountInput = document.getElementById('transfer-amount');
const transferEventsEl = document.getElementById('transfer-events');
const errorMessageEl = document.getElementById('error-message');
const successMessageEl = document.getElementById('success-message');
const changeContractBtn = document.getElementById('change-contract-btn');
const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
const switchAccountBtn = document.getElementById('switch-account-btn');

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ethereum === 'undefined') {
        showError('MetaMask is not installed. Please install MetaMask to use this dApp.');
        return;
    }

    const savedAddress = localStorage.getItem('contractAddress');
    if (savedAddress) {
        CONTRACT_ADDRESS = savedAddress;
        contractAddressEl.textContent = CONTRACT_ADDRESS;
    } else {
        const address = prompt('Please enter the MyToken contract address:');
        if (address) {
            CONTRACT_ADDRESS = address;
            localStorage.setItem('contractAddress', address);
            contractAddressEl.textContent = CONTRACT_ADDRESS;
        } else {
            showError('Contract address is required. Please refresh and enter the address.');
            return;
        }
    }

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        try {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainIdHex, 16);
            console.log('Initial network check - chainId (from eth_chainId):', chainIdNum);
            
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (chainIdNum !== 31337 && chainIdNum !== 1337) {
                if (!isLocalhost) {
                    showError(`Please switch MetaMask to Hardhat Local network. Current chainId: ${chainIdNum}, Expected: 31337 or 1337. Refresh the page after switching.`);
                    return;
                } else {
                    console.warn('ChainId check: allowing localhost connection despite chainId mismatch');
                }
            }
        } catch (error) {
            console.warn('Network check failed:', error);
        }
        await connectWallet();
    }

    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet);
    switchAccountBtn.addEventListener('click', switchAccount);
    transferForm.addEventListener('submit', handleTransfer);
    changeContractBtn.addEventListener('click', changeContractAddress);
});

function changeContractAddress() {
    const newAddress = prompt('Enter the new MyToken contract address:');
    if (newAddress && ethers.isAddress(newAddress)) {
        CONTRACT_ADDRESS = newAddress;
        localStorage.setItem('contractAddress', newAddress);
        contractAddressEl.textContent = CONTRACT_ADDRESS;
        if (contract) {
            resetConnection();
            showSuccess('Contract address updated. Please reconnect your wallet.');
        }
    } else if (newAddress) {
        showError('Invalid address format. Please enter a valid Ethereum address.');
    }
}

async function connectWallet() {
    try {
        hideMessages();
        
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask.');
        }

        userAddress = accounts[0];
        
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdNum = parseInt(chainIdHex, 16);
        console.log('Current network chainId (from eth_chainId):', chainIdNum);
        console.log('Expected chainId: 31337 or 1337');
        
        if (chainIdNum !== 31337 && chainIdNum !== 1337) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x7a69' }],
                });
                console.log('Successfully switched to Hardhat network');
                window.location.reload();
                return;
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x7a69',
                                chainName: 'Hardhat Local',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['http://127.0.0.1:8545'],
                            }],
                        });
                        console.log('Added Hardhat network, switching...');
                        window.location.reload();
                        return;
                    } catch (addError) {
                        throw new Error(`Failed to add Hardhat network. Please add it manually in MetaMask:\nNetwork Name: Hardhat Local\nRPC URL: http://127.0.0.1:8545\nChain ID: 31337\nCurrency: ETH`);
                    }
                } else {
                    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    if (!isLocalhost) {
                        throw new Error(`Wrong network. Current chainId: ${chainIdNum}, Expected: 31337 or 1337. Please switch MetaMask to Localhost 8545 (Hardhat).`);
                    } else {
                        console.warn('ChainId mismatch but on localhost - allowing connection (MetaMask configuration issue)');
                    }
                }
            }
        }

        walletAddressEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        accountAddressEl.textContent = userAddress;
        connectWalletBtn.style.display = 'none';
        disconnectWalletBtn.style.display = 'inline-block';
        switchAccountBtn.style.display = 'inline-block';

        if (!contractChecked) {
            const currentChainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
            console.log('Checking contract - ChainId:', currentChainId);
            console.log('Contract address:', CONTRACT_ADDRESS);
            
            const code = await provider.getCode(CONTRACT_ADDRESS);
            console.log('Contract code result:', code ? (code === '0x' ? 'EMPTY (0x)' : `FOUND (${code.slice(0, 20)}...)`) : 'null');
            
            if (!code || code === '0x') {
                if (currentChainId === 1) {
                    throw new Error('MetaMask is connected to Ethereum Mainnet (ChainId: 1), not Hardhat Local. Please switch to "Hardhat Local" network in MetaMask (RPC: http://127.0.0.1:8545, ChainId: 31337) and refresh the page.');
                }
                throw new Error('No contract found at address ' + CONTRACT_ADDRESS + ' on chainId ' + currentChainId + '. Please make sure:\n1. The contract is deployed\n2. You\'re using the correct contract address\n3. Hardhat node is running (if using localhost)\n4. MetaMask is connected to the correct network');
            }
            contractChecked = true;
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, signer);

        transferBtn.disabled = false;
        console.log('Transfer button enabled');

        try {
            await updateBalance();
        } catch (balanceError) {
            console.warn('Balance update failed, but button remains enabled:', balanceError);
        }

        setupTransferEventListener();

        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', reloadPage);

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', reloadPage);

    } catch (error) {
        handleError(error);
    }
}

function reloadPage() {
    window.location.reload();
}

async function switchAccount() {
    try {
        hideMessages();
        
        const accounts = await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });
        
        const selectedAccounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (selectedAccounts.length > 0 && selectedAccounts[0].toLowerCase() !== userAddress.toLowerCase()) {
            userAddress = selectedAccounts[0];
            signer = await provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, signer);
            walletAddressEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            accountAddressEl.textContent = userAddress;
            transferBtn.disabled = false;
            await updateBalance();
            setupTransferEventListener();
            showSuccess('Account switched successfully!');
        }
    } catch (error) {
        if (error.code !== 4001) {
            handleError(error);
        }
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        resetConnection();
    } else {
        const newAddress = accounts[0];
        if (newAddress.toLowerCase() !== userAddress?.toLowerCase()) {
            userAddress = newAddress;
            if (provider) {
                signer = await provider.getSigner();
                contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, signer);
                walletAddressEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
                accountAddressEl.textContent = userAddress;
                transferBtn.disabled = false;
                await updateBalance();
                setupTransferEventListener();
                showSuccess('Account switched!');
                setTimeout(() => hideMessages(), 3000);
            }
        }
    }
}

function disconnectWallet() {
    if (window.ethereum && window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
    }
    
    resetConnection();
    hideMessages();
    showSuccess('Wallet disconnected successfully.');
    
    setTimeout(() => {
        hideMessages();
    }, 3000);
}

function resetConnection() {
    userAddress = null;
    signer = null;
    contract = null;
    contractChecked = false;
    walletAddressEl.textContent = 'Not Connected';
    accountAddressEl.textContent = '-';
    connectWalletBtn.style.display = 'inline-block';
    disconnectWalletBtn.style.display = 'none';
    switchAccountBtn.style.display = 'none';
    transferBtn.disabled = true;
    balanceEl.textContent = '0.00';
    
    if (eventListener) {
        eventListener.removeAllListeners();
        eventListener = null;
    }
}

async function updateBalance() {
    try {
        if (!contract || !userAddress) {
            console.warn('Cannot update balance: contract or userAddress is null');
            return;
        }

        console.log('Updating balance for:', userAddress);
        console.log('Contract address:', CONTRACT_ADDRESS);

        const balance = await contract.balanceOf(userAddress);
        const decimals = await contract.decimals();
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        console.log('Raw balance:', balance.toString());
        console.log('Formatted balance:', formattedBalance, 'MTK');
        
        balanceEl.textContent = parseFloat(formattedBalance).toFixed(6);
    } catch (error) {
        console.error('Error updating balance:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            reason: error.reason
        });
        if (error.message && !error.message.includes('balance') && error.code !== -32000) {
            handleError(error);
        }
    }
}

function setupTransferEventListener() {
    if (!contract || eventListener) {
        return;
    }

    if (eventListener) {
        eventListener.removeAllListeners();
    }

    eventListener = contract.on('Transfer', async (from, to, value, event) => {
        try {
            const decimals = await contract.decimals();
            const formattedValue = ethers.formatUnits(value, decimals);
            
            addTransferEvent({
                from: from,
                to: to,
                value: formattedValue,
                blockNumber: event.log.blockNumber
            });

            if (from.toLowerCase() === userAddress.toLowerCase() || 
                to.toLowerCase() === userAddress.toLowerCase()) {
                await updateBalance();
            }
        } catch (error) {
            console.error('Error handling Transfer event:', error);
        }
    });
}

function addTransferEvent(event) {
    const noEvents = transferEventsEl.querySelector('.no-events');
    if (noEvents) {
        noEvents.remove();
    }

    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    
    const from = event.from.slice(0, 6) + '...' + event.from.slice(-4);
    const to = event.to.slice(0, 6) + '...' + event.to.slice(-4);
    
    eventItem.innerHTML = `
        <p><span class="event-from">From:</span> ${from}</p>
        <p><span class="event-to">To:</span> ${to}</p>
        <p><span class="event-amount">Amount:</span> ${parseFloat(event.value).toFixed(6)} MTK</p>
    `;

    transferEventsEl.insertBefore(eventItem, transferEventsEl.firstChild);

    while (transferEventsEl.children.length > 10) {
        transferEventsEl.removeChild(transferEventsEl.lastChild);
    }
}

async function handleTransfer(event) {
    event.preventDefault();
    
    console.log('Transfer form submitted');
    
    try {
        hideMessages();
        
        if (!contract || !userAddress) {
            throw new Error('Please connect your wallet first.');
        }
        
        console.log('Contract and user address OK');

        const recipient = recipientAddressInput.value.trim();
        const amount = transferAmountInput.value.trim();

        if (!ethers.isAddress(recipient)) {
            throw new Error('Invalid recipient address.');
        }

        if (!amount || parseFloat(amount) <= 0) {
            throw new Error('Please enter a valid amount.');
        }

        transferBtn.disabled = true;
        transferBtn.textContent = 'Processing...';
        
        const decimals = await contract.decimals();
        const amountWei = ethers.parseUnits(amount, decimals);

        const balance = await contract.balanceOf(userAddress);
        if (balance < amountWei) {
            throw new Error('Insufficient balance.');
        }

        const tx = await contract.transfer(recipient, amountWei);
        
        showSuccess(`Transaction sent! Waiting for confirmation... (Tx: ${tx.hash})`);

        const receipt = await tx.wait();
        
        showSuccess(`Transfer successful! Transaction confirmed in block ${receipt.blockNumber}`);
        
        await updateBalance();

        recipientAddressInput.value = '';
        transferAmountInput.value = '';

        setTimeout(() => {
            hideMessages();
        }, 5000);

    } catch (error) {
        handleError(error);
    } finally {
        transferBtn.disabled = false;
        transferBtn.textContent = 'Transfer Tokens';
    }
}

function handleError(error) {
    console.error('Error:', error);
    
    let errorMessage = 'An error occurred.';
    
    if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user.';
    } else if (error.code === 'CALL_EXCEPTION' || error.code === -32000) {
        if (error.message && error.message.includes('revert data')) {
            errorMessage = 'Cannot connect to contract. Please verify:\n1. The contract address is correct\n2. The contract is deployed\n3. Hardhat node is running (if using localhost)\n4. MetaMask is connected to the correct network';
        } else if (error.message) {
            errorMessage = error.message;
        } else {
            errorMessage = 'Contract call failed. The contract may not be deployed at this address or the network is not available.';
        }
    } else if (error.code === -32603) {
        errorMessage = 'Transaction failed. Please check your balance and try again.';
    } else if (error.message) {
        errorMessage = error.message;
    } else if (error.reason) {
        errorMessage = error.reason;
    }
    
    showError(errorMessage);
}

function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
    successMessageEl.style.display = 'none';
    
    setTimeout(() => {
        hideMessages();
    }, 10000);
}

function showSuccess(message) {
    successMessageEl.textContent = message;
    successMessageEl.style.display = 'block';
    errorMessageEl.style.display = 'none';
}

function hideMessages() {
    errorMessageEl.style.display = 'none';
    successMessageEl.style.display = 'none';
}
