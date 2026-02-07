// Shared utilities for all pages

let provider;
let signer;

// RewardToken (GMAT) contract – set via prompt on first load or localStorage
let REWARD_TOKEN_ADDRESS = localStorage.getItem("rewardTokenAddress") || "";

const REWARD_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function pricePerToken() view returns (uint256)",
  "function buyTokens() payable"
];

// Sepolia = 11155111, Localhost = 31337
const ALLOWED_CHAIN_IDS = [11155111, 31337, 1337];

async function isValidRewardToken(address) {
  if (!provider || !ethers.isAddress(address)) return false;
  const code = await provider.getCode(address);
  if (!code || code === "0x") return false;
  try {
    const token = new ethers.Contract(address, REWARD_TOKEN_ABI, provider);
    await token.decimals();
    return true;
  } catch {
    return false;
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not installed");
    return false;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (!ALLOWED_CHAIN_IDS.includes(chainId)) {
    alert("Please switch to Sepolia Testnet or Hardhat Local (chainId 31337)");
    return false;
  }

  if (!REWARD_TOKEN_ADDRESS || !ethers.isAddress(REWARD_TOKEN_ADDRESS)) {
    const addr = prompt("Enter RewardToken (GMAT) contract address:");
    if (addr && ethers.isAddress(addr)) {
      REWARD_TOKEN_ADDRESS = addr;
      localStorage.setItem("rewardTokenAddress", addr);
    } else {
      return false;
    }
  }

  const ok = await isValidRewardToken(REWARD_TOKEN_ADDRESS);
  if (!ok) {
    alert("Invalid RewardToken address. Redeploy and enter the new address.");
    localStorage.removeItem("rewardTokenAddress");
    REWARD_TOKEN_ADDRESS = "";
    return false;
  }

  return true;
}

async function getBalances() {
  if (!signer || !REWARD_TOKEN_ADDRESS) return null;

  const address = await signer.getAddress();
  const eth = await provider.getBalance(address);

  try {
    const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, provider);
    const [bal, dec, price] = await Promise.all([
      token.balanceOf(address),
      token.decimals(),
      token.pricePerToken()
    ]);

    return {
      address,
      eth,
      tokenBalance: bal,
      decimals: dec,
      price
    };
  } catch (e) {
    return { address, eth, error: e.message };
  }
}

function getStatusElement() {
  return document.getElementById("txStatus");
}
