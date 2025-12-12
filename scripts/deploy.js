const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log("Deploying to network:", network);
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (network === "sepolia" && balance === 0n) {
    console.error("\n❌ Error: Insufficient balance for deployment!");
    console.error("Please send Sepolia ETH to:", deployer.address);
    console.error("Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }

  // Deploy TestUSDT
  console.log("\nDeploying TestUSDT...");
  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy(deployer.address);
  await testUSDT.waitForDeployment();
  const testUSDTAddress = await testUSDT.getAddress();
  console.log("TestUSDT deployed to:", testUSDTAddress);

  // Deploy LaterPay
  console.log("\nDeploying LaterPay...");
  const LaterPay = await hre.ethers.getContractFactory("LaterPay");
  const laterPay = await LaterPay.deploy(testUSDTAddress, deployer.address);
  await laterPay.waitForDeployment();
  const laterPayAddress = await laterPay.getAddress();
  console.log("LaterPay deployed to:", laterPayAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("TestUSDT Address:", testUSDTAddress);
  console.log("LaterPay Address:", laterPayAddress);
  console.log("Deployer Address:", deployer.address);
  
  // Save addresses to .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }
  
  // Update or add addresses
  if (envContent.includes("TEST_USDT_ADDRESS=")) {
    envContent = envContent.replace(/TEST_USDT_ADDRESS=.*/g, `TEST_USDT_ADDRESS=${testUSDTAddress}`);
  } else {
    envContent += `\nTEST_USDT_ADDRESS=${testUSDTAddress}`;
  }
  
  if (envContent.includes("LATER_PAY_ADDRESS=")) {
    envContent = envContent.replace(/LATER_PAY_ADDRESS=.*/g, `LATER_PAY_ADDRESS=${laterPayAddress}`);
  } else {
    envContent += `\nLATER_PAY_ADDRESS=${laterPayAddress}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("\nAddresses saved to .env file!");
  console.log("\nYou can now use the following commands:");
  console.log("  npm run balance [address] - Check balance");
  console.log("  npm run mint <address> <amount> - Mint tokens");
  console.log("  npm run approve <amount> [days] - Approve payment");
  console.log("  npm run list [address] - List approvals");
  console.log("  npm run execute <user_address> <approval_id> - Execute payment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

