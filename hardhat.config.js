require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    goerli: {
      url: `https://goerli.infura.io/key/${process.env.INFURA_PROJECT_ID}`,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    sepolia: {
        url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,  // 替換為Infura 項目 ID
        accounts: [`0x${process.env.PRIVATE_KEY}`]  // 替換為MetaMask 私鑰
    },
    arbitrumSepolia: {
        url: `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,  // Infura 的 Arbitrum Sepolia 網絡 RPC URL
        accounts: [`0x${process.env.PRIVATE_KEY}`],
        chainId: 421614,  // Arbitrum Sepolia 測試網的鏈 ID
    },
    mainnet: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
        gasPrice: "auto",  // 手動設置 gasPrice 來控制費用
    },
  },
};