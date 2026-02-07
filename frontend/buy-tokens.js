// Buy tokens page functionality

const buyBtn = document.getElementById("buyGameTokensBtn");
if (buyBtn) buyBtn.onclick = buyGameTokens;

// Auto-connect on load
window.addEventListener("load", async () => {
  // Try to connect if MetaMask is available
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      await connectWallet();
    }
  }
  await updatePrice();
  if (buyBtn) buyBtn.disabled = !REWARD_TOKEN_ADDRESS || !signer;
});

async function updatePrice() {
  if (!REWARD_TOKEN_ADDRESS) {
    // Try to get from localStorage
    REWARD_TOKEN_ADDRESS = localStorage.getItem("rewardTokenAddress") || "";
    if (!REWARD_TOKEN_ADDRESS) return;
  }

  try {
    const tempProvider = provider || new ethers.BrowserProvider(window.ethereum);
    if (!provider) provider = tempProvider;
    const code = await provider.getCode(REWARD_TOKEN_ADDRESS);
    if (!code || code === "0x") {
      localStorage.removeItem("rewardTokenAddress");
      REWARD_TOKEN_ADDRESS = "";
      const priceEl = document.getElementById("gameTokenPrice");
      if (priceEl) priceEl.textContent = "—";
      return;
    }
    const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, tempProvider);
    const price = await token.pricePerToken();
    const priceEl = document.getElementById("gameTokenPrice");
    if (priceEl) priceEl.textContent = ethers.formatEther(price);
  } catch (e) {
    console.error("Error loading price:", e);
    const priceEl = document.getElementById("gameTokenPrice");
    if (priceEl) priceEl.textContent = "—";
  }
}

async function buyGameTokens() {
  const statusEl = getStatusElement();
  if (!signer || !REWARD_TOKEN_ADDRESS) {
    const connected = await connectWallet();
    if (!connected) {
      if (statusEl) {
        statusEl.className = "error";
        statusEl.innerText = "Connect wallet and set RewardToken (GMAT) address.";
      }
      return;
    }
    signer = await provider.getSigner();
  }

  const raw = document.getElementById("buyEthAmount").value.trim();
  if (!raw || isNaN(parseFloat(raw)) || parseFloat(raw) <= 0) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Enter a valid ETH amount.";
    }
    return;
  }

  const valueWei = ethers.parseEther(raw);
  const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, signer);

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Buying GMAT tokens...";
    }
    if (buyBtn) buyBtn.disabled = true;

    const tx = await token.buyTokens({ value: valueWei });
    await tx.wait();

    if (statusEl) {
      statusEl.className = "success";
      statusEl.innerText = "✅ GMAT tokens purchased!";
    }
    document.getElementById("buyEthAmount").value = "";
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Transaction failed: " + (err.message || err);
    }
    console.error(err);
  } finally {
    if (buyBtn) buyBtn.disabled = false;
  }
}
