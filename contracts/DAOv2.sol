// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Roles.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DAOv2 - Advanced Governance with Substrate-style features
 * @notice Implements:
 *   1. Council Proposals (1-member-1-vote)
 *   2. Technical Committee Fast-Track
 *   3. Veto Mechanism
 *   4. Token-Weighted Public Referenda
 */
contract DAOv2 {
    Roles public rolesContract;
    IERC20 public governanceToken;

    enum ProposalType { COUNCIL, REFERENDUM }
    enum ProposalStatus { ACTIVE, EXECUTED, VETOED, EXPIRED }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        ProposalStatus status;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        uint256 threshold;       // For COUNCIL: vote count needed. For REFERENDUM: token amount needed
        uint256 ayeCount;        // For COUNCIL: member votes
        uint256 nayCount;
        uint256 ayeTokens;       // For REFERENDUM: token-weighted votes
        uint256 nayTokens;
        uint256 endBlock;
        bool fastTracked;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public tokenVotes; // Track tokens locked per voter

    // Events
    event Proposed(uint256 indexed id, ProposalType proposalType, address indexed proposer, uint256 threshold, uint256 endBlock);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event FastTracked(uint256 indexed id, uint256 newEndBlock);
    event Vetoed(uint256 indexed id, address indexed vetoer);
    event Executed(uint256 indexed id, bool success, bytes result);

    constructor(address _rolesContract, address _governanceToken) {
        rolesContract = Roles(_rolesContract);
        governanceToken = IERC20(_governanceToken);
    }

    modifier onlyCouncil() {
        require(rolesContract.isCouncilMember(msg.sender), "Not a council member");
        _;
    }

    modifier onlyTechnicalCommittee() {
        require(rolesContract.isTechnicalCommitteeMember(msg.sender), "Not a technical committee member");
        _;
    }

    // ==================== COUNCIL PROPOSALS ====================

    function proposeCouncil(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 threshold,
        uint256 durationBlocks
    ) external onlyCouncil returns (uint256) {
        require(threshold > 0, "Threshold must be > 0");
        
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            id: id,
            proposalType: ProposalType.COUNCIL,
            status: ProposalStatus.ACTIVE,
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            threshold: threshold,
            ayeCount: 0,
            nayCount: 0,
            ayeTokens: 0,
            nayTokens: 0,
            endBlock: block.number + durationBlocks,
            fastTracked: false
        });

        emit Proposed(id, ProposalType.COUNCIL, msg.sender, threshold, block.number + durationBlocks);
        return id;
    }

    function voteCouncil(uint256 id, bool approve) external onlyCouncil {
        Proposal storage p = proposals[id];
        require(p.proposalType == ProposalType.COUNCIL, "Not a council proposal");
        require(p.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(block.number <= p.endBlock, "Voting ended");
        require(!hasVoted[id][msg.sender], "Already voted");

        hasVoted[id][msg.sender] = true;

        if (approve) {
            p.ayeCount++;
        } else {
            p.nayCount++;
        }

        emit Voted(id, msg.sender, approve, 1);

        // Auto-execute if threshold met
        if (p.ayeCount >= p.threshold) {
            _execute(id);
        }
    }

    // ==================== TECHNICAL COMMITTEE FAST-TRACK ====================

    function fastTrack(uint256 id, uint256 newDurationBlocks) external onlyTechnicalCommittee {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(!p.fastTracked, "Already fast-tracked");

        p.fastTracked = true;
        p.endBlock = block.number + newDurationBlocks;
        
        // Optionally reduce threshold for urgent matters
        if (p.threshold > 1) {
            p.threshold = (p.threshold + 1) / 2; // Halve the threshold (round up)
        }

        emit FastTracked(id, p.endBlock);
    }

    // ==================== VETO MECHANISM ====================

    function veto(uint256 id) external onlyCouncil {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.ACTIVE, "Proposal not active");
        
        // Require supermajority of council? For simplicity, any council member can veto.
        // In production, you'd want a vote or threshold.
        p.status = ProposalStatus.VETOED;

        emit Vetoed(id, msg.sender);
    }

    // ==================== PUBLIC REFERENDUM (Token-Weighted) ====================

    function proposeReferendum(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 tokenThreshold,
        uint256 durationBlocks
    ) external returns (uint256) {
        // Anyone can propose a referendum (public democracy)
        require(tokenThreshold > 0, "Threshold must be > 0");
        
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            id: id,
            proposalType: ProposalType.REFERENDUM,
            status: ProposalStatus.ACTIVE,
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            threshold: tokenThreshold,
            ayeCount: 0,
            nayCount: 0,
            ayeTokens: 0,
            nayTokens: 0,
            endBlock: block.number + durationBlocks,
            fastTracked: false
        });

        emit Proposed(id, ProposalType.REFERENDUM, msg.sender, tokenThreshold, block.number + durationBlocks);
        return id;
    }

    function voteReferendum(uint256 id, bool approve, uint256 tokenAmount) external {
        Proposal storage p = proposals[id];
        require(p.proposalType == ProposalType.REFERENDUM, "Not a referendum");
        require(p.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(block.number <= p.endBlock, "Voting ended");
        require(!hasVoted[id][msg.sender], "Already voted");
        require(tokenAmount > 0, "Must vote with tokens");

        // Transfer tokens to this contract (locked until proposal ends)
        require(governanceToken.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        hasVoted[id][msg.sender] = true;
        tokenVotes[id][msg.sender] = tokenAmount;

        if (approve) {
            p.ayeTokens += tokenAmount;
        } else {
            p.nayTokens += tokenAmount;
        }

        emit Voted(id, msg.sender, approve, tokenAmount);

        // Auto-execute if threshold met
        if (p.ayeTokens >= p.threshold && p.ayeTokens > p.nayTokens) {
            _execute(id);
        }
    }

    function claimTokens(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.status != ProposalStatus.ACTIVE || block.number > p.endBlock, "Proposal still active");
        
        uint256 amount = tokenVotes[id][msg.sender];
        require(amount > 0, "No tokens to claim");

        tokenVotes[id][msg.sender] = 0;
        require(governanceToken.transfer(msg.sender, amount), "Token transfer failed");
    }

    // ==================== EXECUTION ====================

    function _execute(uint256 id) internal {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.ACTIVE, "Cannot execute");
        
        p.status = ProposalStatus.EXECUTED;

        (bool success, bytes memory result) = p.target.call{value: p.value}(p.data);
        
        emit Executed(id, success, result);
    }

    // Manual execution for proposals that met threshold but weren't auto-executed
    function execute(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.ACTIVE, "Proposal not active");

        if (p.proposalType == ProposalType.COUNCIL) {
            require(p.ayeCount >= p.threshold, "Threshold not met");
        } else {
            require(p.ayeTokens >= p.threshold && p.ayeTokens > p.nayTokens, "Threshold not met or more nays");
        }

        _execute(id);
    }

    // Allow contract to receive ETH for proposal execution
    receive() external payable {}
}
