pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VulnerableFixed is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        uint256 amt = balances[msg.sender];
        balances[msg.sender] = 0;  
        (bool ok,) = msg.sender.call{value: amt}("");
        require(ok, "send failed");
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
