// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Ticketing is ERC721 {

    uint256 public ticketCounter;

    constructor() ERC721("EventTicket", "ETKT") {}

    // Mint a new ticket to user
    function mintTicket(address to) public {
        uint256 ticketId = ticketCounter;
        ticketCounter++;

        _mint(to, ticketId);
    }
}