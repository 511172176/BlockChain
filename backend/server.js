// backend/server.js

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const FjcuToken = require('./FjcuToken.json'); // 確保此文件包含正確的 ABI

const app = express();

// 確認環境變量
console.log('INFURA_PROJECT_ID:', process.env.INFURA_PROJECT_ID);
console.log('PRIVATE_KEY is set:', process.env.PRIVATE_KEY ? 'Yes' : 'No');
console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS);

// CORS 設置
const corsOptions = {
  origin: 'http://localhost:3000', // 前端地址
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json()); // 解析 JSON 請求體

// 連接 MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// 定義交易記錄模型
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  txHash: String,
  timestamp: { type: Date, default: Date.now },
  type: String, // 代幣符號或 'ETH'
}));

// 構建 Infura RPC URL
const infuraUrl = `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, FjcuToken.abi, wallet);

// 獲取代幣名稱和符號
let tokenName = 'ERC20'; // 默認值
let tokenSymbol = 'ERC20';

const initializeContract = async () => {
  try {
    tokenName = await contract.name();
    tokenSymbol = await contract.symbol();
    console.log(`代幣名稱: ${tokenName}, 代幣符號: ${tokenSymbol}`);
  } catch (error) {
    console.error('獲取代幣名稱和符號失敗:', error);
  }
};

initializeContract();

// API 路由

// 獲取代幣餘額
app.get('/api/balance/:address', async (req, res) => {
  try {
    console.log(`獲取地址 ${req.params.address} 的代幣餘額`);
    const balance = await contract.balanceOf(req.params.address);
    const formattedBalance = ethers.utils.formatUnits(balance, 18);
    console.log(`地址 ${req.params.address} 的餘額: ${formattedBalance}`);
    res.json({ balance: formattedBalance });
  } catch (error) {
    console.error(`獲取代幣餘額出錯:`, error);
    res.status(500).json({ error: '無法獲取代幣餘額' });
  }
});

// 保存代幣轉帳記錄
app.post('/api/token-transfer', async (req, res) => {
  const { to, amount, txHash } = req.body;
  try {
    if (!to || !amount || !txHash) {
      return res.status(400).json({ error: '缺少必要的轉帳信息' });
    }
    console.log(`保存代幣轉帳記錄: 到 ${to}, 金額 ${amount}, 交易哈希 ${txHash}`);
    const transaction = new Transaction({
      from: wallet.address, // 或從前端傳遞
      to,
      amount,
      txHash,
      type: tokenSymbol, // 使用代幣符號，例如 FJCU
    });
    await transaction.save();
    console.log(`交易記錄保存成功: ${txHash}`);
    res.json({ txHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '代幣轉帳記錄保存失敗' });
  }
});

// 轉帳 ETH 記錄
app.post('/api/eth-transfer', async (req, res) => {
  const { to, amount, txHash } = req.body;
  try {
    if (!to || !amount || !txHash) {
      return res.status(400).json({ error: '缺少必要的轉帳信息' });
    }
    console.log(`保存 ETH 轉帳記錄: 到 ${to}, 金額 ${amount}, 交易哈希 ${txHash}`);
    const transaction = new Transaction({
      from: wallet.address, // 或從前端傳遞
      to,
      amount,
      txHash,
      type: 'ETH',
    });
    await transaction.save();
    console.log(`ETH 轉帳記錄保存成功: ${txHash}`);
    res.json({ txHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ETH 轉帳記錄保存失敗' });
  }
});

// 獲取交易記錄
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    console.log("獲取交易記錄:", transactions);
    res.json(transactions);
  } catch (error) {
    console.error("獲取交易記錄出錯:", error);
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
