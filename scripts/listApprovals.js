const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const userAddress = process.argv[2];
  const network = process.argv[3] || "hardhat";
  
  if (!laterPayAddress) {
    console.error("LATER_PAY_ADDRESS must be set in environment");
    process.exit(1);
  }
  
  let provider;
  
  if (network === "sepolia") {
    provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  } else if (network === "bsc" || network === "bscTestnet") {
    provider = new hre.ethers.JsonRpcProvider(
      network === "bsc" 
        ? (process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/")
        : (process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/")
    );
  } else {
    provider = hre.ethers.provider;
  }
  
  const signer = (network === "sepolia" || network === "bsc" || network === "bscTestnet") && process.env.PRIVATE_KEY
    ? new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider)
    : (await hre.ethers.getSigners())[0];
  
  const targetAddress = userAddress || signer.address;
  
  console.log("Listing approvals for:", targetAddress);
  
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = LaterPayV2.attach(laterPayAddress).connect(provider);
  
  const usdtAddress = await laterPay.paymentToken();
  const usdtAbi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
  const usdtContract = new hre.ethers.Contract(usdtAddress, usdtAbi, provider);
  const decimals = await usdtContract.decimals();
  const symbol = await usdtContract.symbol();
  
  const count = await laterPay.userApprovalCount(targetAddress);
  console.log("\nTotal approvals:", count.toString());
  
  if (count === 0n) {
    console.log("No approvals found.");
    return;
  }
  
  console.log("\nApproval List:");
  console.log("=" .repeat(80));
  
  for (let i = 0; i < Number(count); i++) {
    const approval = await laterPay.getUserApproval(targetAddress, i);
    const currentTime = Math.floor(Date.now() / 1000);
    const canExecute = !approval.executed && Number(approval.dueDate) <= currentTime;
    
    console.log(`\nApproval ID: ${i}`);
    console.log(`  Amount: ${hre.ethers.formatUnits(approval.amount, decimals)} ${symbol}`);
    console.log(`  Approved at: ${new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP')}`);
    console.log(`  Due date: ${new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP')}`);
    console.log(`  Status: ${approval.executed ? '✅ Executed' : canExecute ? '✅ Ready to execute' : '⏳ Pending'}`);
  }
  
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

