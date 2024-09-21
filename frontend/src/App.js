// src/App.js

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
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [selectedAccount] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(selectedAccount);
        await fetchBalances(selectedAccount);  // 獲取最新餘額
        await fetchTransactions();  // 獲取交易紀錄
      } catch (error) {
        console.error("用戶拒絕了錢包連接", error);
        alert("用戶拒絕了錢包連接");
      }
    } else {
      alert("請安裝 MetaMask 錢包！");
    }
  };
  

  const fetchBalances = async (address) => {
    await fetchTokenBalance(address);
    await fetchEthBalance(address);
  };

  const fetchTokenBalance = async (address) => {
    try {
      const response = await axios.get(`${backendUrl}/api/balance/${address}`);
      setTokenBalance(response.data.balance);  // 更新代幣餘額
    } catch (error) {
      console.error("無法獲取代幣餘額", error);
      alert("無法獲取代幣餘額");
    }
  };
  

  const fetchEthBalance = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(address);
      const formattedEthBalance = ethers.utils.formatEther(balance);
      setEthBalance(formattedEthBalance);
    } catch (error) {
      console.error("無法獲取 ETH 餘額", error);
      alert("無法獲取 ETH 餘額");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("無法獲取交易記錄", error);
      alert("無法獲取交易記錄");
    }
  };

  const handleTokenTransfer = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      alert("請填寫收款地址和金額");
      return;
    }

    if (recipient.toLowerCase() === account.toLowerCase()) {
      alert("無法將代幣轉帳給自己");
      return;
    }

    try {
      const tx = await axios.post(`${backendUrl}/api/transfer`, { to: recipient, amount });
      alert(`代幣轉帳成功，交易哈希: ${tx.data.txHash}`);
      await fetchBalances(account);
      await fetchTransactions(); // 重新獲取交易紀錄
    } catch (error) {
      console.error("代幣轉帳失敗", error);
      alert("代幣轉帳失敗");
    }
  };

  const handleEthTransfer = async (e) => {
    e.preventDefault();
    if (!ethRecipient || !ethAmount) {
      alert("請填寫收款地址和金額");
      return;
    }

    if (ethRecipient.toLowerCase() === account.toLowerCase()) {
      alert("無法將 ETH 轉帳給自己");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tx = await signer.sendTransaction({
        to: ethRecipient,
        value: ethers.utils.parseEther(ethAmount)
      });
      await tx.wait();

      // 保存交易紀錄到後端
      await axios.post(`${backendUrl}/api/eth-transfer`, { to: ethRecipient, amount: ethAmount, txHash: tx.hash });
      alert(`ETH 轉帳成功，交易哈希: ${tx.hash}`);
      await fetchBalances(account);
      await fetchTransactions(); // 獲取最新交易紀錄
    } catch (error) {
      console.error("ETH 轉帳失敗", error);
      alert("ETH 轉帳失敗");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (account) {
        fetchBalances(account);
        fetchTransactions();
      }
    }, 10000);
    return () => clearInterval(interval);
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
                step="any"
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
                    {tx.txHash ? (
                      <a href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer">
                        {tx.txHash.substring(0, 10)}...
                      </a>
                    ) : (
                      'N/A'
                    )}
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
