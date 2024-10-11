// frontend/src/ContractAnalyzer.js

import React from 'react';

const ContractAnalyzer = ({ result }) => {
  return (
    <div className="contract-analyzer">
      <h3>檢測結果:</h3>
      {result.safe ? (
        <p className="safe">合約狀態: <strong>安全</strong></p>
      ) : (
        <p className="unsafe">合約狀態: <strong>不安全</strong></p>
      )}

      {result.vulnerabilities.length > 0 && (
        <div className="vulnerabilities">
          <h4>檢測到的漏洞:</h4>
          <ul>
            {result.vulnerabilities.map((vuln, index) => (
              <li key={index}>{vuln}</li>
            ))}
          </ul>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="errors">
          <h4>編譯錯誤 / 警告:</h4>
          <ul>
            {result.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContractAnalyzer;
