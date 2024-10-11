// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import FjcuToken from './FjcuToken.json'; // 確保此文件包含正確的 ABI
import './App.css'; // 確保引入 CSS
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faExchangeAlt, faCoins } from '@fortawesome/free-solid-svg-icons';
import { faEthereum } from '@fortawesome/free-brands-svg-icons'; // 正確導入 faEthereum
import ClipLoader from "react-spinners/ClipLoader"; // 引入加載指示器
import SmartContractEditor from './SmartContractEditor'; // 智能合約編輯器
import ContractAnalyzer from './ContractAnalyzer'; // 智能合約分析器

function App() {
  // 既有的狀態
  const [account, setAccount] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [ethRecipient, setEthRecipient] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false); // 添加加載狀態
  const [contractCode, setContractCode] = useState(''); // 智能合約代碼
  const [analysisResult, setAnalysisResult] = useState(null); // 分析結果

  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  const totalPages = Math.ceil(transactions.length / entriesPerPage);

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
        setLoading(true);
        await fetchBalances(selectedAccount);
        await fetchTransactions();
        setLoading(false);
      } catch (error) {
        console.error("用戶拒絕了錢包連接", error);
        setLoading(false);
      }
    } else {
      alert("請安裝 MetaMask 錢包！");
    }
  };

  // 獲取代幣和 ETH 餘額
  const fetchBalances = async (address) => {
    console.log("正在獲取餘額，地址:", address); // 日誌
    await fetchTokenBalance(address);
    await fetchEthBalance(address);
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
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = getContract(signer);

      console.log("發起代幣轉帳:", { recipient, amount }); // 日誌

      // 調用智能合約的 transfer 函數
      const tx = await contract.transfer(recipient, ethers.utils.parseUnits(amount, 18));
      console.log("交易發送，交易哈希:", tx.hash); // 日誌
      await tx.wait();

      alert(`代幣轉帳成功，交易哈希: ${tx.hash}`);
      await fetchBalances(account);
      await fetchTransactions();

      // 通知後端保存代幣交易記錄
      await axios.post(`${backendUrl}/api/token-transfer`, { to: recipient, amount, txHash: tx.hash });
      setLoading(false);
    } catch (error) {
      console.error("代幣轉帳失敗", error);
      alert("代幣轉帳失敗");
      setLoading(false);
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
      setLoading(true);
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
      await fetchEthBalance(account);
      await fetchTransactions();

      // 通知後端保存 ETH 轉帳記錄
      await axios.post(`${backendUrl}/api/eth-transfer`, { to: ethRecipient, amount: ethAmount, txHash: tx.hash });
      setLoading(false);
    } catch (error) {
      console.error("ETH 轉帳失敗", error);
      alert("ETH 轉帳失敗");
      setLoading(false);
    }
  };

  // 獲取當前頁面的交易記錄
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentTransactions = transactions.slice(indexOfFirstEntry, indexOfLastEntry);

  // 處理頁碼變更
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  // 處理下拉選單變更
  const handleSelectChange = (e) => {
    setCurrentPage(Number(e.target.value));
  };

  // 處理智能合約代碼變更
  const handleContractCodeChange = (code) => {
    setContractCode(code);
  };

  // 處理智能合約檢測
  const handleAnalyzeContract = async () => {
    if (!contractCode) {
      alert("請輸入智能合約代碼");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${backendUrl}/api/analyze-contract`, { code: contractCode });
      console.log("智能合約檢測結果:", response.data);
      setAnalysisResult(response.data);
      setLoading(false);
    } catch (error) {
      console.error("智能合約檢測失敗", error);
      // 顯示具體的錯誤信息
      const errorMessage = error.response && error.response.data && error.response.data.error 
        ? error.response.data.error 
        : "智能合約檢測失敗";
      alert(errorMessage);
      setLoading(false);
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>FJCU Token DApp <FontAwesomeIcon icon={faWallet} /></h1>
      </header>
      <div className="container">
        {!account ? (
          <button onClick={connectWallet}>
            <FontAwesomeIcon icon={faWallet} /> 連接錢包
          </button>
        ) : (
          <div>
            <div className="section">
              <p><strong>帳戶地址:</strong> {account}</p>
              <p><strong>代幣餘額:</strong> {tokenBalance} FJCU</p>
              <p><strong>ETH 餘額:</strong> {ethBalance} ETH</p>
            </div>

            <div className="section">
              <h2>轉帳 FJCU 代幣 <FontAwesomeIcon icon={faExchangeAlt} /></h2>
              <form onSubmit={handleTokenTransfer}>
                <div>
                  <label>收款地址:</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
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
                    step="1"
                  />
                </div>
                <button type="submit">
                  <FontAwesomeIcon icon={faCoins} /> 轉帳
                </button>
              </form>
            </div>

            <div className="section">
              <h2>轉帳 ETH <FontAwesomeIcon icon={faEthereum} /></h2>
              <form onSubmit={handleEthTransfer}>
                <div>
                  <label>收款地址:</label>
                  <input
                    type="text"
                    value={ethRecipient}
                    onChange={(e) => setEthRecipient(e.target.value)}
                    required
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
                <button type="submit">
                  <FontAwesomeIcon icon={faEthereum} /> 轉帳 ETH
                </button>
              </form>
            </div>

            <div className="section">
              <h2>交易記錄 <FontAwesomeIcon icon={faExchangeAlt} /></h2>
              {loading ? (
                <div className="loading-container">
                  <ClipLoader color={"#61dafb"} loading={loading} size={50} />
                </div>
              ) : (
                <>
                  <div className="table-container">
                    <table>
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
                        {currentTransactions.length > 0 ? (
                          currentTransactions.map((tx, index) => (
                            <tr key={tx.txHash || index}>
                              <td>{tx.from}</td>
                              <td>{tx.to}</td>
                              <td>{tx.amount}</td>
                              <td>
                                <a href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer">
                                  {tx.txHash ? `${tx.txHash.substring(0, 10)}...` : 'N/A'}
                                </a>
                              </td>
                              <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}</td>
                              <td>{tx.type}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6">暫無交易記錄</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 分頁控制 */}
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      上一頁
                    </button>

                    <span>第 {currentPage} 頁 / {totalPages} 頁</span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      下一頁
                    </button>

                    {/* 下拉選單選擇頁碼 */}
                    <select value={currentPage} onChange={handleSelectChange}>
                      {Array.from({ length: totalPages }, (_, index) => (
                        <option key={index + 1} value={index + 1}>
                          第 {index + 1} 頁
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* 智能合約檢測部分 */}
            <div className="section">
              <h2>智能合約檢測 <FontAwesomeIcon icon={faExchangeAlt} /></h2>
              <SmartContractEditor code={contractCode} onCodeChange={handleContractCodeChange} />
              <button onClick={handleAnalyzeContract} disabled={loading}>
                {loading ? '檢測中...' : '檢測智能合約'}
              </button>
              {analysisResult && (
                <ContractAnalyzer result={analysisResult} />
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App;
