async function main() {
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.getBalance();
    
    console.log(`Deployer address: ${deployer.address}`);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
