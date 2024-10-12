// frontend/src/ContractAnalyzer.js

import React from 'react';
import PropTypes from 'prop-types';
import './App.css'; // 引入新的 CSS 文件

const ContractAnalyzer = ({ result }) => {
  const { safe, vulnerabilities, errors } = result;

  return (
    <div className="contract-analyzer">
      <h3>檢測結果:</h3>
      {safe ? (
        <p className="safe">合約狀態: <strong>安全</strong></p>
      ) : (
        <p className="unsafe">合約狀態: <strong>不安全</strong></p>
      )}

      {Array.isArray(vulnerabilities) && vulnerabilities.length > 0 && (
        <div className="vulnerabilities">
          <h4>檢測到的漏洞:</h4>
          <ul>
            {vulnerabilities.map((vuln, index) => (
              <li key={index}>{vuln}</li>
            ))}
          </ul>
        </div>
      )}

      
    </div>
  );
};

ContractAnalyzer.propTypes = {
  result: PropTypes.shape({
    safe: PropTypes.bool.isRequired,
    vulnerabilities: PropTypes.arrayOf(PropTypes.string),
    errors: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default ContractAnalyzer;
