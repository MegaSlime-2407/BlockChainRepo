// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RewardToken.sol";

contract GameCrowdfunding {

    struct Campaign {
        string title;
        uint256 goal;
        uint256 deadline;
        uint256 raised;
        bool active;
    }

    RewardToken public rewardToken;
    Campaign[] public campaigns;

    constructor(address _tokenAddress) {
        rewardToken = RewardToken(_tokenAddress);
    }

    function createCampaign(
        string memory _title,
        uint256 _goal,
        uint256 _duration
    ) external {
        campaigns.push(
            Campaign({
                title: _title,
                goal: _goal,
                deadline: block.timestamp + _duration,
                raised: 0,
                active: true
            })
        );
    }

    function contribute(uint256 _campaignId) external payable {
        Campaign storage c = campaigns[_campaignId];

        require(c.active, "Campaign inactive");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "Zero contribution");

        c.raised += msg.value;

        
        uint256 rewardAmount = msg.value * 100;
        rewardToken.mint(msg.sender, rewardAmount);
    }
}
