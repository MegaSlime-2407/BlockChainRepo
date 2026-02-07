// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Crowdfunding {
    address public owner;
    IERC20 public gmt;

    uint256 public goal;
    uint256 public deadline;
    uint256 public totalRaised;

    mapping(address => uint256) public contributions;
    
    constructor(address gtmAddress, uint256 goalWei, uint256 durationSeconds) {
        owner = msg.sender;
        gmt = IERC20(gtmAddress);
        goal = goalWei;
        deadline = block.timestamp + durationSeconds;
    }

    function contribute(uint256 amountWei) external{
        require(block.timestamp < deadline, "Campaign ended");
        require(amountWei > 0, "Amount must be > 0");

        bool ok = gmt.transferFrom(msg.sender, address(this), amountWei);
        require(ok, "transferFrom failed");

        contributions[msg.sender] += amountWei;
        totalRaised += amountWei;
    }

    function withdrawFunds() external {
        require(msg.sender == owner, "Not owner");
        require(block.timestamp >= deadline, "Too early");
        require(totalRaised >= goal, "Goal not reached");

        bool ok = gmt.transfer(owner, totalRaised);
        require(ok,"transfer failed");
    }

    function refund() external {
        require(block.timestamp >= deadline, "Too early");
        require(totalRaised < goal, "Goal reached");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[msg.sender] = 0;

        bool ok = gmt.transfer(msg.sender, amount);
        require(ok, "transfer failed");
    }
}