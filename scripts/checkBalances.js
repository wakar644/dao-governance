const hre = require("hardhat");

async function main() {
    const { ethers } = hre;

    // GovToken address from interactV2 deployment
    const GOV_TOKEN = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

    try {
        const govToken = await ethers.getContractAt("GovToken", GOV_TOKEN);
        const accounts = await ethers.getSigners();

        console.log("\\n=== GOV Token Balances ===\\n");

        for (let i = 0; i < 6; i++) {
            const bal = await govToken.balanceOf(accounts[i].address);
            console.log(`Account #${i}: ${accounts[i].address} => ${ethers.formatEther(bal)} GOV`);
        }
    } catch (e) {
        console.log("GovToken not deployed at that address. Run interactV2.js first.");
    }
}

main();
