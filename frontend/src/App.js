// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import FjcuToken from './FjcuToken.json'; // 確保此文件包含正確的 ABI

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
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // 初始化智能合約實例
  const getContract = (signer) => {
    return new ethers.Contract(contractAddress, FjcuToken.abi, signer);
  };

  // 連接錢包
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [selectedAccount] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("連接的帳戶地址:", selectedAccount); // 日誌
        setAccount(selectedAccount);
        fetchBalances(selectedAccount);
        fetchTransactions();
      } catch (error) {
        console.error("用戶拒絕了錢包連接", error);
      }
    } else {
      alert("請安裝 MetaMask 錢包！");
    }
  };

  // 獲取代幣和 ETH 餘額
  const fetchBalances = async (address) => {
    console.log("正在獲取餘額，地址:", address); // 日誌
    fetchTokenBalance(address);
    fetchEthBalance(address);
  };

  // 獲取 ERC-20 代幣餘額
  const fetchTokenBalance = async (address) => {
    try {
      const response = await axios.get(`${backendUrl}/api/balance/${address}`);
      console.log("代幣餘額回應:", response.data); // 日誌
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
      const formattedBalance = ethers.utils.formatEther(balance);
      console.log("ETH 餘額:", formattedBalance); // 日誌
      setEthBalance(formattedBalance);
    } catch (error) {
      console.error("無法獲取 ETH 餘額", error);
    }
  };

  // 獲取交易記錄
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/transactions`);
      console.log("交易記錄回應:", response.data); // 日誌
      setTransactions(response.data);
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
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = getContract(signer);

      console.log("發起代幣轉帳:", { recipient, amount }); // 日誌

      // 調用智能合約的 transfer 函數
      const tx = await contract.transfer(recipient, ethers.utils.parseUnits(amount, 18));
      console.log("交易發送，交易哈希:", tx.hash); // 日誌
      await tx.wait();

      alert(`代幣轉帳成功，交易哈希: ${tx.hash}`);
      fetchBalances(account);
      fetchTransactions();

      // 通知後端保存代幣交易記錄
      await axios.post(`${backendUrl}/api/token-transfer`, { to: recipient, amount, txHash: tx.hash });
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
      const signer = provider.getSigner(); // 使用用戶的 Signer
      console.log("發起 ETH 轉帳:", { ethRecipient, ethAmount });

      const tx = await signer.sendTransaction({
        to: ethRecipient,
        value: ethers.utils.parseEther(ethAmount)
      });
      console.log("ETH 交易發送，交易哈希:", tx.hash);
      await tx.wait();

      alert(`ETH 轉帳成功，交易哈希: ${tx.hash}`);
      fetchEthBalance(account);
      fetchTransactions();

      // 通知後端保存 ETH 轉帳記錄
      await axios.post(`${backendUrl}/api/eth-transfer`, { to: ethRecipient, amount: ethAmount, txHash: tx.hash });
    } catch (error) {
      console.error("ETH 轉帳失敗", error);
      alert("ETH 轉帳失敗");
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
                    <a href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer">
                      {tx.txHash ? `${tx.txHash.substring(0, 10)}...` : 'N/A'}
                    </a>
                  </td>
                  <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}</td>
                  <td>{tx.type}</td> {/* 現在應該顯示代幣符號，例如 FJCU */}
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
