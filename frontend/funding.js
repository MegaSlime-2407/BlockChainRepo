let provider;
let signer;
let REWARD_TOKEN_ADDRESS = localStorage.getItem("rewardTokenAddress") || "";

const ALLOWED_CHAIN_IDS = [11155111, 31337, 1337];

const REWARD_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const CROWDFUND_ABI = [
  "function createCampaign(string,uint256,uint256)",
  "function contribute(uint256) payable",
  "function withdraw(uint256)",
  "function refund(uint256)",
  "function getCampaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (string title, uint256 goal, uint256 deadline, uint256 raised, bool active, address creator)"
];

function getStatusElement() {
  return document.getElementById("txStatus");
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not installed");
    return false;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const addressEl = document.getElementById("walletAddress");
  const networkEl = document.getElementById("network");
  const ethBalanceEl = document.getElementById("ethBalance");
  const tokenBalanceEl = document.getElementById("tokenBalance");

  if (addressEl) addressEl.textContent = "Connecting...";
  if (networkEl) networkEl.textContent = "Loading...";

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (!ALLOWED_CHAIN_IDS.includes(chainId)) {
    alert("Please switch to Sepolia Testnet or Hardhat Local (chainId 31337)");
    return false;
  }

  const address = await signer.getAddress();
  if (addressEl) addressEl.textContent = address;
  if (networkEl) networkEl.textContent = `${network.name} (${chainId})`;

  const ethBal = await provider.getBalance(address);
  if (ethBalanceEl) ethBalanceEl.textContent = ethers.formatEther(ethBal);

  if (tokenBalanceEl && REWARD_TOKEN_ADDRESS && ethers.isAddress(REWARD_TOKEN_ADDRESS)) {
    try {
      const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, provider);
      const [bal, dec] = await Promise.all([token.balanceOf(address), token.decimals()]);
      tokenBalanceEl.textContent = ethers.formatUnits(bal, dec);
    } catch {
      tokenBalanceEl.textContent = "—";
    }
  } else if (tokenBalanceEl) {
    tokenBalanceEl.textContent = "—";
  }

  return true;
}

function loadCrowdfundAddress() {
  const stored = localStorage.getItem("crowdfundAddress") || "";
  const input = document.getElementById("crowdfundAddress");
  if (input && stored) input.value = stored;
  return stored;
}

function saveCrowdfundAddress() {
  const input = document.getElementById("crowdfundAddress");
  const statusEl = getStatusElement();
  if (!input) return;

  const addr = input.value.trim();
  if (!addr || !ethers.isAddress(addr)) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Enter a valid contract address.";
    }
    return;
  }

  localStorage.setItem("crowdfundAddress", addr);
  if (statusEl) {
    statusEl.className = "success";
    statusEl.innerText = "✅ Crowdfunding address saved.";
  }
}

function getCrowdfundContract() {
  const addr = (document.getElementById("crowdfundAddress")?.value || "").trim();
  if (!addr || !ethers.isAddress(addr)) return null;
  return new ethers.Contract(addr, CROWDFUND_ABI, signer);
}

async function loadCampaigns() {
  const statusEl = getStatusElement();
  const listEl = document.getElementById("campaignList");
  if (!listEl) return;

  if (!signer) {
    const ok = await connectWallet();
    if (!ok) return;
  }

  const contract = getCrowdfundContract();
  if (!contract) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set a valid crowdfunding address first.";
    }
    return;
  }

  listEl.innerHTML = "";
  try {
    const count = await contract.getCampaignCount();
    const total = Number(count);
    if (total === 0) {
      listEl.innerHTML = "<p>No campaigns yet.</p>";
      return;
    }

    for (let i = 0; i < total; i++) {
      const c = await contract.campaigns(i);
      const now = Math.floor(Date.now() / 1000);
      const isEnded = now >= Number(c.deadline);
      const status = c.active ? (isEnded ? "Ended" : "Active") : "Closed";
      const goalEth = ethers.formatEther(c.goal);
      const raisedEth = ethers.formatEther(c.raised);
      const deadlineDate = new Date(Number(c.deadline) * 1000).toLocaleString();

      const item = document.createElement("div");
      item.className = "info-item";
      item.innerHTML = `
        <span class="label">#${i} · ${c.title}</span>
        <span class="value">
          Goal: ${goalEth} ETH · Raised: ${raisedEth} ETH · ${status}<br>
          Deadline: ${deadlineDate}<br>
          Creator: ${c.creator}
        </span>
      `;
      listEl.appendChild(item);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Error loading campaigns: " + (err.message || err);
    }
    console.error(err);
  }
}

async function createCampaign() {
  const statusEl = getStatusElement();
  if (!signer) {
    const ok = await connectWallet();
    if (!ok) return;
  }

  const contract = getCrowdfundContract();
  if (!contract) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set a valid crowdfunding address first.";
    }
    return;
  }

  const title = document.getElementById("campaignTitle")?.value.trim();
  const goal = document.getElementById("campaignGoal")?.value.trim();
  const duration = document.getElementById("campaignDuration")?.value.trim();

  if (!title || !goal || !duration) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Fill in title, goal, and duration.";
    }
    return;
  }

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Creating campaign...";
    }
    const tx = await contract.createCampaign(
      title,
      ethers.parseEther(goal),
      Number(duration)
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

async function contribute() {
  const statusEl = getStatusElement();
  if (!signer) {
    const ok = await connectWallet();
    if (!ok) return;
  }

  const contract = getCrowdfundContract();
  if (!contract) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set a valid crowdfunding address first.";
    }
    return;
  }

  const idRaw = document.getElementById("contributeCampaignId")?.value.trim();
  const amountRaw = document.getElementById("contributeAmount")?.value.trim();

  if (!idRaw || isNaN(Number(idRaw)) || !amountRaw) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Enter campaign ID and ETH amount.";
    }
    return;
  }

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Sending contribution...";
    }
    const tx = await contract.contribute(Number(idRaw), {
      value: ethers.parseEther(amountRaw)
    });
    await tx.wait();
    if (statusEl) {
      statusEl.className = "success";
      statusEl.innerText = "✅ Contribution sent";
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Error: " + (err.message || err);
    }
    console.error(err);
  }
}

async function withdraw() {
  const statusEl = getStatusElement();
  if (!signer) {
    const ok = await connectWallet();
    if (!ok) return;
  }

  const contract = getCrowdfundContract();
  if (!contract) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set a valid crowdfunding address first.";
    }
    return;
  }

  const idRaw = document.getElementById("actionCampaignId")?.value.trim();
  if (!idRaw || isNaN(Number(idRaw))) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Enter a valid campaign ID.";
    }
    return;
  }

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Withdrawing funds...";
    }
    const tx = await contract.withdraw(Number(idRaw));
    await tx.wait();
    if (statusEl) {
      statusEl.className = "success";
      statusEl.innerText = "✅ Funds withdrawn";
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Error: " + (err.message || err);
    }
    console.error(err);
  }
}

async function refund() {
  const statusEl = getStatusElement();
  if (!signer) {
    const ok = await connectWallet();
    if (!ok) return;
  }

  const contract = getCrowdfundContract();
  if (!contract) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Set a valid crowdfunding address first.";
    }
    return;
  }

  const idRaw = document.getElementById("actionCampaignId")?.value.trim();
  if (!idRaw || isNaN(Number(idRaw))) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "Enter a valid campaign ID.";
    }
    return;
  }

  try {
    if (statusEl) {
      statusEl.className = "pending";
      statusEl.innerText = "⏳ Requesting refund...";
    }
    const tx = await contract.refund(Number(idRaw));
    await tx.wait();
    if (statusEl) {
      statusEl.className = "success";
      statusEl.innerText = "✅ Refund sent";
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.innerText = "❌ Error: " + (err.message || err);
    }
    console.error(err);
  }
}

document.getElementById("saveCrowdfundAddressBtn")?.addEventListener("click", saveCrowdfundAddress);
document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
document.getElementById("createCampaignBtn")?.addEventListener("click", createCampaign);
document.getElementById("contributeBtn")?.addEventListener("click", contribute);
document.getElementById("withdrawBtn")?.addEventListener("click", withdraw);
document.getElementById("refundBtn")?.addEventListener("click", refund);
document.getElementById("refreshCampaignsBtn")?.addEventListener("click", loadCampaigns);

window.addEventListener("load", () => {
  loadCrowdfundAddress();
  if (window.ethereum) {
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts && accounts.length > 0) {
        connectWallet().then(loadCampaigns);
      }
    });
  }
});
