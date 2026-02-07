// Wallet page functionality - uses utils.js

const connectBtn = document.getElementById("connectBtn");
if (connectBtn) connectBtn.onclick = initWallet;

async function initWallet() {
  const addressEl = document.getElementById("walletAddress");
  const networkEl = document.getElementById("network");
  const ethBalanceEl = document.getElementById("ethBalance");
  const tokenBalanceEl = document.getElementById("tokenBalance");

  const connected = await connectWallet();
  if (!connected) {
    if (connectBtn) connectBtn.textContent = "Connect MetaMask";
    if (addressEl) addressEl.textContent = "—";
    if (networkEl) networkEl.textContent = "—";
    if (ethBalanceEl) ethBalanceEl.textContent = "—";
    if (tokenBalanceEl) tokenBalanceEl.textContent = "—";
    return;
  }

  if (addressEl) addressEl.textContent = "Connecting...";
  if (networkEl) networkEl.textContent = "Loading...";
  if (connectBtn) connectBtn.disabled = true;

  const balances = await getBalances();
  if (!balances) {
    if (addressEl) addressEl.textContent = "—";
    if (networkEl) networkEl.textContent = "—";
    if (connectBtn) connectBtn.disabled = false;
    return;
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (addressEl) addressEl.textContent = balances.address;
  if (networkEl) networkEl.textContent = `${network.name} (${chainId})`;
  if (ethBalanceEl) ethBalanceEl.textContent = ethers.formatEther(balances.eth);

  if (balances.error) {
    if (tokenBalanceEl) tokenBalanceEl.textContent = "Error loading";
    if (connectBtn) {
      connectBtn.textContent = "Connected";
      connectBtn.disabled = false;
    }
    return;
  }

  if (tokenBalanceEl) {
    tokenBalanceEl.textContent = ethers.formatUnits(balances.tokenBalance, balances.decimals);
  }

  if (connectBtn) {
    connectBtn.textContent = "Connected";
    connectBtn.disabled = false;
  }
}

// Auto-connect if already connected
window.addEventListener("load", async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      await initWallet();
    }
  }
});
