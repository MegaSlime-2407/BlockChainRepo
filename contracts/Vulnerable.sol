// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract Vulnerable {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amt = balances[msg.sender];
        (bool ok,) = msg.sender.call{value: amt}(""); 
        require(ok, "send failed");
        balances[msg.sender] = 0;  
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
