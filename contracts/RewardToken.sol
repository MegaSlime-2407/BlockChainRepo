// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    uint256 public pricePerToken; // wei per 1 full token (not base units)
    mapping(address => bool) public minters;

    event TokensPurchased(address buyer, uint256 ethPaid, uint256 tokensReceived);

    constructor() ERC20("GoldMine Access Token", "GMAT") Ownable(msg.sender) {
        pricePerToken = 0.000001 ether; // 0.000001 ETH per 1 GMAT
    }

    /// @notice Buy GMAT tokens by sending ETH. Tokens are minted to msg.sender.
    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy");
        require(msg.value >= pricePerToken, "Not enough ETH");

        uint256 amount = (msg.value * (10 ** uint256(decimals()))) / pricePerToken;
        require(amount > 0, "Amount too small");

        _mint(msg.sender, amount);
        emit TokensPurchased(msg.sender, msg.value, amount);
    }

    function setPricePerToken(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be > 0");
        pricePerToken = _price;
    }

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH to withdraw");
        payable(owner()).transfer(bal);
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || minters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }
}
