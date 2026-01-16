const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO System", function () {
    let Roles, roles;
    let DAO, dao;
    let owner, council1, council2, council3, user;

    beforeEach(async function () {
        [owner, council1, council2, council3, user] = await ethers.getSigners();

        const RolesFactory = await ethers.getContractFactory("Roles");
        roles = await RolesFactory.deploy();

        const DAOFactory = await ethers.getContractFactory("DAO");
        dao = await DAOFactory.deploy(await roles.getAddress());

        // Setup Council
        await roles.addCouncilMember(council1.address);
        await roles.addCouncilMember(council2.address);
        await roles.addCouncilMember(council3.address);
    });

    it("Should allow council to propose and execute", async function () {
        const DEFAULT_ADMIN_ROLE = await roles.DEFAULT_ADMIN_ROLE();
        await roles.grantRole(DEFAULT_ADMIN_ROLE, await dao.getAddress());

        const COUNCIL_ROLE = await roles.COUNCIL_ROLE();
        const calldata = roles.interface.encodeFunctionData("grantRole", [COUNCIL_ROLE, user.address]);

        // Propose
        await dao.connect(council1).propose(
            await roles.getAddress(),
            0, // value
            calldata,
            3, // threshold
            100 // duration
        );

        const proposalId = 0;

        // Vote
        await dao.connect(council1).vote(proposalId, true);
        await dao.connect(council2).vote(proposalId, true);

        let p = await dao.proposals(proposalId);
        expect(p.executed).to.be.false;

        // 3rd vote triggers execution
        await expect(dao.connect(council3).vote(proposalId, true))
            .to.emit(dao, "Executed")
            .withArgs(proposalId, true, "0x");

        // Check effect
        expect(await roles.isCouncilMember(user.address)).to.be.true;
    });
});
