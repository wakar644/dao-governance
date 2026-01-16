const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy Roles
    const Roles = await hre.ethers.getContractFactory("Roles");
    const roles = await Roles.deploy();
    await roles.waitForDeployment();
    const rolesAddress = await roles.getAddress();
    console.log("Roles deployed to:", rolesAddress);

    // Deploy DAO
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(rolesAddress);
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    console.log("DAO deployed to:", daoAddress);

    // Grant DAO admin rights over Roles (so DAO can manage membership via proposals)
    const DEFAULT_ADMIN_ROLE = await roles.DEFAULT_ADMIN_ROLE();
    await roles.grantRole(DEFAULT_ADMIN_ROLE, daoAddress);
    console.log("Granted DAO admin role over Roles contract.");

    console.log("\n--- Deployment Complete ---");
    console.log("Roles:", rolesAddress);
    console.log("DAO:", daoAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
