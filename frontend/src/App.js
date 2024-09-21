// eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import FjcuToken from './FjcuToken.json'; 

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState([]);

  // eslint-disable-next-line
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [selectedAccount] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(selectedAccount);
        fetchBalance(selectedAccount);
        fetchTransactions();
      } catch (error) {
        console.error("用戶拒絕了錢包連接");
      }
    } else {
      alert("請安裝 MetaMask 錢包！");
    }
  };

  const fetchBalance = async (address) => {
    try {
      const response = await axios.get(`${backendUrl}/api/balance/${address}`);
      setBalance(response.data.balance);
    } catch (error) {
      console.error("無法獲取餘額");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("無法獲取交易記錄");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      alert("請填寫收款地址和金額");
      return;
    }

    try {
      const tx = await axios.post(`${backendUrl}/api/transfer`, { to: recipient, amount });
      alert(`轉帳成功，交易哈希: ${tx.data.txHash}`);
      fetchBalance(account);
      fetchTransactions();
    } catch (error) {
      console.error("轉帳失敗", error);
      alert("轉帳失敗");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Fjcu Token DApp</h1>
      {!account ? (
        <button onClick={connectWallet}>連接錢包</button>
      ) : (
        <div>
          <p>帳戶地址: {account}</p>
          <p>餘額: {balance} FJCU</p>
          <h2>轉帳 FJCU</h2>
          <form onSubmit={handleTransfer}>
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
          <h2>交易記錄</h2>
          <table border="1" cellPadding="10">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Tx Hash</th>
                <th>Timestamp</th>
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