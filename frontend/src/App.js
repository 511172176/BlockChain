import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

function App() {
  const [account, setAccount] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [ethRecipient, setEthRecipient] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [transactions, setTransactions] = useState([]);

  // 環境變量
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // 連接錢包
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [selectedAccount] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(selectedAccount);
        fetchBalances(selectedAccount);
        fetchTransactions();
      } catch (error) {
        console.error("用戶拒絕了錢包連接");
      }
    } else {
      alert("請安裝 MetaMask 錢包！");
    }
  };

  // 獲取代幣和 ETH 餘額
  const fetchBalances = async (address) => {
    fetchTokenBalance(address);
    fetchEthBalance(address);
  };

  // 獲取 ERC-20 代幣餘額
  const fetchTokenBalance = async (address) => {
    try {
      const response = await axios.get(`${backendUrl}/api/balance/${address}`);
      console.log(`獲取到的代幣餘額: ${response.data.balance} FJCU`);
      setTokenBalance(response.data.balance);
    } catch (error) {
      console.error("無法獲取代幣餘額", error);
    }
  };

  // 獲取 ETH 餘額
  const fetchEthBalance = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(address);
      console.log(`獲取到的 ETH 餘額: ${ethers.utils.formatEther(balance)} ETH`);
      setEthBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error("無法獲取 ETH 餘額", error);
    }
  };

  // 獲取交易記錄
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/transactions`);
      setTransactions(response.data);
      console.log(`Fetched transactions:`, response.data);
    } catch (error) {
      console.error("無法獲取交易記錄", error);
    }
  };

  // 處理 ERC-20 代幣轉帳
  const handleTokenTransfer = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      alert("請填寫收款地址和金額");
      return;
    }

    try {
      const tx = await axios.post(`${backendUrl}/api/transfer`, { to: recipient, amount });
      console.log(`代幣轉帳成功，交易哈希: ${tx.data.txHash}`);
      alert(`代幣轉帳成功，交易哈希: ${tx.data.txHash}`);
      fetchBalances(account);
      fetchTransactions();
    } catch (error) {
      console.error("代幣轉帳失敗", error);
      alert("代幣轉帳失敗");
    }
  };

  // 處理 ETH 轉帳
  const handleEthTransfer = async (e) => {
    e.preventDefault();
    if (!ethRecipient || !ethAmount) {
      alert("請填寫收款地址和金額");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      console.log(`Sending ETH: ${ethAmount} ETH to ${ethRecipient}`);
      const tx = await signer.sendTransaction({
        to: ethRecipient,
        value: ethers.utils.parseEther(ethAmount)
      });
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log(`Transaction confirmed: ${tx.hash}`);
      alert(`ETH 轉帳成功，交易哈希: ${tx.hash}`);
      fetchBalances(account);
      fetchTransactions();

      // 通知後端保存 ETH 轉帳記錄
      console.log(`Notifying backend to save ETH transfer: ${tx.hash}`);
      await axios.post(`${backendUrl}/api/eth-transfer`, { to: ethRecipient, amount: ethAmount, txHash: tx.hash });
      console.log(`Backend notified for ETH transfer: ${tx.hash}`);
    } catch (error) {
      console.error("ETH 轉帳失敗", error);
      alert("ETH 轉帳失敗");
    }
  };

  // 自動刷新餘額（每 10 秒）
  useEffect(() => {
    if (account) {
      fetchBalances(account);
      const interval = setInterval(() => {
        fetchBalances(account);
      }, 10000); // 每 10 秒刷新一次
      return () => clearInterval(interval);
    }
  }, [account]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Fjcu Token DApp</h1>
      {!account ? (
        <button onClick={connectWallet}>連接錢包</button>
      ) : (
        <div>
          <p>帳戶地址: {account}</p>
          <p>代幣餘額: {tokenBalance} FJCU</p>
          <p>ETH 餘額: {ethBalance} ETH</p>

          <h2>轉帳 FJCU 代幣</h2>
          <form onSubmit={handleTokenTransfer}>
            <div>
              <label>收款地址:</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                style={{ width: '400px' }}
              />
            </div>
            <div>
              <label>金額:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
              />
            </div>
            <button type="submit">轉帳</button>
          </form>

          <h2>轉帳 ETH</h2>
          <form onSubmit={handleEthTransfer}>
            <div>
              <label>收款地址:</label>
              <input
                type="text"
                value={ethRecipient}
                onChange={(e) => setEthRecipient(e.target.value)}
                required
                style={{ width: '400px' }}
              />
            </div>
            <div>
              <label>金額 (ETH):</label>
              <input
                type="number"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                required
                min="0"
                step="0.0001"
              />
            </div>
            <button type="submit">轉帳 ETH</button>
          </form>

          <h2>交易記錄</h2>
          <table border="1" cellPadding="10">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Tx Hash</th>
                <th>Timestamp</th>
                <th>類型</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx._id}>
                  <td>{tx.from}</td>
                  <td>{tx.to}</td>
                  <td>{tx.amount}</td>
                  <td>
                    <a href={`https://sepolia-explorer.arbitrum.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer">
                      {tx.txHash.substring(0, 10)}...
                    </a>
                  </td>
                  <td>{new Date(tx.timestamp).toLocaleString()}</td>
                  <td>{tx.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
