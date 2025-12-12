const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log("Deploying LaterPayV2 only to network:", network);
  
  let deployer;
  if (network === "sepolia" || network === "bsc" || network === "bscTestnet") {
    if (!process.env.PRIVATE_KEY) {
      console.error("\n❌ Error: PRIVATE_KEY not set in environment!");
      console.error("Please set PRIVATE_KEY in .env file");
      process.exit(1);
    }
    const provider = new hre.ethers.JsonRpcProvider(
      network === "sepolia" 
        ? (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org")
        : network === "bsc"
        ? (process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/")
        : (process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/")
    );
    deployer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else {
    [deployer] = await hre.ethers.getSigners();
  }
  
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  const testUSDTAddress = process.env.TEST_USDT_ADDRESS || "0xb9f8a75b9FAB0b02F7BCe900eA072CdCD537c232";
  console.log("Using TestUSDT address:", testUSDTAddress);
  
  // Deploy LaterPayV2 only
  console.log("\nDeploying LaterPayV2...");
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = await LaterPayV2.connect(deployer).deploy(testUSDTAddress, deployer.address, {
    gasLimit: 5000000,
  });
  await laterPay.waitForDeployment();
  const laterPayAddress = await laterPay.getAddress();
  console.log("LaterPayV2 deployed to:", laterPayAddress);
  
  console.log("\n=== Deployment Summary ===");
  console.log("TestUSDT Address:", testUSDTAddress);
  console.log("LaterPayV2 Address:", laterPayAddress);
  console.log("Deployer Address:", deployer.address);
  
  // Save addresses to .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }
  
  if (envContent.includes("LATER_PAY_ADDRESS=")) {
    envContent = envContent.replace(/LATER_PAY_ADDRESS=.*/g, `LATER_PAY_ADDRESS=${laterPayAddress}`);
  } else {
    envContent += `\nLATER_PAY_ADDRESS=${laterPayAddress}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("\nAddresses saved to .env file!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

