// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title GovToken - Simple governance token for DAO voting
 */
contract GovToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Governance Token", "GOV") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
