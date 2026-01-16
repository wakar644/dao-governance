const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOv2 Advanced Features", function () {
    let roles, govToken, dao;
    let owner, council1, council2, techCommittee, voter1, voter2;

    beforeEach(async function () {
        [owner, council1, council2, techCommittee, voter1, voter2] = await ethers.getSigners();

        // Deploy Roles
        const RolesFactory = await ethers.getContractFactory("Roles");
        roles = await RolesFactory.deploy();

        // Deploy GovToken
        const GovTokenFactory = await ethers.getContractFactory("GovToken");
        govToken = await GovTokenFactory.deploy(ethers.parseEther("1000000"));

        // Deploy DAOv2
        const DAOv2Factory = await ethers.getContractFactory("DAOv2");
        dao = await DAOv2Factory.deploy(await roles.getAddress(), await govToken.getAddress());

        // Setup roles
        await roles.addCouncilMember(council1.address);
        await roles.addCouncilMember(council2.address);
        await roles.addTechnicalCommitteeMember(techCommittee.address);

        // Grant DAO admin over Roles
        const DEFAULT_ADMIN_ROLE = await roles.DEFAULT_ADMIN_ROLE();
        await roles.grantRole(DEFAULT_ADMIN_ROLE, await dao.getAddress());

        // Distribute tokens for referendum voting
        await govToken.transfer(voter1.address, ethers.parseEther("1000"));
        await govToken.transfer(voter2.address, ethers.parseEther("2000"));
    });

    describe("Council Proposals", function () {
        it("Should allow council to propose and vote", async function () {
            const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
            const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter1.address]);

            await dao.connect(council1).proposeCouncil(
                await roles.getAddress(),
                0,
                calldata,
                2,
                100
            );

            await dao.connect(council1).voteCouncil(0, true);
            await dao.connect(council2).voteCouncil(0, true);

            expect(await roles.isCouncilMember(voter1.address)).to.be.true;
        });
    });

    describe("Fast-Track", function () {
        it("Should allow technical committee to fast-track proposals", async function () {
            const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
            const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter1.address]);

            // Create proposal with threshold 4
            await dao.connect(council1).proposeCouncil(
                await roles.getAddress(),
                0,
                calldata,
                4,
                100
            );

            let proposal = await dao.proposals(0);
            expect(proposal.threshold).to.equal(4);

            // Fast-track: reduces threshold by half
            await dao.connect(techCommittee).fastTrack(0, 10);

            proposal = await dao.proposals(0);
            expect(proposal.fastTracked).to.be.true;
            expect(proposal.threshold).to.equal(2); // 4 -> 2

            // Now only 2 votes needed
            await dao.connect(council1).voteCouncil(0, true);
            await dao.connect(council2).voteCouncil(0, true);

            expect(await roles.isCouncilMember(voter1.address)).to.be.true;
        });
    });

    describe("Veto", function () {
        it("Should allow council to veto proposals", async function () {
            const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
            const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter1.address]);

            await dao.connect(council1).proposeCouncil(
                await roles.getAddress(),
                0,
                calldata,
                2,
                100
            );

            // Veto the proposal
            await expect(dao.connect(council2).veto(0))
                .to.emit(dao, "Vetoed")
                .withArgs(0, council2.address);

            // Trying to vote should fail
            await expect(dao.connect(council1).voteCouncil(0, true))
                .to.be.revertedWith("Proposal not active");
        });
    });

    describe("Token-Weighted Referendum", function () {
        it("Should allow public referendum with token voting", async function () {
            const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
            const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, voter1.address]);

            // Anyone can propose a referendum
            await dao.connect(voter1).proposeReferendum(
                await roles.getAddress(),
                0,
                calldata,
                ethers.parseEther("2500"), // Need 2500 tokens to pass
                100
            );

            // Approve tokens for voting
            await govToken.connect(voter1).approve(await dao.getAddress(), ethers.parseEther("1000"));
            await govToken.connect(voter2).approve(await dao.getAddress(), ethers.parseEther("2000"));

            // Vote with tokens
            await dao.connect(voter1).voteReferendum(0, true, ethers.parseEther("1000"));

            let proposal = await dao.proposals(0);
            expect(proposal.ayeTokens).to.equal(ethers.parseEther("1000"));

            // Second vote pushes over threshold
            await dao.connect(voter2).voteReferendum(0, true, ethers.parseEther("2000"));

            expect(await roles.isCouncilMember(voter1.address)).to.be.true;
        });

        it("Should allow claiming tokens after proposal ends", async function () {
            const calldata = roles.interface.encodeFunctionData("grantRole", [await roles.COUNCIL_ROLE(), voter1.address]);

            await dao.connect(voter1).proposeReferendum(
                await roles.getAddress(),
                0,
                calldata,
                ethers.parseEther("5000"),
                5
            );

            await govToken.connect(voter1).approve(await dao.getAddress(), ethers.parseEther("1000"));
            await dao.connect(voter1).voteReferendum(0, true, ethers.parseEther("1000"));

            const balanceBefore = await govToken.balanceOf(voter1.address);

            // Mine blocks to end voting
            for (let i = 0; i < 6; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            await dao.connect(voter1).claimTokens(0);

            const balanceAfter = await govToken.balanceOf(voter1.address);
            expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1000"));
        });
    });
});
