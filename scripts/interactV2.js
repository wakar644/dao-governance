const hre = require("hardhat");

async function main() {
    const { ethers } = hre;

    const [deployer, council1, council2, techCommittee, voter1, voter2] = await ethers.getSigners();

    console.log("=== DAOv2 Full Demo ===\n");

    // ========== DEPLOY ==========
    console.log("Deploying contracts...");

    const Roles = await ethers.getContractFactory("Roles");
    const roles = await Roles.deploy();

    const GovToken = await ethers.getContractFactory("GovToken");
    const govToken = await GovToken.deploy(ethers.parseEther("1000000"));

    const DAOv2 = await ethers.getContractFactory("DAOv2");
    const dao = await DAOv2.deploy(await roles.getAddress(), await govToken.getAddress());

    // Setup
    await roles.addCouncilMember(council1.address);
    await roles.addCouncilMember(council2.address);
    await roles.addTechnicalCommitteeMember(techCommittee.address);
    await roles.grantRole(await roles.DEFAULT_ADMIN_ROLE(), await dao.getAddress());
    await govToken.transfer(voter1.address, ethers.parseEther("5000"));
    await govToken.transfer(voter2.address, ethers.parseEther("3000"));

    console.log("Contracts deployed and configured!\n");

    // ========== DEMO 1: FAST-TRACK ==========
    console.log("--- DEMO 1: Fast-Track ---");
    const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
    let calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter1.address]);

    await dao.connect(council1).proposeCouncil(await roles.getAddress(), 0, calldata, 4, 100);
    console.log("Proposal #0 created with threshold=4");

    await dao.connect(techCommittee).fastTrack(0, 10);
    let p = await dao.proposals(0);
    console.log("Fast-tracked! New threshold:", p.threshold.toString());

    await dao.connect(council1).voteCouncil(0, true);
    await dao.connect(council2).voteCouncil(0, true);
    console.log("Executed:", (await dao.proposals(0)).status == 1n ? "✅" : "❌");

    // ========== DEMO 2: VETO ==========
    console.log("\n--- DEMO 2: Veto ---");
    calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter2.address]);
    await dao.connect(council1).proposeCouncil(await roles.getAddress(), 0, calldata, 2, 100);
    console.log("Proposal #1 created");

    await dao.connect(council2).veto(1);
    console.log("Vetoed! Status:", (await dao.proposals(1)).status == 2n ? "VETOED ✅" : "❌");

    // ========== DEMO 3: TOKEN REFERENDUM ==========
    console.log("\n--- DEMO 3: Token-Weighted Referendum ---");
    const TC_ROLE = await roles.TECHNICAL_COMMITTEE_ROLE();
    calldata = roles.interface.encodeFunctionData("grantRole", [TC_ROLE, voter1.address]);

    await dao.connect(voter1).proposeReferendum(await roles.getAddress(), 0, calldata, ethers.parseEther("7000"), 100);
    console.log("Referendum #2 created (needs 7000 tokens)");

    await govToken.connect(voter1).approve(await dao.getAddress(), ethers.parseEther("5000"));
    await dao.connect(voter1).voteReferendum(2, true, ethers.parseEther("5000"));
    console.log("Voter1 voted with 5000 tokens");

    await govToken.connect(voter2).approve(await dao.getAddress(), ethers.parseEther("3000"));
    await dao.connect(voter2).voteReferendum(2, true, ethers.parseEther("3000"));
    console.log("Voter2 voted with 3000 tokens");

    console.log("Executed:", (await dao.proposals(2)).status == 1n ? "✅" : "❌");
    console.log("Voter1 is now TC member:", await roles.isTechnicalCommitteeMember(voter1.address));

    console.log("\n=== Demo Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
