// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Roles is AccessControl {
    bytes32 public constant COUNCIL_ROLE = keccak256("COUNCIL_ROLE");
    bytes32 public constant TECHNICAL_COMMITTEE_ROLE = keccak256("TECHNICAL_COMMITTEE_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COUNCIL_ROLE, msg.sender); // Initial deployer is in council for setup
    }

    function addCouncilMember(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(COUNCIL_ROLE, account);
    }

    function removeCouncilMember(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(COUNCIL_ROLE, account);
    }

    function addTechnicalCommitteeMember(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TECHNICAL_COMMITTEE_ROLE, account);
    }

    function removeTechnicalCommitteeMember(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(TECHNICAL_COMMITTEE_ROLE, account);
    }

    function isCouncilMember(address account) external view returns (bool) {
        return hasRole(COUNCIL_ROLE, account);
    }

    function isTechnicalCommitteeMember(address account) external view returns (bool) {
        return hasRole(TECHNICAL_COMMITTEE_ROLE, account);
    }
}
