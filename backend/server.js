const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: '../.env' });

const app = express();

// 確認環境變量
console.log('INFURA_PROJECT_ID:', process.env.INFURA_PROJECT_ID);
console.log('PRIVATE_KEY is set:', process.env.PRIVATE_KEY ? 'Yes' : 'No');
console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS);

// CORS 設置
const corsOptions = {
  origin: 'http://localhost:3000',
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
// 這裡需要替換為正確的 ABI 路徑
const FjcuToken = require('./FjcuToken.json');
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, FjcuToken.abi, wallet);

// 獲取代幣名稱和符號
let tokenName = 'ERC20';
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

// 新增智能合約檢測 API 端點
app.post('/api/analyze-contract', async (req, res) => {
  const { code } = req.body;

  console.log('接收到的合約代碼:', code);

  if (!code) {
    return res.status(400).json({ error: '缺少智能合約代碼' });
  }

  const tempDir = 'C:/temp_contracts';
  let contractPath;

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`創建臨時目錄: ${tempDir}`);
    }

    const uniqueId = crypto.randomBytes(16).toString('hex');
    const contractFilename = `Contract_${uniqueId}.sol`;
    contractPath = path.resolve(tempDir, contractFilename);
    console.log(`合約文件路徑: ${contractPath}`);

    fs.writeFileSync(contractPath, code, 'utf8');
    console.log(`合約代碼已寫入臨時文件: ${contractPath}`);

    const writtenCode = fs.readFileSync(contractPath, 'utf8');
    console.log('寫入的合約代碼內容:', writtenCode);

    const slitherPath = 'C:/Users/ae887/AppData/Local/Programs/Python/Python312/Scripts/slither.exe';
    const solcPath = 'C:/Solidity/solc.exe';

    const slitherVersion = spawnSync(slitherPath, ['--version']);
    const solcVersion = spawnSync(solcPath, ['--version']);

    if (slitherVersion.error) {
      console.error('Slither 無法運行:', slitherVersion.error);
      fs.unlinkSync(contractPath);
      return res.status(500).json({ error: 'Slither 無法運行', details: slitherVersion.error.message });
    }

    if (solcVersion.error) {
      console.error('Solc 無法運行:', solcVersion.error);
      fs.unlinkSync(contractPath);
      return res.status(500).json({ error: 'Solc 無法運行', details: solcVersion.error.message });
    }

    console.log('Slither version:', slitherVersion.stdout.toString().trim());
    console.log('Solc version:', solcVersion.stdout.toString().trim());

    const slitherReportPath = path.join(tempDir, `slither_report_${uniqueId}.json`);
    const slither = spawn(slitherPath, [contractPath, '--json', slitherReportPath, '--solc', solcPath], { cwd: tempDir });

    slither.on('close', async (code) => {
      try {
        if (!fs.existsSync(slitherReportPath)) {
          fs.unlinkSync(contractPath);
          return res.status(500).json({ error: '合約內容有誤' });
        }

        const report = await fs.readJson(slitherReportPath);
        console.log('Slither JSON 報告:', JSON.stringify(report, null, 2));

        if (!report.results) {
          console.warn('Slither 報告中未找到 results 字段。');
        }

        let vulnerabilities = [];
        if (report.results && Array.isArray(report.results.vulnerabilities)) {
          vulnerabilities = report.results.vulnerabilities.map(vuln => vuln.check);
        } else if (report.results && Array.isArray(report.results.detectors)) {
          vulnerabilities = report.results.detectors.map(detector => detector.check);
        } else {
          console.warn('Slither 報告中未找到 vulnerabilities 或 detectors 字段。');
        }

        vulnerabilities = vulnerabilities.filter(vuln => typeof vuln === 'string');
        const uniqueVulnerabilities = [...new Set(vulnerabilities)];
        const safe = uniqueVulnerabilities.length === 0;

        const analysis = {
          safe: safe,
          vulnerabilities: uniqueVulnerabilities,
          errors: [],
        };

        if (code >= 2) {
          if (report.error) {
            analysis.errors.push(report.error);
          } else {
            analysis.errors.push('Slither 運行時出現未知錯誤。');
          }
        }

        fs.unlinkSync(contractPath);
        fs.unlinkSync(slitherReportPath);
        console.log(`臨時文件已清理: ${contractPath}`);
        console.log(`報告文件已清理: ${slitherReportPath}`);

        res.json(analysis);
      } catch (err) {
        console.error('處理 Slither 分析結果時出錯:', err);
        if (fs.existsSync(contractPath)) fs.unlinkSync(contractPath);
        if (fs.existsSync(slitherReportPath)) fs.unlinkSync(slitherReportPath);
        return res.status(500).json({ error: '智能合約檢測過程中出錯', details: err.message });
      }
    });

    slither.on('error', (err) => {
      console.error('無法啟動 Slither 進程:', err);
      if (fs.existsSync(contractPath)) fs.unlinkSync(contractPath);
      console.log(`臨時文件已清理: ${contractPath}`);
      return res.status(500).json({ error: '無法啟動 Slither 進程', details: err.message });
    });

  } catch (error) {
    console.error('智能合約檢測出錯:', error);
    if (contractPath && fs.existsSync(contractPath)) fs.unlinkSync(contractPath);
    return res.status(500).json({ error: '智能合約檢測失敗', details: error.message });
  }
});


// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
