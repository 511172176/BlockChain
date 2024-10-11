require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const FjcuToken = require('./FjcuToken.json'); // 確保此文件包含正確的 ABI
const { spawn, spawnSync } = require('child_process'); // 使用 spawn 和 spawnSync
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // 用於生成唯一文件名
const os = require('os'); // 用於獲取用戶主目錄

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

// 新增智能合約檢測 API 端點
app.post('/api/analyze-contract', async (req, res) => {
  const { code } = req.body;

  // 增加日誌輸出以確認接收到的代碼
  console.log('接收到的合約代碼:', code);

  if (!code) {
    return res.status(400).json({ error: '缺少智能合約代碼' });
  }

  // 定義臨時目錄的絕對路徑，使用單斜杠或雙反斜杠
  const tempDir = 'C:/temp_contracts';
  // 或者使用雙反斜杠
  // const tempDir = 'C:\\temp_contracts';

  try {
    // 確保臨時目錄存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`創建臨時目錄: ${tempDir}`);
    }

    // 生成唯一的臨時文件名
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const contractFilename = `Contract_${uniqueId}.sol`;
    const contractPath = path.resolve(tempDir, contractFilename);
    console.log(`合約文件路徑: ${contractPath}`);

    // 寫入合約代碼，使用 UTF-8 編碼
    fs.writeFileSync(contractPath, code, 'utf8');
    console.log(`合約代碼已寫入臨時文件: ${contractPath}`);

    // 確認寫入的代碼內容
    const writtenCode = fs.readFileSync(contractPath, 'utf8');
    console.log('寫入的合約代碼內容:', writtenCode);

    // 定義 Slither 和 Solc 的絕對路徑
    // 確保這裡的路徑是正確的，並替換為實際路徑
    const slitherPath = 'C:/Users/ae887/AppData/Local/Programs/Python/Python312/Scripts/slither.exe'; // 替換為實際路徑
    const solcPath = 'C:/Solidity/solc.exe'; // 替換為實際路徑

    // 檢查 Slither 和 Solc 的版本
    const slitherVersion = spawnSync(slitherPath, ['--version']);
    const solcVersion = spawnSync(solcPath, ['--version']);

    if (slitherVersion.error) {
      console.error('Slither 無法運行:', slitherVersion.error);
      return res.status(500).json({ error: 'Slither 無法運行', details: slitherVersion.error.message });
    }

    if (solcVersion.error) {
      console.error('Solc 無法運行:', solcVersion.error);
      return res.status(500).json({ error: 'Solc 無法運行', details: solcVersion.error.message });
    }

    console.log('Slither version:', slitherVersion.stdout.toString().trim());
    console.log('Solc version:', solcVersion.stdout.toString().trim());

    // 使用 Slither 分析合約，移除 '--allow-paths' 參數
    const slither = spawn(slitherPath, [contractPath, '--solc', solcPath], { cwd: tempDir });

    let stdout = '';
    let stderr = '';

    slither.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    slither.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    slither.on('close', (code) => {
      console.log('Slither exit code:', code);
      console.log('Slither stdout:', stdout);
      console.log('Slither stderr:', stderr);

      // 在 Windows 上，-1 會被轉換為 4294967295，將其映射為 1
      if (code === 4294967295) {
        code = 1;
      }

      if (code === 1) {
        // Slither 發現漏洞，這不是一個真正的錯誤
        console.log('Slither 發現漏洞，進行後續解析。');

        const vulnerabilities = [];
        const errors = [];

        // 定義正則表達式來提取漏洞信息
        const versionIssueRegex = /Version constraint ([^\s]+) contains known severe issues/;
        const immutableRegex = /(\w+)\.owner.*should be immutable/;

        // 將 stdout 分割為行
        const lines = stdout.split('\n');

        lines.forEach(line => {
          // 匹配版本問題
          const versionIssueMatch = line.match(versionIssueRegex);
          if (versionIssueMatch) {
            const [_, versionConstraint] = versionIssueMatch;
            vulnerabilities.push(`Version Constraint Issue: ${versionConstraint}`);
          }

          // 匹配 immutable 警告
          const immutableMatch = line.match(immutableRegex);
          if (immutableMatch) {
            const [_, contractName] = immutableMatch;
            vulnerabilities.push(`Immutable Variable Issue: ${contractName}.owner should be immutable`);
          }
        });

        // 檢查是否有 Slither 的錯誤輸出
        if (stderr && stderr.trim() !== '') {
          console.warn(`Slither 警告/錯誤輸出: ${stderr}`);
          // 可以選擇將這些錯誤添加到 `errors` 陣列
          errors.push(stderr.trim());
        }

        // 判斷分析是否安全
        const analysis = {
          safe: vulnerabilities.length === 0 && errors.length === 0,
          vulnerabilities: vulnerabilities,
          errors: errors,
        };

        // 清理臨時文件
        fs.unlinkSync(contractPath);
        console.log(`臨時文件已清理: ${contractPath}`);

        // 返回分析結果
        res.json(analysis);

      } else if (code >= 2) {
        // 真正的錯誤
        console.error(`執行 Slither 時出錯: ${stderr}`);
        // 清理臨時文件
        fs.unlinkSync(contractPath);
        console.log(`臨時文件已清理: ${contractPath}`);
        return res.status(500).json({ error: '智能合約檢測失敗', details: stderr });
      } else if (code === 0) {
        // Slither 未發現任何漏洞
        console.log('Slither 未發現任何漏洞。');

        const analysis = {
          safe: true,
          vulnerabilities: [],
          errors: [],
        };

        // 清理臨時文件
        fs.unlinkSync(contractPath);
        console.log(`臨時文件已清理: ${contractPath}`);

        // 返回分析結果
        res.json(analysis);
      } else {
        // 未預期的退出碼
        console.error(`Slither 出現未預期的退出碼: ${code}`);
        // 清理臨時文件
        fs.unlinkSync(contractPath);
        console.log(`臨時文件已清理: ${contractPath}`);
        return res.status(500).json({ error: '智能合約檢測失敗', details: '未預期的 Slither 退出碼' });
      }
    });

    slither.on('error', (err) => {
      console.error('無法啟動 Slither 進程:', err);
      // 清理臨時文件
      fs.unlinkSync(contractPath);
      console.log(`臨時文件已清理: ${contractPath}`);
      return res.status(500).json({ error: '無法啟動 Slither 進程', details: err.message });
    });

  } catch (error) {
    console.error('智能合約檢測出錯:', error);
    res.status(500).json({ error: '智能合約檢測失敗', details: error.message });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`後端服務運行在 http://localhost:${PORT}`);
});
