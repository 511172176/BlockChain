const hre = require("hardhat");

async function main() {
  const initialSupply = hre.ethers.utils.parseUnits('21000000', 18);  // 21,000,000 tokens with 18 decimals

  // 獲取合約工廠
  const FjcuToken = await hre.ethers.getContractFactory("FjcuToken");

  // 使用 estimateGas() 來估算部署所需的 Gas
  const gasEstimate = await hre.ethers.provider.estimateGas(FjcuToken.getDeployTransaction(initialSupply));
  console.log("Estimated gas cost:", gasEstimate.toString());

  // 部署合約並指定 gasLimit 和 gasPrice
  const gasPrice = hre.ethers.utils.parseUnits('5', 'gwei');  // 設置 gasPrice 為 15 Gwei
  const gasLimit = gasEstimate.add(10000);  // 在估算值上增加 20,000 Gas 作為緩衝

  // 部署合約
  const fjcuToken = await FjcuToken.deploy(initialSupply, { gasPrice, gasLimit });

  await fjcuToken.deployed();

  console.log("FjcuToken deployed to:", fjcuToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
