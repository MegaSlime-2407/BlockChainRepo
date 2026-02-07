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

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("buyGameTokensBtn").onclick = buyGameTokens;
document.getElementById("createCampaignBtn").onclick = createCampaign;

// Individual game play buttons are handled below

// Game access: play game buttons
document.querySelectorAll(".play-game-btn").forEach(btn => {
  btn.onclick = () => playGame(btn.dataset.game, parseInt(btn.dataset.requiredGmat));
});

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not installed");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const address = await signer.getAddress();
  document.getElementById("walletAddress").innerText = address;

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  document.getElementById("network").innerText = network.name + " (" + chainId + ")";

  if (!ALLOWED_CHAIN_IDS.includes(chainId)) {
    alert("Please switch to Sepolia Testnet or Hardhat Local (chainId 31337)");
    return;
  }

  if (!REWARD_TOKEN_ADDRESS || !ethers.isAddress(REWARD_TOKEN_ADDRESS)) {
    const addr = prompt("Enter RewardToken (GMAT) contract address:");
    if (addr && ethers.isAddress(addr)) {
      REWARD_TOKEN_ADDRESS = addr;
      localStorage.setItem("rewardTokenAddress", addr);
    }
  }

  await updateBalances();
  document.getElementById("buyGameTokensBtn").disabled = !REWARD_TOKEN_ADDRESS;
}

async function updateBalances() {
  if (!signer || !REWARD_TOKEN_ADDRESS) return;

  const address = await signer.getAddress();

  const eth = await provider.getBalance(address);
  document.getElementById("ethBalance").innerText = ethers.formatEther(eth);

  try {
    const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, provider);
    const [bal, dec, price] = await Promise.all([
      token.balanceOf(address),
      token.decimals(),
      token.pricePerToken()
    ]);
    const balanceFormatted = ethers.formatUnits(bal, dec);
    document.getElementById("tokenBalance").innerText = balanceFormatted;
    document.getElementById("gameTokenPrice").innerText = ethers.formatEther(price);

    // Check access for each game based on GMAT balance
    updateGameAccess(bal, dec);

    // Count unlocked games (after updateGameAccess runs)
    let unlockedCount = 0;
    document.querySelectorAll(".card[data-required-gmat]").forEach(card => {
      const unlockIndicator = card.querySelector(".game-unlock-indicator");
      if (unlockIndicator && unlockIndicator.style.display !== "none") {
        unlockedCount++;
      }
    });
    const totalGames = document.querySelectorAll(".card[data-required-gmat]").length;

    // General access section
    const hasAccess = bal >= ethers.parseUnits("1", dec);
    if (hasAccess) {
      document.getElementById("gameLocked").style.display = "none";
      document.getElementById("gameUnlocked").style.display = "block";
      const unlockedText = document.querySelector("#gameUnlocked p");
      if (unlockedText && unlockedCount > 0) {
        unlockedText.innerHTML = `<b>You have access!</b><br>Unlocked: ${unlockedCount} / ${totalGames} games`;
      } else if (unlockedText) {
        unlockedText.innerHTML = `<b>You have access!</b><br>Buy more GMAT tokens to unlock games.`;
      }
    } else {
      document.getElementById("gameLocked").style.display = "block";
      document.getElementById("gameUnlocked").style.display = "none";
    }
  } catch (e) {
    document.getElementById("tokenBalance").innerText = "—";
    document.getElementById("gameTokenPrice").innerText = "—";
    document.getElementById("gameLocked").style.display = "block";
    document.getElementById("gameUnlocked").style.display = "none";
    // Lock all games on error
    document.querySelectorAll(".card").forEach(card => {
      const lockIndicator = card.querySelector(".game-lock-indicator");
      const unlockIndicator = card.querySelector(".game-unlock-indicator");
      const playBtn = card.querySelector(".play-game-btn");
      if (lockIndicator) lockIndicator.style.display = "block";
      if (unlockIndicator) unlockIndicator.style.display = "none";
      if (playBtn) playBtn.disabled = true;
    });
  }
}

function updateGameAccess(balanceWei, decimals) {
  document.querySelectorAll(".card[data-required-gmat]").forEach(card => {
    const requiredGmat = parseInt(card.dataset.requiredGmat);
    const requiredWei = ethers.parseUnits(requiredGmat.toString(), decimals);
    const isUnlocked = balanceWei >= requiredWei;

    const lockIndicator = card.querySelector(".game-lock-indicator");
    const unlockIndicator = card.querySelector(".game-unlock-indicator");
    const playBtn = card.querySelector(".play-game-btn");

    if (isUnlocked) {
      if (lockIndicator) lockIndicator.style.display = "none";
      if (unlockIndicator) unlockIndicator.style.display = "block";
      if (playBtn) {
        playBtn.disabled = false;
        playBtn.style.cursor = "pointer";
      }
      card.style.opacity = "1";
      card.style.filter = "none";
    } else {
      if (lockIndicator) lockIndicator.style.display = "block";
      if (unlockIndicator) unlockIndicator.style.display = "none";
      if (playBtn) {
        playBtn.disabled = true;
        playBtn.style.cursor = "not-allowed";
      }
      card.style.opacity = "0.6";
      card.style.filter = "grayscale(50%)";
    }
  });
}

function playGame(gameName, requiredGmat) {
  alert(`🎮 Launching ${gameName.toUpperCase()}!\n\nYou have access with ${requiredGmat}+ GMAT tokens.\n\nGame would launch here!`);
}

async function buyGameTokens() {
  const statusEl = document.getElementById("txStatus");
  if (!signer || !REWARD_TOKEN_ADDRESS) {
    statusEl.className = "error";
    statusEl.innerText = "Connect wallet and set RewardToken (GMAT) address.";
    return;
  }

  const raw = document.getElementById("buyEthAmount").value.trim();
  if (!raw || isNaN(parseFloat(raw)) || parseFloat(raw) <= 0) {
    statusEl.className = "error";
    statusEl.innerText = "Enter a valid ETH amount.";
    return;
  }

  const valueWei = ethers.parseEther(raw);
  const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, signer);

  const statusEl = document.getElementById("txStatus");
  try {
    statusEl.className = "pending";
    statusEl.innerText = "⏳ Buying GMAT tokens...";
    const tx = await token.buyTokens({ value: valueWei });
    await tx.wait();
    statusEl.className = "success";
    statusEl.innerText = "✅ GMAT tokens purchased!";
    document.getElementById("buyEthAmount").value = "";
    await updateBalances();
  } catch (err) {
    statusEl.className = "error";
    statusEl.innerText = "❌ Transaction failed: " + (err.message || err);
    console.error(err);
  }
}

async function createCampaign() {
  const statusEl = document.getElementById("txStatus");
  const CROWDFUND_ADDRESS = localStorage.getItem("crowdfundAddress") || "";
  if (!CROWDFUND_ADDRESS || !ethers.isAddress(CROWDFUND_ADDRESS)) {
    statusEl.className = "error";
    statusEl.innerText = "Set crowdfund contract address first (optional).";
    return;
  }

  const CROWDFUND_ABI = [
    "function createCampaign(string,uint256,uint256)"
  ];

  const title = document.getElementById("title").value;
  const goal = document.getElementById("goal").value;
  const duration = document.getElementById("duration").value;

  const contract = new ethers.Contract(CROWDFUND_ADDRESS, CROWDFUND_ABI, signer);

  const statusEl = document.getElementById("txStatus");
  try {
    statusEl.className = "pending";
    statusEl.innerText = "⏳ Creating campaign...";
    const tx = await contract.createCampaign(
      title,
      ethers.parseEther(goal),
      duration
    );
    await tx.wait();
    statusEl.className = "success";
    statusEl.innerText = "✅ Campaign created";
  } catch (err) {
    statusEl.className = "error";
    statusEl.innerText = "❌ Error: " + (err.message || err);
    console.error(err);
  }
}

// Removed buyAccess - games are now unlocked by holding GMAT tokens
