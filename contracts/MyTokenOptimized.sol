// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyTokenOptimized is ERC20 {

    constructor(uint256 initialSupply)
        ERC20("MyToken", "MTK")
    {
        _mint(msg.sender, initialSupply);
    }

    // external function (cheaper than public)
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}