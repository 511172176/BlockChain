// server.js

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const FjcuToken = require('./FjcuToken.json'); // ABI 文件

mongoose.set('strictQuery', true);  // 根據需求設置

//console.log('Ethers:', ethers);

const app = express();
app.use(cors());
app.use(express.json());

// 連接 MongoDB（移除已棄用的選項）
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// 定義交易記錄模型
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  txHash: String,
  timestamp: { type: Date, default: Date.now },
  type: String, // 新增類型字段
}));

// 設置 ethers 提供者和簽名者
const infuraUrl = `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
console.log(`Infura URL: ${infuraUrl}`);
const provider = new ethers.JsonRpcProvider(infuraUrl);  // 使用 JsonRpcProvider

provider.getNetwork().then(network => {
  console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
}).catch(error => {
  console.error('Failed to get network:', error);
});

const wallet = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
console.log(`Wallet Address: ${wallet.address}`);

const contractAddress = process.env.CONTRACT_ADDRESS;
console.log(`Contract Address: ${contractAddress}`);
const contract = new ethers.Contract(contractAddress, FjcuToken.abi, wallet);

// API 路由

// 獲取代幣餘額
app.get('/api/balance/:address', async (req, res) => {
  try {
    const inputAddress = req.params.address;
    console.log(`Input Address: ${inputAddress}`);
    // 使用 ethers.getAddress 確保地址格式正確
    const checksummedAddress = ethers.getAddress(inputAddress.toLowerCase());
    console.log(`Checksummed Address: ${checksummedAddress}`);
    const balance = await contract.balanceOf(checksummedAddress);
    const formattedBalance = ethers.formatUnits(balance, 18);
    console.log(`Balance for ${checksummedAddress}: ${formattedBalance} FJCU`);
    res.json({ balance: formattedBalance });
  } catch (error) {
    console.error('獲取餘額失敗:', error);
    res.status(500).json({ error: '無法獲取餘額' });
  }
});

// 轉帳代幣
app.post('/api/transfer', async (req, res) => {
  const { to, amount } = req.body;
  try {
    // 使用 ethers.getAddress 確保地址格式正確
    const checksummedTo = ethers.getAddress(to.toLowerCase());
    console.log(`Transferring ${amount} FJCU to ${checksummedTo}`);
    const tx = await contract.transfer(checksummedTo, ethers.parseUnits(amount, 18));
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Transaction confirmed: ${tx.hash}`);

    // 保存交易記錄到資料庫
    const transaction = new Transaction({
      from: wallet.address,
      to: checksummedTo,
      amount,
      txHash: tx.hash,
      type: 'FJCU', // 設定類型為 FJCU 代幣轉帳
    });
    await transaction.save();
    console.log(`Transaction saved: ${tx.hash}`);

    res.json({ txHash: tx.hash });
  } catch (error) {
    console.error('轉帳失敗:', error);
    res.status(500).json({ error: '轉帳失敗' });
  }
});

// 轉帳 ETH
app.post('/api/eth-transfer', async (req, res) => {
  const { to, amount } = req.body;
  try {
    // 使用 ethers.getAddress 確保地址格式正確
    const checksummedTo = ethers.getAddress(to.toLowerCase());
    console.log(`Transferring ${amount} ETH to ${checksummedTo}`);
    const tx = await wallet.sendTransaction({
      to: checksummedTo,
      value: ethers.parseEther(amount),
    });
    console.log(`ETH Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`ETH Transaction confirmed: ${tx.hash}`);

    // 保存交易記錄到資料庫
    const transaction = new Transaction({
      from: wallet.address,
      to: checksummedTo,
      amount,
      txHash: tx.hash,
      type: 'ETH',
    });
    await transaction.save();
    console.log(`ETH Transaction saved: ${tx.hash}`);

    res.json({ txHash: tx.hash });
  } catch (error) {
    console.error('ETH 轉帳失敗:', error);
    res.status(500).json({ error: 'ETH 轉帳失敗' });
  }
});

// 獲取交易記錄
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    console.log(`Fetched ${transactions.length} transactions`);
    res.json(transactions);
  } catch (error) {
    console.error('獲取交易記錄失敗:', error);
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
