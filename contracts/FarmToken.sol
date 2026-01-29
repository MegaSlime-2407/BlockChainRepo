// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FarmToken is ERC20 {
    IERC20 public immutable gmt;
    uint256 public immutable minGmtRequired;
    uint256 public immutable rewardPerClaim;
    uint256 public immutable cooldownSeconds;
    mapping(address => uint256) public lastClaimTime;

    constructor(
        address _gmt,
        uint256 _minGmtRequired,
        uint256 _rewardPerClaim,
        uint256 _cooldownSeconds
    ) ERC20("FarmToken", "FARM") {
        gmt = IERC20(_gmt);
        minGmtRequired = _minGmtRequired;
        rewardPerClaim = _rewardPerClaim;
        cooldownSeconds = _cooldownSeconds;
    }

    // need to hold GMT and wait for cooldown, then you get FARM
    function claim() external {
        require(gmt.balanceOf(msg.sender) >= minGmtRequired, "FarmToken: need GMT");
        require(
            lastClaimTime[msg.sender] == 0 || block.timestamp >= lastClaimTime[msg.sender] + cooldownSeconds,
            "FarmToken: cooldown"
        );
        lastClaimTime[msg.sender] = block.timestamp;
        _mint(msg.sender, rewardPerClaim);
    }
}
