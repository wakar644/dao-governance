const hre = require("hardhat");

async function main() {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy Roles
    const Roles = await ethers.getContractFactory("Roles");
    const roles = await Roles.deploy();
    await roles.waitForDeployment();
    const rolesAddress = await roles.getAddress();
    console.log("Roles deployed to:", rolesAddress);

    // Deploy GovToken (1 million tokens)
    const GovToken = await ethers.getContractFactory("GovToken");
    const govToken = await GovToken.deploy(ethers.parseEther("1000000"));
    await govToken.waitForDeployment();
    const govTokenAddress = await govToken.getAddress();
    console.log("GovToken deployed to:", govTokenAddress);

    // Deploy DAOv2
    const DAOv2 = await ethers.getContractFactory("DAOv2");
    const dao = await DAOv2.deploy(rolesAddress, govTokenAddress);
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    console.log("DAOv2 deployed to:", daoAddress);

    // Grant DAO admin rights over Roles
    const DEFAULT_ADMIN_ROLE = await roles.DEFAULT_ADMIN_ROLE();
    await roles.grantRole(DEFAULT_ADMIN_ROLE, daoAddress);
    console.log("Granted DAOv2 admin role over Roles contract.");

    console.log("\n--- Deployment Complete ---");
    console.log("Roles:", rolesAddress);
    console.log("GovToken:", govTokenAddress);
    console.log("DAOv2:", daoAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
