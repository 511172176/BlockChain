require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const FjcuToken = require('./FjcuToken.json'); // ABI 文件

mongoose.set('strictQuery', true);  // 或者 false 根據需求

const app = express();
app.use(cors());
app.use(express.json());

// 連接 MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// 定義交易記錄模型
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  txHash: String,
  timestamp: { type: Date, default: Date.now },
}));

// 設置 ethers 提供者和簽名者
const provider = new ethers.JsonRpcProvider(`https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, FjcuToken.abi, wallet);

// API 路由

// 獲取代幣餘額
app.get('/api/balance/:address', async (req, res) => {
  try {
    const balance = await contract.balanceOf(req.params.address);
    res.json({ balance: ethers.utils.formatUnits(balance, 18) });
  } catch (error) {
    res.status(500).json({ error: '無法獲取餘額' });
  }
});

// 轉帳代幣
app.post('/api/transfer', async (req, res) => {
  const { to, amount } = req.body;
  try {
    const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 18));
    await tx.wait();

    // 保存交易記錄到資料庫
    const transaction = new Transaction({
      from: wallet.address,
      to,
      amount,
      txHash: tx.hash,
    });
    await transaction.save();

    res.json({ txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: '轉帳失敗' });
  }
});

// 獲取交易記錄
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
