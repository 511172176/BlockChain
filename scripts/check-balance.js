const hre = require("hardhat");
require('dotenv').config();

async function main() {
    // 使用 hre.ethers.getSigners() 來確保正確調用
    const [deployer] = await hre.ethers.getSigners();
    const balance = await deployer.getBalance();

    console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
