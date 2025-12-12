const fs = require('fs');
const path = require('path');

// ABIをエクスポートするスクリプト
async function exportABI() {
  const artifactsPath = path.join(__dirname, '../artifacts/contracts');
  const abisPath = path.join(__dirname, '../frontend/src/abis');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(abisPath)) {
    fs.mkdirSync(abisPath, { recursive: true });
  }
  
  // TestUSDT ABI
  const testUSDTArtifact = require(path.join(artifactsPath, 'TestUSDT.sol/TestUSDT.json'));
  fs.writeFileSync(
    path.join(abisPath, 'TestUSDT.json'),
    JSON.stringify(testUSDTArtifact.abi, null, 2)
  );
  
  // LaterPay ABI
  const laterPayArtifact = require(path.join(artifactsPath, 'LaterPay.sol/LaterPay.json'));
  fs.writeFileSync(
    path.join(abisPath, 'LaterPay.json'),
    JSON.stringify(laterPayArtifact.abi, null, 2)
  );
  
  console.log('ABI exported successfully!');
}

exportABI().catch(console.error);

