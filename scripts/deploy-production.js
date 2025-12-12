const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Production deployment script
 * Uses existing USDT token address instead of deploying TestUSDT
 */
async function main() {
  const network = hre.network.name;
  console.log("Deploying to network:", network);
  
  let deployer;
  if (network === "bsc" || network === "bscTestnet") {
    if (!process.env.PRIVATE_KEY) {
      console.error("\n❌ Error: PRIVATE_KEY not set in environment!");
      console.error("Please set PRIVATE_KEY in .env file");
      process.exit(1);
    }
    const provider = new hre.ethers.JsonRpcProvider(
      network === "bsc" 
        ? (process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/")
        : (process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/")
    );
    deployer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else {
    [deployer] = await hre.ethers.getSigners();
  }
  
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
  
  // Get USDT address from environment or use default for BSC
  const usdtAddress = process.env.USDT_ADDRESS || process.env.PAYMENT_TOKEN_ADDRESS;
  
  if (!usdtAddress) {
    console.error("\n❌ Error: USDT address not set!");
    console.error("Please set USDT_ADDRESS or PAYMENT_TOKEN_ADDRESS in .env file");
    console.error("\nExample for BSC:");
    console.error("USDT_ADDRESS=0x55d398326f99059ff775485246999027b3197955");
    process.exit(1);
  }
  
  console.log("\nUsing existing USDT token address:", usdtAddress);
  
  // Verify USDT contract exists
  try {
    const usdtAbi = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];
    const usdtContract = new hre.ethers.Contract(usdtAddress, usdtAbi, deployer);
    const symbol = await usdtContract.symbol();
    const decimals = await usdtContract.decimals();
    console.log(`✓ USDT contract verified: ${symbol} (${decimals} decimals)`);
  } catch (error) {
    console.error("\n❌ Error: Could not verify USDT contract at address:", usdtAddress);
    console.error("Error:", error.message);
    console.error("Please check the address is correct for the network:", network);
    process.exit(1);
  }
  
  // Deploy LaterPayV2 only (no TestUSDT deployment)
  console.log("\nDeploying LaterPayV2...");
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = await LaterPayV2.connect(deployer).deploy(usdtAddress, deployer.address);
  await laterPay.waitForDeployment();
  const laterPayAddress = await laterPay.getAddress();
  console.log("LaterPayV2 deployed to:", laterPayAddress);
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network);
  console.log("USDT Address:", usdtAddress);
  console.log("LaterPayV2 Address:", laterPayAddress);
  console.log("Deployer Address:", deployer.address);
  
  // Save addresses to .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }
  
  // Update or add addresses
  if (envContent.includes("USDT_ADDRESS=")) {
    envContent = envContent.replace(/USDT_ADDRESS=.*/g, `USDT_ADDRESS=${usdtAddress}`);
  } else {
    envContent += `\nUSDT_ADDRESS=${usdtAddress}`;
  }
  
  if (envContent.includes("LATER_PAY_ADDRESS=")) {
    envContent = envContent.replace(/LATER_PAY_ADDRESS=.*/g, `LATER_PAY_ADDRESS=${laterPayAddress}`);
  } else {
    envContent += `\nLATER_PAY_ADDRESS=${laterPayAddress}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("\nAddresses saved to .env file!");
  console.log("\n=== Frontend Configuration ===");
  console.log("Set the following environment variables in Vercel:");
  console.log(`VITE_TEST_USDT_ADDRESS=${usdtAddress}`);
  console.log(`VITE_LATER_PAY_ADDRESS=${laterPayAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

