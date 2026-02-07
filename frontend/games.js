// Games page functionality - uses utils.js

// Game access: play game buttons
document.querySelectorAll(".play-game-btn").forEach(btn => {
  btn.onclick = () => playGame(btn.dataset.game, parseInt(btn.dataset.requiredGmat));
});

const createCampaignBtn = document.getElementById("createCampaignBtn");
if (createCampaignBtn) createCampaignBtn.onclick = createCampaign;

// Auto-connect and update on load
window.addEventListener("load", async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      await connectWallet();
      await updateBalances();
    }
  }
});

async function updateBalances() {
  if (!signer || !REWARD_TOKEN_ADDRESS) return;

  const balances = await getBalances();
  if (!balances || balances.error) {
    document.getElementById("gameLocked").style.display = "block";
    document.getElementById("gameUnlocked").style.display = "none";
    return;
  }

  // Check access for each game based on GMAT balance
  updateGameAccess(balances.tokenBalance, balances.decimals);

  // Count unlocked games
  let unlockedCount = 0;
  document.querySelectorAll(".card[data-required-gmat]").forEach(card => {
    const unlockIndicator = card.querySelector(".game-unlock-indicator");
    if (unlockIndicator && unlockIndicator.style.display !== "none") {
      unlockedCount++;
    }
  });
  const totalGames = document.querySelectorAll(".card[data-required-gmat]").length;

  // General access section
  const hasAccess = balances.tokenBalance >= ethers.parseUnits("1", balances.decimals);
  if (hasAccess) {
    document.getElementById("gameLocked").style.display = "none";
    document.getElementById("gameUnlocked").style.display = "block";
    const unlockedText = document.querySelector("#gameUnlocked p");
    if (unlockedText && unlockedCount > 0) {
      unlockedText.innerHTML = `<b>You have access!</b><br>Unlocked: ${unlockedCount} / ${totalGames} games`;
    } else if (unlockedText) {
      unlockedText.innerHTML = `<b>You have access!</b><br><a href="buy-tokens.html" style="color: #00ffc8; text-decoration: underline;">Buy more GMAT tokens</a> to unlock games.`;
    }
  } else {
    document.getElementById("gameLocked").style.display = "block";
    document.getElementById("gameUnlocked").style.display = "none";
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

async function createCampaign() {
  const statusEl = getStatusElement();
  const CROWDFUND_ADDRESS = localStorage.getItem("crowdfundAddress") || "";
  if (!CROWDFUND_ADDRESS || !ethers.isAddress(CROWDFUND_ADDRESS)) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set crowdfund contract address first (optional).";
    }
    return;
  }

  const CROWDFUND_ABI = [
    "function createCampaign(string,uint256,uint256)"
  ];

  const title = document.getElementById("title").value;
  const goal = document.getElementById("goal").value;
  const duration = document.getElementById("duration").value;

  const contract = new ethers.Contract(CROWDFUND_ADDRESS, CROWDFUND_ABI, signer);

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Creating campaign...";
    }
    const tx = await contract.createCampaign(
      title,
      ethers.parseEther(goal),
      duration
    );
    await tx.wait();
    if (statusEl) {
      statusEl.className = "success";
      statusEl.innerText = "✅ Campaign created";
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Error: " + (err.message || err);
    }
    console.error(err);
  }
}
