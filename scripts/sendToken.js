// 載入環境變量
require('dotenv').config({ path: '../.env' });

// 從 ethers 中導入所需的函數和類
const { parseUnits, formatEther, Contract, Wallet, JsonRpcProvider } = require('ethers');

// 載入合約的 ABI
const FjcuToken = require('../artifacts/contracts/FjcuToken.sol/FjcuToken.json');

// 環境變量
const infuraUrl = `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;  // Arbitrum 測試網 URL
const provider = new JsonRpcProvider(infuraUrl);  // 使用 JsonRpcProvider
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// 合約地址和 ABI
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new Contract(contractAddress, FjcuToken.abi, wallet);

// 發送代幣的函數
const sendToken = async (recipientAddress, amount) => {
    try {
        // 顯示錢包地址和餘額
        const walletAddress = wallet.address;
        console.log(`錢包地址: ${walletAddress}`);

        const balance = await provider.getBalance(walletAddress);
        console.log(`ETH 餘額: ${formatEther(balance)} ETH`);

        // 顯示接收地址和發送金額
        console.log(`接收地址: ${recipientAddress}`);
        console.log(`發送金額: ${amount} 個代幣`);

        // 將金額轉換為代幣的最小單位（假設代幣有18位小數）
        const tokenAmount = parseUnits(amount.toString(), 18);
        console.log(`發送金額（代幣最小單位）: ${tokenAmount.toString()}`);

        // 發送交易
        const tx = await contract.transfer(recipientAddress, tokenAmount);
        console.log(`交易已發送，交易哈希: ${tx.hash}`);

        // 等待交易確認
        await tx.wait();
        console.log(`交易已確認，交易哈希: ${tx.hash}`);
    } catch (error) {
        console.error('發送代幣失敗:', error);
    }
};

// 要發送代幣的接收地址和金額
const recipientAddress = '0x234c7e05e05bba48307990a078442376a1825024';  // 替換為接收錢包地址
const amountToSend = 10000;  // 發送 10,000 個代幣

// 執行發送代幣
sendToken(recipientAddress, amountToSend);
