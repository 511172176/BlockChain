async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Address derived from private key: ${deployer.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
