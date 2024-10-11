// frontend/src/SmartContractEditor.js

import React from 'react';

const SmartContractEditor = ({ code, onCodeChange }) => {
  return (
    <div className="smart-contract-editor">
      <label>智能合約代碼:</label>
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        rows="15"
        cols="80"
        placeholder="在此輸入或粘貼您的 Solidity 智能合約代碼..."
      />
    </div>
  );
};

export default SmartContractEditor;
