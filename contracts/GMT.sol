// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GMT is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("GMT", "GMT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // so MetaMask imports as token not NFT
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        if (interfaceId == 0x01ffc9a7) return true;
        if (interfaceId == 0x80ac58cd) return false;
        if (interfaceId == 0x5b5e139f) return false;
        return false;
    }
}
