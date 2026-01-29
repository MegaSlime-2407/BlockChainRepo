const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const ERC721_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function tokenIdCounter() view returns (uint256)"
];

const FARM_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function claim()",
    "function lastClaimTime(address) view returns (uint256)",
    "function cooldownSeconds() view returns (uint256)",
    "function rewardPerClaim() view returns (uint256)"
];

const LENDING_POOL_ABI = [
    "function token() view returns (address)",
    "function totalDeposited() view returns (uint256)",
    "function deposits(address) view returns (uint256)",
    "function deposit(uint256 amount)",
    "function withdraw(uint256 amount)"
];

let CONTRACT_ADDRESS_ERC20 = '';
let CONTRACT_ADDRESS_ERC721 = '';
let CONTRACT_ADDRESS_FARM = '';
let CONTRACT_ADDRESS_LENDING = '';

let provider = null;
let signer = null;
let contractERC20 = null;
let contractERC721 = null;
let contractFarm = null;
let contractLendingPool = null;
let contractLendingToken = null;
let userAddress = null;
let eventListener = null;
let contractCheckedERC20 = false;
let contractCheckedERC721 = false;
let contractCheckedFarm = false;
let contractCheckedLending = false;
let farmingTabOpenedAt = 0;
let farmingInterval = null;

// DOM refs
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const walletAddressEl = document.getElementById('wallet-address');
const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
const tabErc20 = document.getElementById('tab-erc20');
const tabErc721 = document.getElementById('tab-erc721');
const tabFarming = document.getElementById('tab-farming');
const sectionErc20 = document.getElementById('section-erc20');
const sectionErc721 = document.getElementById('section-erc721');
const sectionFarming = document.getElementById('section-farming');
const farmerLockedEl = document.getElementById('farmer-locked');
const farmerPanelEl = document.getElementById('farmer-panel');
const farmBalanceEl = document.getElementById('farm-balance');
const farmRewardEl = document.getElementById('farm-reward');
const contractAddressFarmEl = document.getElementById('contract-address-farm');
const changeContractFarmBtn = document.getElementById('change-contract-farm-btn');
const farmSessionTimeEl = document.getElementById('farm-session-time');
const farmNextClaimEl = document.getElementById('farm-next-claim');
const farmClaimBtn = document.getElementById('farm-claim-btn');

// ERC-20
const tokenNameEl = document.getElementById('token-name');
const tokenSymbolEl = document.getElementById('token-symbol');
const balanceEl = document.getElementById('balance');
const balanceSymbolEl = document.getElementById('balance-symbol');
const contractAddressErc20El = document.getElementById('contract-address-erc20');
const changeContractErc20Btn = document.getElementById('change-contract-erc20-btn');
const transferForm = document.getElementById('transfer-form');
const transferBtn = document.getElementById('transfer-btn');
const recipientAddressInput = document.getElementById('recipient-address');
const transferAmountInput = document.getElementById('transfer-amount');
const txResultEl = document.getElementById('tx-result');
const transferEventsEl = document.getElementById('transfer-events');

// ERC-721
const nftNameEl = document.getElementById('nft-name');
const nftSymbolEl = document.getElementById('nft-symbol');
const nftBalanceEl = document.getElementById('nft-balance');
const contractAddressErc721El = document.getElementById('contract-address-erc721');
const changeContractErc721Btn = document.getElementById('change-contract-erc721-btn');
const nftOwnedListEl = document.getElementById('nft-owned-list');
const nftMintedListEl = document.getElementById('nft-minted-list');

const errorMessageEl = document.getElementById('error-message');
const successMessageEl = document.getElementById('success-message');

// Lending
const tabLending = document.getElementById('tab-lending');
const sectionLending = document.getElementById('section-lending');
const contractAddressLendingEl = document.getElementById('contract-address-lending');
const changeContractLendingBtn = document.getElementById('change-contract-lending-btn');
const lendingTokenSymbolEl = document.getElementById('lending-token-symbol');
const lendingTotalEl = document.getElementById('lending-total');
const lendingYourDepositEl = document.getElementById('lending-your-deposit');
const lendingWalletBalanceEl = document.getElementById('lending-wallet-balance');
const lendingDepositAmount = document.getElementById('lending-deposit-amount');
const lendingDepositBtn = document.getElementById('lending-deposit-btn');
const lendingWithdrawAmount = document.getElementById('lending-withdraw-amount');
const lendingWithdrawBtn = document.getElementById('lending-withdraw-btn');
const lendingTxResultEl = document.getElementById('lending-tx-result');

// --- Tabs ---
function setTab(name) {
    [tabErc20, tabErc721, tabFarming, tabLending].forEach(t => t.classList.remove('active'));
    [sectionErc20, sectionErc721, sectionFarming, sectionLending].forEach(s => s.classList.remove('active'));
    if (farmingInterval) { clearInterval(farmingInterval); farmingInterval = null; }
    if (name === 'erc20') {
        tabErc20.classList.add('active');
        sectionErc20.classList.add('active');
    } else if (name === 'erc721') {
        tabErc721.classList.add('active');
        sectionErc721.classList.add('active');
        if (contractERC721 && userAddress) refreshNftData();
    } else if (name === 'farming') {
        tabFarming.classList.add('active');
        sectionFarming.classList.add('active');
        farmingTabOpenedAt = Date.now();
        farmingInterval = setInterval(refreshFarmingUI, 1000);
        refreshFarmingUI();
    } else if (name === 'lending') {
        tabLending.classList.add('active');
        sectionLending.classList.add('active');
        refreshLendingUI();
    }
}
tabErc20.addEventListener('click', () => setTab('erc20'));
tabErc721.addEventListener('click', () => setTab('erc721'));
tabFarming.addEventListener('click', () => setTab('farming'));
tabLending.addEventListener('click', () => setTab('lending'));

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ethereum === 'undefined') {
        showError('MetaMask is not installed. Please install MetaMask to use this dApp.');
        return;
    }

    CONTRACT_ADDRESS_ERC20 = localStorage.getItem('contractAddress') || localStorage.getItem('contractAddressERC20') || '';
    CONTRACT_ADDRESS_ERC721 = localStorage.getItem('contractAddressERC721') || '';

    if (CONTRACT_ADDRESS_ERC20) {
        contractAddressErc20El.textContent = CONTRACT_ADDRESS_ERC20;
        localStorage.setItem('contractAddressERC20', CONTRACT_ADDRESS_ERC20);
    }
    if (CONTRACT_ADDRESS_ERC721) {
        contractAddressErc721El.textContent = CONTRACT_ADDRESS_ERC721;
    } else {
        contractAddressErc721El.textContent = 'Not set';
    }
    CONTRACT_ADDRESS_FARM = localStorage.getItem('contractAddressFarm') || '';
    if (CONTRACT_ADDRESS_FARM) contractAddressFarmEl.textContent = CONTRACT_ADDRESS_FARM;
    else contractAddressFarmEl.textContent = 'Not set';
    CONTRACT_ADDRESS_LENDING = localStorage.getItem('contractAddressLending') || '';
    contractAddressLendingEl.textContent = CONTRACT_ADDRESS_LENDING || 'Not set';

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        try {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainIdHex, 16);
            const isLocalhost = /localhost|127\.0\.0\.1/.test(window.location.hostname);
            if (chainIdNum !== 31337 && chainIdNum !== 1337 && !isLocalhost) {
                showError(`Switch MetaMask to Hardhat Local (chainId 31337). Current: ${chainIdNum}. Refresh after switching.`);
                return;
            }
        } catch (e) { console.warn('Network check failed:', e); }
        await connectWallet();
    }

    if (!CONTRACT_ADDRESS_ERC20) {
        const a = prompt('Enter GMT contract address:');
        if (a && ethers.isAddress(a)) {
            CONTRACT_ADDRESS_ERC20 = a;
            localStorage.setItem('contractAddressERC20', a);
            contractAddressErc20El.textContent = a;
            if (contractERC20) { resetConnection(); showSuccess('GMT contract updated. Reconnect if needed.'); }
        } else if (a) showError('Invalid address.');
    }

    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet);
    transferForm.addEventListener('submit', handleTransfer);
    changeContractErc20Btn.addEventListener('click', () => changeContract('erc20'));
    changeContractErc721Btn.addEventListener('click', () => changeContract('erc721'));
    changeContractFarmBtn.addEventListener('click', () => changeContract('farm'));
    changeContractLendingBtn.addEventListener('click', () => changeContract('lending'));
    farmClaimBtn.addEventListener('click', handleFarmClaim);
    lendingDepositBtn.addEventListener('click', handleLendingDeposit);
    lendingWithdrawBtn.addEventListener('click', handleLendingWithdraw);
});

function changeContract(type) {
    const labels = { erc20: 'GMT', erc721: 'NFT', farm: 'Farm', lending: 'Lending Pool' };
    const newAddress = (prompt(`Enter ${labels[type] || type} contract address:`) || '').trim();
    if (!newAddress) return;
    if (!ethers.isAddress(newAddress)) { showError('Invalid address.'); return; }
    if (type === 'erc20') {
        CONTRACT_ADDRESS_ERC20 = newAddress;
        localStorage.setItem('contractAddressERC20', newAddress);
        contractAddressErc20El.textContent = newAddress;
        contractCheckedERC20 = false;
        contractERC20 = null;
        if (userAddress) initErc20();
    } else if (type === 'erc721') {
        CONTRACT_ADDRESS_ERC721 = newAddress;
        localStorage.setItem('contractAddressERC721', newAddress);
        contractAddressErc721El.textContent = newAddress;
        contractCheckedERC721 = false;
        contractERC721 = null;
        if (userAddress) initErc721();
    } else if (type === 'farm') {
        CONTRACT_ADDRESS_FARM = newAddress;
        localStorage.setItem('contractAddressFarm', newAddress);
        contractAddressFarmEl.textContent = newAddress;
        contractCheckedFarm = false;
        contractFarm = null;
        if (userAddress) initFarm();
    } else if (type === 'lending') {
        CONTRACT_ADDRESS_LENDING = newAddress;
        localStorage.setItem('contractAddressLending', newAddress);
        contractAddressLendingEl.textContent = newAddress;
        contractCheckedLending = false;
        contractLendingPool = null;
        contractLendingToken = null;
        if (userAddress) initLendingPool();
    }
    showSuccess('Contract address updated.');
}

async function connectWallet() {
    try {
        hideMessages();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) throw new Error('No accounts. Unlock MetaMask.');

        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdNum = parseInt(chainIdHex, 16);
        if (chainIdNum !== 31337 && chainIdNum !== 1337) {
            try {
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7a69' }] });
                window.location.reload();
                return;
            } catch (e) {
                if (e.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{ chainId: '0x7a69', chainName: 'Hardhat Local', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['http://127.0.0.1:8545'] }]
                    });
                    window.location.reload();
                    return;
                }
                throw new Error('Switch MetaMask to Hardhat Local (RPC: http://127.0.0.1:8545, ChainId: 31337).');
            }
        }

        walletAddressEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        connectWalletBtn.style.display = 'none';
        disconnectWalletBtn.style.display = 'inline-block';

        if (CONTRACT_ADDRESS_ERC20) await initErc20();
        if (CONTRACT_ADDRESS_ERC721) await initErc721();
        if (CONTRACT_ADDRESS_FARM) await initFarm();
        if (CONTRACT_ADDRESS_LENDING) await initLendingPool();

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    } catch (e) { handleError(e); }
}

async function initErc20() {
    if (!provider || !CONTRACT_ADDRESS_ERC20) return;
    try {
        if (!contractCheckedERC20) {
            const code = await provider.getCode(CONTRACT_ADDRESS_ERC20);
            if (!code || code === '0x') throw new Error('No contract at ' + CONTRACT_ADDRESS_ERC20 + '. Deploy or fix address.');
            contractCheckedERC20 = true;
        }
        contractERC20 = new ethers.Contract(CONTRACT_ADDRESS_ERC20, ERC20_ABI, signer);

        const [name, symbol] = await Promise.all([contractERC20.name(), contractERC20.symbol()]);
        tokenNameEl.textContent = name;
        tokenSymbolEl.textContent = symbol;
        balanceSymbolEl.textContent = symbol;

        transferBtn.disabled = false;
        await updateBalanceERC20();
        setupTransferEventListener();
    } catch (e) { handleError(e); }
}

async function initErc721() {
    if (!provider || !CONTRACT_ADDRESS_ERC721) return;
    try {
        if (!contractCheckedERC721) {
            const code = await provider.getCode(CONTRACT_ADDRESS_ERC721);
            if (!code || code === '0x') throw new Error('No contract at ' + CONTRACT_ADDRESS_ERC721);
            contractCheckedERC721 = true;
        }
        contractERC721 = new ethers.Contract(CONTRACT_ADDRESS_ERC721, ERC721_ABI, signer);

        const [name, symbol] = await Promise.all([contractERC721.name(), contractERC721.symbol()]);
        nftNameEl.textContent = name;
        nftSymbolEl.textContent = symbol;

        await refreshNftData();
    } catch (e) { handleError(e); }
}

async function initFarm() {
    if (!provider || !CONTRACT_ADDRESS_FARM) return;
    try {
        if (!contractCheckedFarm) {
            const code = await provider.getCode(CONTRACT_ADDRESS_FARM);
            if (!code || code === '0x') throw new Error('No contract at ' + CONTRACT_ADDRESS_FARM);
            contractCheckedFarm = true;
        }
        contractFarm = new ethers.Contract(CONTRACT_ADDRESS_FARM, FARM_ABI, signer);
    } catch (e) { handleError(e); }
}

async function initLendingPool() {
    if (!provider || !signer || !CONTRACT_ADDRESS_LENDING) return;
    try {
        if (!contractCheckedLending) {
            const code = await provider.getCode(CONTRACT_ADDRESS_LENDING);
            if (!code || code === '0x') throw new Error('No contract at ' + CONTRACT_ADDRESS_LENDING);
            contractCheckedLending = true;
        }
        contractLendingPool = new ethers.Contract(CONTRACT_ADDRESS_LENDING, LENDING_POOL_ABI, signer);
        const tokenAddr = await contractLendingPool.token();
        contractLendingToken = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
        refreshLendingUI();
    } catch (e) { handleError(e); }
}

async function refreshLendingUI() {
    if (!userAddress) return;
    if (!contractLendingPool || !contractLendingToken) {
        lendingTokenSymbolEl.textContent = '—';
        lendingTotalEl.textContent = '—';
        lendingYourDepositEl.textContent = '—';
        lendingWalletBalanceEl.textContent = '—';
        lendingDepositBtn.disabled = lendingWithdrawBtn.disabled = true;
        return;
    }
    try {
        const [total, yourDep, bal, symbol, dec] = await Promise.all([
            contractLendingPool.totalDeposited(),
            contractLendingPool.deposits(userAddress),
            contractLendingToken.balanceOf(userAddress),
            contractLendingToken.symbol(),
            contractLendingToken.decimals()
        ]);
        const fmt = (v) => parseFloat(ethers.formatUnits(v, dec)).toFixed(4);
        lendingTokenSymbolEl.textContent = symbol;
        lendingTotalEl.textContent = fmt(total) + ' ' + symbol;
        lendingYourDepositEl.textContent = fmt(yourDep) + ' ' + symbol;
        lendingWalletBalanceEl.textContent = fmt(bal) + ' ' + symbol;
        lendingDepositBtn.disabled = false;
        lendingWithdrawBtn.disabled = yourDep === 0n;
    } catch (_) {
        lendingTokenSymbolEl.textContent = '—';
        lendingTotalEl.textContent = '—';
        lendingYourDepositEl.textContent = '—';
        lendingWalletBalanceEl.textContent = '—';
        lendingDepositBtn.disabled = lendingWithdrawBtn.disabled = true;
    }
}

async function handleLendingDeposit() {
    if (!contractLendingPool || !contractLendingToken) return;
    const raw = lendingDepositAmount.value.trim();
    if (!raw || isNaN(parseFloat(raw)) || parseFloat(raw) <= 0) { showError('Enter a valid amount.'); return; }
    try {
        hideMessages();
        const dec = await contractLendingToken.decimals();
        const amount = ethers.parseUnits(raw, dec);
        const balance = await contractLendingToken.balanceOf(userAddress);
        if (balance < amount) { showError('Insufficient balance.'); return; }
        lendingDepositBtn.disabled = true;
        lendingDepositBtn.textContent = 'Approve...';
        const poolAddr = contractLendingPool.target;
        if ((await contractLendingToken.allowance(userAddress, poolAddr)) < amount) {
            await (await contractLendingToken.approve(poolAddr, amount)).wait();
        }
        lendingDepositBtn.textContent = 'Depositing...';
        const tx = await contractLendingPool.deposit(amount);
        await tx.wait();
        showSuccess('Deposited. Tx: ' + tx.hash);
        lendingTxResultEl.textContent = 'Deposit tx: ' + tx.hash;
        lendingDepositAmount.value = '';
        await refreshLendingUI();
    } catch (e) { handleError(e); } finally { lendingDepositBtn.disabled = false; lendingDepositBtn.textContent = 'Deposit'; }
}

async function handleLendingWithdraw() {
    if (!contractLendingPool || !contractLendingToken) return;
    const raw = lendingWithdrawAmount.value.trim();
    if (!raw || isNaN(parseFloat(raw)) || parseFloat(raw) <= 0) { showError('Enter a valid amount.'); return; }
    try {
        hideMessages();
        const dec = await contractLendingToken.decimals();
        const amount = ethers.parseUnits(raw, dec);
        const yourDep = await contractLendingPool.deposits(userAddress);
        if (yourDep < amount) { showError('Not enough deposited.'); return; }
        lendingWithdrawBtn.disabled = true;
        lendingWithdrawBtn.textContent = 'Withdrawing...';
        const tx = await contractLendingPool.withdraw(amount);
        await tx.wait();
        showSuccess('Withdrawn. Tx: ' + tx.hash);
        lendingTxResultEl.textContent = 'Withdraw tx: ' + tx.hash;
        lendingWithdrawAmount.value = '';
        await refreshLendingUI();
    } catch (e) { handleError(e); } finally { lendingWithdrawBtn.disabled = false; lendingWithdrawBtn.textContent = 'Withdraw'; }
}

async function refreshFarmingUI() {
    farmerLockedEl.style.display = 'none';
    farmerPanelEl.style.display = 'none';
    if (!userAddress) return;
    let gmtBalance = 0n;
    if (contractERC20) {
        try { gmtBalance = await contractERC20.balanceOf(userAddress); } catch (_) {}
    }
    const minGmt = ethers.parseUnits('1', 18);
    if (gmtBalance < minGmt) {
        farmerLockedEl.style.display = 'block';
        return;
    }
    farmerPanelEl.style.display = 'block';
    const nowSec = Math.floor(Date.now() / 1000);
    const sessionElapsed = Math.floor((Date.now() - farmingTabOpenedAt) / 1000);
    farmSessionTimeEl.textContent = Math.min(sessionElapsed, 120);
    if (!contractFarm) {
        farmNextClaimEl.textContent = 'Set Farm contract';
        farmClaimBtn.disabled = true;
        return;
    }
    farmSessionTimeEl.textContent = Math.min(sessionElapsed, 120);
    const sessionOk = sessionElapsed >= 120;
    let lastClaim = 0n, cooldown = 300n, reward = 10n;
    try {
        [lastClaim, cooldown, reward] = await Promise.all([
            contractFarm.lastClaimTime(userAddress),
            contractFarm.cooldownSeconds(),
            contractFarm.rewardPerClaim()
        ]);
    } catch (_) {}
    farmRewardEl.textContent = Number(ethers.formatUnits(reward, 18));
    let farmBal = 0n;
    try { farmBal = await contractFarm.balanceOf(userAddress); } catch (_) {}
    farmBalanceEl.textContent = parseFloat(ethers.formatUnits(farmBal, 18)).toFixed(4);
    const nextAt = lastClaim === 0n ? 0 : Number(lastClaim) + Number(cooldown);
    const nextIn = nextAt === 0 ? 0 : Math.max(0, nextAt - nowSec);
    farmNextClaimEl.textContent = nextIn > 0 ? nextIn + 's' : 'Ready';
    farmClaimBtn.disabled = !(sessionOk && nextIn === 0);
}

async function handleFarmClaim() {
    if (!contractFarm || !userAddress) return;
    try {
        hideMessages();
        farmClaimBtn.disabled = true;
        farmClaimBtn.textContent = 'Claiming...';
        const tx = await contractFarm.claim();
        await tx.wait();
        showSuccess('Claimed FARM! Tx: ' + tx.hash);
        refreshFarmingUI();
    } catch (e) { handleError(e); } finally {
        farmClaimBtn.disabled = false;
        farmClaimBtn.textContent = 'Claim FARM';
    }
}

async function refreshNftData() {
    if (!contractERC721 || !userAddress) return;
    try {
        const [balance, total] = await Promise.all([contractERC721.balanceOf(userAddress), contractERC721.tokenIdCounter()]);
        nftBalanceEl.textContent = balance.toString();

        // Your NFTs: find tokenIds owned by user
        const owned = [];
        const n = Number(total);
        for (let i = 0; i < n; i++) {
            try {
                const owner = await contractERC721.ownerOf(i);
                if (owner.toLowerCase() === userAddress.toLowerCase()) owned.push(i);
            } catch (_) {}
        }

        // Render owned with metadata
        if (owned.length === 0) {
            nftOwnedListEl.innerHTML = '<p class="no-events">you don\'t have any from this collection</p>';
        } else {
            nftOwnedListEl.innerHTML = '';
            for (const id of owned) {
                const card = await buildNftCard(id, true);
                if (card) nftOwnedListEl.appendChild(card);
            }
        }

        // All minted tokens
        if (n === 0) {
            nftMintedListEl.innerHTML = '<p class="no-events">none minted yet</p>';
        } else {
            nftMintedListEl.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const card = await buildNftCard(i, true);
                if (card) nftMintedListEl.appendChild(card);
            }
        }
    } catch (e) {
        nftMintedListEl.innerHTML = '<p class="no-events">error: ' + (e.message || 'unknown') + '</p>';
    }
}

function resolveUri(uri) {
    if (typeof uri !== 'string') return null;
    if (uri.startsWith('ipfs://')) return 'https://ipfs.io/ipfs/' + uri.slice(7);
    return uri;
}

function isImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url) || /i\.imgur\.com|imgur\.com\/.+\.(jpe?g|png|gif|webp)/i.test(url);
}

async function fetchMetadata(uri) {
    const url = resolveUri(uri);
    if (!url) return null;
    try {
        let r = await fetch(url);
        if (!r.ok) {
            r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
            if (!r.ok) return null;
        }
        const json = await r.json();
        return json && typeof json === 'object' ? json : null;
    } catch (_) {
        try {
            const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
            if (!r.ok) return null;
            const json = await r.json();
            return json && typeof json === 'object' ? json : null;
        } catch (_) { return null; }
    }
}

async function buildNftCard(tokenId, includeImage) {
    let owner = '-';
    let uri = '';
    try {
        [owner, uri] = await Promise.all([contractERC721.ownerOf(tokenId), contractERC721.tokenURI(tokenId)]);
    } catch (_) { return null; }
    const meta = await fetchMetadata(uri);
    let imgSrc = (meta && (meta.image || meta.image_url)) ? (resolveUri(meta.image || meta.image_url) || meta.image || meta.image_url) : null;
    if (!imgSrc && isImageUrl(uri)) imgSrc = resolveUri(uri) || uri;

    const card = document.createElement('div');
    card.className = 'nft-card';
    const shortOwner = owner.slice(0, 6) + '...' + owner.slice(-4);
    const isYou = owner.toLowerCase() === userAddress?.toLowerCase();
    let img = '';
    if (includeImage && imgSrc) {
        img = `<img src="${imgSrc}" alt="" class="nft-img" referrerpolicy="no-referrer" onerror="this.style.display='none'">`;
    }
    card.innerHTML = `
        <div class="nft-card-inner">
            ${img}
            <p><strong>Token #${tokenId}</strong></p>
            <p><strong>Owner:</strong> ${shortOwner} ${isYou ? '<span class="you-badge">You</span>' : ''}</p>
            <p><strong>Metadata:</strong> ${meta ? (meta.name || '-') + (meta.description ? ' — ' + (String(meta.description).length > 80 ? String(meta.description).slice(0, 80) + '…' : meta.description) : '') : uri || '-'}</p>
        </div>
    `;
    return card;
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) { resetConnection(); return; }
    const newAddr = accounts[0];
    if (newAddr.toLowerCase() !== userAddress?.toLowerCase()) {
        userAddress = newAddr;
        if (provider) {
            signer = await provider.getSigner();
            if (CONTRACT_ADDRESS_ERC20) contractERC20 = new ethers.Contract(CONTRACT_ADDRESS_ERC20, ERC20_ABI, signer);
            if (CONTRACT_ADDRESS_ERC721) contractERC721 = new ethers.Contract(CONTRACT_ADDRESS_ERC721, ERC721_ABI, signer);
            if (CONTRACT_ADDRESS_FARM) await initFarm();
            if (CONTRACT_ADDRESS_LENDING) await initLendingPool();
            if (contractERC20) await updateBalanceERC20();
            if (contractERC721) await refreshNftData();
        }
        walletAddressEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    }
}

function disconnectWallet() {
    if (window.ethereum?.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
    }
    resetConnection();
    showSuccess('Wallet disconnected.');
    setTimeout(hideMessages, 2000);
}

function resetConnection() {
    userAddress = null;
    signer = null;
    contractERC20 = null;
    contractERC721 = null;
    contractFarm = null;
    contractLendingPool = null;
    contractLendingToken = null;
    contractCheckedERC20 = false;
    contractCheckedERC721 = false;
    contractCheckedFarm = false;
    contractCheckedLending = false;
    if (farmingInterval) { clearInterval(farmingInterval); farmingInterval = null; }
    farmerLockedEl.style.display = 'none';
    farmerPanelEl.style.display = 'none';
    walletAddressEl.textContent = 'Not Connected';
    connectWalletBtn.style.display = 'inline-block';
    disconnectWalletBtn.style.display = 'none';
    transferBtn.disabled = true;
    balanceEl.textContent = '0.00';
    tokenNameEl.textContent = '-';
    tokenSymbolEl.textContent = '-';
    balanceSymbolEl.textContent = '-';
    nftNameEl.textContent = '-';
    nftSymbolEl.textContent = '-';
    nftBalanceEl.textContent = '0';
    nftOwnedListEl.innerHTML = '<p class="no-events">connect wallet + set NFT contract</p>';
    nftMintedListEl.innerHTML = '<p class="no-events">connect + set contract</p>';
    if (eventListener) { eventListener.removeAllListeners(); eventListener = null; }
}

async function updateBalanceERC20() {
    if (!contractERC20 || !userAddress) return;
    try {
        const [balance, decimals] = await Promise.all([contractERC20.balanceOf(userAddress), contractERC20.decimals()]);
        balanceEl.textContent = parseFloat(ethers.formatUnits(balance, decimals)).toFixed(6);
    } catch (e) { console.warn('Balance update failed:', e); }
}

function setupTransferEventListener() {
    if (!contractERC20 || eventListener) return;
    if (eventListener) eventListener.removeAllListeners();
    eventListener = contractERC20.on('Transfer', async (from, to, value, ev) => {
        try {
            const dec = await contractERC20.decimals();
            addTransferEvent({ from, to, value: ethers.formatUnits(value, dec), blockNumber: ev.log.blockNumber });
            if ([from, to].some(a => a.toLowerCase() === userAddress?.toLowerCase())) await updateBalanceERC20();
        } catch (_) {}
    });
}

function addTransferEvent(e) {
    const no = transferEventsEl.querySelector('.no-events');
    if (no) no.remove();
    const div = document.createElement('div');
    div.className = 'event-item';
    div.innerHTML = `
        <p><span class="event-from">From:</span> ${e.from.slice(0,6)}...${e.from.slice(-4)}</p>
        <p><span class="event-to">To:</span> ${e.to.slice(0,6)}...${e.to.slice(-4)}</p>
        <p><span class="event-amount">Amount:</span> ${parseFloat(e.value).toFixed(6)} GMT</p>
    `;
    transferEventsEl.insertBefore(div, transferEventsEl.firstChild);
    while (transferEventsEl.children.length > 10) transferEventsEl.removeChild(transferEventsEl.lastChild);
}

function setTxResult(hash, blockNumber) {
    const no = txResultEl.querySelector('.no-events');
    if (no) no.remove();
    txResultEl.innerHTML = `
        <p><strong>Transaction hash:</strong><br><code class="tx-hash">${hash}</code></p>
        <p><strong>Block:</strong> ${blockNumber != null ? blockNumber : '-'}</p>
    `;
}

async function handleTransfer(e) {
    e.preventDefault();
    try {
        hideMessages();
        if (!contractERC20 || !userAddress) throw new Error('Connect your wallet first.');
        const recipient = recipientAddressInput.value.trim();
        const amount = transferAmountInput.value.trim();
        if (!ethers.isAddress(recipient)) throw new Error('Invalid recipient address.');
        if (!amount || parseFloat(amount) <= 0) throw new Error('Enter a valid amount.');

        transferBtn.disabled = true;
        transferBtn.textContent = 'Processing...';
        const decimals = await contractERC20.decimals();
        const amountWei = ethers.parseUnits(amount, decimals);
        const balance = await contractERC20.balanceOf(userAddress);
        if (balance < amountWei) throw new Error('Insufficient balance.');

        const tx = await contractERC20.transfer(recipient, amountWei);
        showSuccess('Transaction sent. Hash: ' + tx.hash);
        const receipt = await tx.wait();
        setTxResult(tx.hash, receipt.blockNumber);
        showSuccess('Transfer confirmed in block ' + receipt.blockNumber);
        await updateBalanceERC20();
        recipientAddressInput.value = '';
        transferAmountInput.value = '';
        setTimeout(hideMessages, 5000);
    } catch (err) { handleError(err); } finally { transferBtn.disabled = false; transferBtn.textContent = 'Send'; }
}

function handleError(err) {
    let msg = 'An error occurred.';
    if (err.code === 4001) msg = 'Transaction rejected by user.';
    else if (err.message) msg = err.message;
    else if (err.reason) msg = err.reason;
    showError(msg);
}

function showError(m) { errorMessageEl.textContent = m; errorMessageEl.style.display = 'block'; successMessageEl.style.display = 'none'; setTimeout(hideMessages, 10000); }
function showSuccess(m) { successMessageEl.textContent = m; successMessageEl.style.display = 'block'; errorMessageEl.style.display = 'none'; }
function hideMessages() { errorMessageEl.style.display = 'none'; successMessageEl.style.display = 'none'; }
