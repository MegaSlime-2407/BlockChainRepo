// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract RewardToken is ERC20, Ownable {
    
    
    mapping(address => bool) public minters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);

    
    constructor() ERC20("GoldMine Access Token", "GMAT") Ownable(msg.sender) {
        
    }

   
    function setMinter(address minter, bool allowed) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        minters[minter] = allowed;
        
        if (allowed) {
            emit MinterAdded(minter);
        } else {
            emit MinterRemoved(minter);
        }
    }

   
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == owner() || minters[msg.sender], 
            "Not authorized to mint"
        );
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);
    }

    function isMinter(address account) external view returns (bool) {
        return minters[account] || account == owner();
    }
}
