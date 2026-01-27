// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract LendingPool {
    IERC20 public token;
    uint256 public totalDeposited;

    mapping(address => uint256) public deposits;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function deposit(uint256 amount) public {
        require(amount > 0, "amount must be > 0");

        token.transferFrom(msg.sender, address(this), amount);

        deposits[msg.sender] += amount;
        totalDeposited += amount;
    }

    function withdraw(uint256 amount) public {
        require(amount > 0, "amount must be > 0");
        require(deposits[msg.sender] >= amount, "not enough balance");

        deposits[msg.sender] -= amount;
        totalDeposited -= amount;

        token.transfer(msg.sender, amount);
    }
}
