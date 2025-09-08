在乙太坊網路上佈署合約發行ERC20標準代幣
前端結合slither檢測合約功能

## 系統流程圖

```mermaid
flowchart TD

subgraph User[使用者]
  U1[MetaMask 錢包<br/>連接帳號]
  U2[操作 DApp<br/>查詢/轉帳/分析]
end

subgraph Frontend[前端 (React)]
  F1[App.js<br/>顯示餘額 / 交易紀錄]
  F2[SmartContractEditor.jsx<br/>輸入智能合約代碼]
  F3[ContractAnalyzer.jsx<br/>顯示分析結果]
end

subgraph Backend[後端 (Express)]
  B1[/GET /api/balance/]
  B2[/POST /api/token-transfer/]
  B3[/POST /api/eth-transfer/]
  B4[/GET /api/transactions/]
  B5[/POST /api/analyze-contract/]
end

subgraph Chain[區塊鏈 (Arbitrum Sepolia)]
  C1[ERC20 合約<br/>balanceOf/transfer]
  C2[ETH 餘額查詢/轉帳]
end

subgraph DB[(MongoDB)]
  D1[(交易紀錄)]
end

subgraph Analyzer[靜態分析工具]
  S1[Slither]
  S2[Solc]
end

%% 流程連線
U1 --> F1
U2 --> F1
F1 --> B1
F1 --> B2
F1 --> B3
F1 --> B4
F2 --> B5
B1 --> C1
B2 --> C1
B3 --> C2
B4 --> D1
B2 --> D1
B3 --> D1
B5 --> S1
S1 --> S2
B5 --> F3```
