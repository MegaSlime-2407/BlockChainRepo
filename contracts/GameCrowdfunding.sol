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
        address creator;      
    }

    RewardToken public rewardToken;
    uint256 public rewardPerEth; 
    Campaign[] public campaigns;
    
    
    mapping(uint256 => mapping(address => uint256)) public contributions;

    
    event CampaignCreated(
        uint256 indexed campaignId, 
        address indexed creator, 
        string title, 
        uint256 goal, 
        uint256 deadline
    );
    
    event ContributionMade(
        uint256 indexed campaignId, 
        address indexed contributor, 
        uint256 amount
    );
    
    event CampaignFinalized(
        uint256 indexed campaignId, 
        bool goalReached, 
        uint256 totalRaised
    );
    
    event CampaignWithdrawn(
        uint256 indexed campaignId, 
        address indexed creator, 
        uint256 amount
    );
    
    event RefundIssued(
        uint256 indexed campaignId, 
        address indexed contributor, 
        uint256 amount
    );
    
    event RewardMinted(
        uint256 indexed campaignId, 
        address indexed contributor, 
        uint256 rewardAmount
    );

    constructor(address _rewardToken, uint256 _rewardPerEth) {
        require(_rewardToken != address(0), "Invalid token address");
        require(_rewardPerEth > 0, "Reward must be > 0");
        
        rewardToken = RewardToken(_rewardToken);
        rewardPerEth = _rewardPerEth;
    }

    function createCampaign(
        string memory _title,
        uint256 _goal,
        uint256 _duration
    ) external {
        require(bytes(_title).length > 0, "Title required");
        require(_goal > 0, "Goal must be > 0");
        require(_duration > 0, "Duration must be > 0");

        uint256 deadline = block.timestamp + _duration;

        campaigns.push(
            Campaign({
                title: _title,
                goal: _goal,
                deadline: deadline,
                raised: 0,
                active: true,
                creator: msg.sender
            })
        );

        emit CampaignCreated(
            campaigns.length - 1, 
            msg.sender, 
            _title, 
            _goal, 
            deadline
        );
    }

    function contribute(uint256 _campaignId) external payable {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];

        require(c.active, "Campaign inactive");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "Zero contribution");

        c.raised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;

        emit ContributionMade(_campaignId, msg.sender, msg.value);

        if (rewardPerEth > 0) {
            
            uint256 rewardAmount = (msg.value * rewardPerEth) / 1 ether;
            
            if (rewardAmount > 0) {
                rewardToken.mint(msg.sender, rewardAmount);
                emit RewardMinted(_campaignId, msg.sender, rewardAmount);
            }
        }
    }

    function finalizeCampaign(uint256 _campaignId) external {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];

        require(c.active, "Already finalized");
        require(block.timestamp >= c.deadline, "Deadline not reached");

        bool goalReached = c.raised >= c.goal;
        
        emit CampaignFinalized(_campaignId, goalReached, c.raised);
    }

    
    function withdraw(uint256 _campaignId) external {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];

        require(msg.sender == c.creator, "Not creator");
        require(block.timestamp >= c.deadline, "Too early");
        require(c.raised >= c.goal, "Goal not reached");
        require(c.active, "Already closed");

        c.active = false;
        uint256 amount = c.raised;
        c.raised = 0;

        (bool ok, ) = payable(c.creator).call{value: amount}("");
        require(ok, "Withdraw failed");

        emit CampaignWithdrawn(_campaignId, c.creator, amount);
    }

    
    function refund(uint256 _campaignId) external {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];

        require(block.timestamp >= c.deadline, "Too early");
        require(c.raised < c.goal, "Goal reached");

        uint256 amount = contributions[_campaignId][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[_campaignId][msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Refund failed");

        emit RefundIssued(_campaignId, msg.sender, amount);
    }

    
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCampaign(uint256 _campaignId) external view returns (
        string memory title,
        uint256 goal,
        uint256 deadline,
        uint256 raised,
        bool active,
        address creator
    ) {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];
        return (c.title, c.goal, c.deadline, c.raised, c.active, c.creator);
    }

    function getContribution(uint256 _campaignId, address _contributor) 
        external 
        view 
        returns (uint256) 
    {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        return contributions[_campaignId][_contributor];
    }

    function isActive(uint256 _campaignId) external view returns (bool) {
        require(_campaignId < campaigns.length, "Invalid campaign ID");
        Campaign storage c = campaigns[_campaignId];
        return c.active && block.timestamp < c.deadline;
    }
}