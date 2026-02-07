let provider;
let signer;

// брат через ваши контракты попробуйте плиз у меня не получается 
const CROWDFUND_ADDRESS = "0xYOUR_CROWDFUND_CONTRACT";
const TOKEN_ADDRESS = "0xYOUR_TOKEN_CONTRACT";


const CROWDFUND_ABI = [
  "function createCampaign(string,uint256,uint256)",
  "function contribute(uint256) payable"
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)"
];


const REQUIRED_CHAIN_ID = 11155111;


document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("createCampaignBtn").onclick = createCampaign;


document.querySelectorAll(".buy-btn").forEach(btn => {
  btn.onclick = () => buyAccess(
    btn.dataset.campaign,
    btn.dataset.price
  );
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
  document.getElementById("network").innerText = network.name;

  if (Number(network.chainId) !== REQUIRED_CHAIN_ID) {
    alert("Please switch to Sepolia Testnet");
    return;
  }

  await updateBalances();
}

async function updateBalances() {
  const address = await signer.getAddress();

  const eth = await provider.getBalance(address);
  document.getElementById("ethBalance").innerText =
    ethers.formatEther(eth);

  const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
  const bal = await token.balanceOf(address);
  document.getElementById("tokenBalance").innerText =
    ethers.formatUnits(bal, 18);
}

async function createCampaign() {
  const title = document.getElementById("title").value;
  const goal = document.getElementById("goal").value;
  const duration = document.getElementById("duration").value;

  const contract = new ethers.Contract(
    CROWDFUND_ADDRESS,
    CROWDFUND_ABI,
    signer
  );

  try {
    document.getElementById("txStatus").innerText = "⏳ Creating campaign...";
    const tx = await contract.createCampaign(
      title,
      ethers.parseEther(goal),
      duration
    );
    await tx.wait();
    document.getElementById("txStatus").innerText = "✅ Campaign created";
  } catch (err) {
    document.getElementById("txStatus").innerText = "❌ Error creating campaign";
    console.error(err);
  }
}

async function buyAccess(campaignId, price) {
  const contract = new ethers.Contract(
    CROWDFUND_ADDRESS,
    CROWDFUND_ABI,
    signer
  );

  try {
    document.getElementById("txStatus").innerText = "⏳ Transaction pending...";
    const tx = await contract.contribute(campaignId, {
      value: ethers.parseEther(price)
    });
    await tx.wait();
    document.getElementById("txStatus").innerText =
      "✅ Early Access purchased";
    await updateBalances();
  } catch (err) {
    document.getElementById("txStatus").innerText =
      "❌ Transaction failed";
    console.error(err);
  }
}
