// server.js

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const FjcuToken = require('./FjcuToken.json');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  txHash: String,
  timestamp: { type: Date, default: Date.now },
  type: String,
}));

const provider = new ethers.providers.JsonRpcProvider(`https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, FjcuToken.abi, wallet);

// 獲取代幣餘額
app.get('/api/balance/:address', async (req, res) => {
  try {
    const address = ethers.utils.getAddress(req.params.address.toLowerCase());  // 確保地址格式正確
    const balance = await contract.balanceOf(address);  // 獲取代幣餘額
    res.json({ balance: ethers.utils.formatUnits(balance, 18) });  // 返回格式化的餘額
  } catch (error) {
    console.error('獲取餘額失敗:', error);
    res.status(500).json({ error: '無法獲取餘額', details: error.message });
  }
});

// 轉帳代幣
app.post('/api/transfer', async (req, res) => {
  const { to, amount } = req.body;
  try {
    const checksummedTo = ethers.utils.getAddress(to.toLowerCase());

    const parsedAmount = ethers.utils.parseUnits(amount, 18);
    const tx = await contract.transfer(checksummedTo, parsedAmount);
    const receipt = await tx.wait();  // 等待交易確認

    const transaction = new Transaction({
      from: wallet.address,
      to: checksummedTo,
      amount: parseFloat(amount),
      txHash: receipt.transactionHash,  // 使用交易回執中的哈希
      type: 'FJCU',
    });
    await transaction.save();

    res.json({ txHash: receipt.transactionHash });  // 返回交易哈希
  } catch (error) {
    console.error('轉帳失敗:', error);
    res.status(500).json({ error: '轉帳失敗', details: error.message });
  }
});

// 轉帳 ETH
app.post('/api/eth-transfer', async (req, res) => {
  const { to, amount } = req.body;
  try {
    const checksummedTo = ethers.utils.getAddress(to.toLowerCase());

    // 確保不會轉帳給自己
    if (checksummedTo === wallet.address) {
      return res.status(400).json({ error: '無法將 ETH 轉帳給自己' });
    }

    const parsedAmount = ethers.utils.parseEther(amount);
    const tx = await wallet.sendTransaction({
      to: checksummedTo,
      value: parsedAmount,
    });
    const receipt = await tx.wait();  // 等待交易確認

    const transaction = new Transaction({
      from: wallet.address,
      to: checksummedTo,
      amount: parseFloat(amount),
      txHash: receipt.transactionHash,
      type: 'ETH',
    });
    await transaction.save();

    res.json({ txHash: receipt.transactionHash });  // 返回交易哈希
  } catch (error) {
    console.error('ETH 轉帳失敗:', error);
    res.status(500).json({ error: 'ETH 轉帳失敗', details: error.message });
  }
});

// 獲取交易記錄
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('獲取交易記錄失敗:', error);
    res.status(500).json({ error: '無法獲取交易記錄', details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
