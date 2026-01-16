// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Roles.sol";

contract DAO {
    Roles public rolesContract;

    struct Proposal {
        uint256 id;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        uint256 threshold;
        uint256 ayeCount;
        uint256 nayCount;
        bool executed;
        uint256 endBlock;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event Proposed(uint256 indexed id, address indexed proposer, uint256 threshold, uint256 endBlock);
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event Executed(uint256 indexed id, bool success, bytes result);

    constructor(address _rolesContract) {
        rolesContract = Roles(_rolesContract);
    }

    modifier onlyCouncil() {
        require(rolesContract.isCouncilMember(msg.sender), "Not a council member");
        _;
    }

    function propose(
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
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            threshold: threshold,
            ayeCount: 0,
            nayCount: 0,
            executed: false,
            endBlock: block.number + durationBlocks
        });

        emit Proposed(id, msg.sender, threshold, block.number + durationBlocks);
        return id;
    }

    function vote(uint256 id, bool approve) external onlyCouncil {
        Proposal storage p = proposals[id];
        require(block.number <= p.endBlock, "Voting ended");
        require(!p.executed, "Already executed");
        require(!hasVoted[id][msg.sender], "Already voted");

        hasVoted[id][msg.sender] = true;

        if (approve) {
            p.ayeCount++;
        } else {
            p.nayCount++;
        }

        emit Voted(id, msg.sender, approve);

        // Check for immediate execution
        if (p.ayeCount >= p.threshold) {
             execute(id);
        }
    }

    function execute(uint256 id) public {
        Proposal storage p = proposals[id];
        require(!p.executed, "Already executed");
        require(p.ayeCount >= p.threshold, "Threshold not met");
        
        // Mark executed first to prevent re-entrancy
        p.executed = true;

        (bool success, bytes memory result) = p.target.call{value: p.value}(p.data);
        
        if (!success) {
            // If execution failed, we might want to revert or just log it.
            // For a DAO, usually we want to know it failed but keep the state that it TRIED.
            // But if we revert, we revert the `executed=true` state too?
            // Actually, if the sub-call reverts, we can choose to bubble up or not.
            // If we don't bubble up, the proposal is marked 'executed' (as in 'attempted').
            // Let's emit result.
        }
        
        emit Executed(id, success, result);
    }
}
