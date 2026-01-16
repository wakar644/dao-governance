const hre = require("hardhat");

async function main() {
    const { ethers } = hre;

    // Get signers (test accounts)
    const [deployer, council1, council2, newMember] = await ethers.getSigners();

    // Contract addresses from deployment
    const ROLES_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const DAO_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const roles = await ethers.getContractAt("Roles", ROLES_ADDRESS);
    const dao = await ethers.getContractAt("DAO", DAO_ADDRESS);

    console.log("=== DAO Interaction Demo ===\n");

    // Step 1: Add more council members so we can vote
    console.log("1. Adding council members...");
    await roles.addCouncilMember(council1.address);
    await roles.addCouncilMember(council2.address);
    console.log("   Council members added:", council1.address, council2.address);

    // Step 2: Create a proposal to add a new member via the DAO
    console.log("\n2. Creating a proposal to add a new council member via DAO...");

    const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
    const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, newMember.address]);

    // Propose: target=Roles, value=0, data=grantRole(...), threshold=2, duration=100 blocks
    const tx = await dao.connect(deployer).propose(
        ROLES_ADDRESS,
        0,
        calldata,
        2,  // Need 2 votes to pass
        100 // Voting lasts 100 blocks
    );
    await tx.wait();

    const proposalId = 0;
    console.log("   Proposal created! ID:", proposalId);
    console.log("   Proposal: Add", newMember.address, "to Council");
    console.log("   Threshold: 2 votes needed");

    // Step 3: Vote on the proposal
    console.log("\n3. Voting on the proposal...");

    // First vote (deployer)
    console.log("   Vote 1: Deployer votes AYE...");
    await dao.connect(deployer).vote(proposalId, true);

    let proposal = await dao.proposals(proposalId);
    console.log("   Current: Ayes =", proposal.ayeCount.toString(), ", Nays =", proposal.nayCount.toString());
    console.log("   Executed?", proposal.executed);

    // Second vote (council1) - this should trigger execution!
    console.log("\n   Vote 2: Council1 votes AYE...");
    const voteTx = await dao.connect(council1).vote(proposalId, true);
    const receipt = await voteTx.wait();

    // Check for Executed event
    const executedEvent = receipt.logs.find(log => {
        try {
            return dao.interface.parseLog(log)?.name === "Executed";
        } catch { return false; }
    });

    if (executedEvent) {
        const parsed = dao.interface.parseLog(executedEvent);
        console.log("   🎉 PROPOSAL EXECUTED!");
        console.log("   Success:", parsed.args.success);
    }

    // Step 4: Verify the new member was added
    console.log("\n4. Verifying result...");
    const isNowMember = await roles.isCouncilMember(newMember.address);
    console.log("   Is", newMember.address, "a council member now?", isNowMember);

    console.log("\n=== Demo Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
