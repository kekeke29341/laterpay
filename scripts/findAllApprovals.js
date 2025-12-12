const hre = require("hardhat");
require("dotenv").config();

/**
 * Find all approvals across all users (limited search)
 * Note: This is inefficient for large numbers of users
 * In production, use events or off-chain indexing
 */
async function main() {
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const network = process.argv[2] || "bsc";
  
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
  
  console.log("Searching for approvals on network:", network);
  console.log("LaterPay contract:", laterPayAddress);
  
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = LaterPayV2.attach(laterPayAddress).connect(provider);
  
  const usdtAddress = await laterPay.paymentToken();
  const usdtAbi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
  const usdtContract = new hre.ethers.Contract(usdtAddress, usdtAbi, provider);
  const decimals = await usdtContract.decimals();
  const symbol = await usdtContract.symbol();
  
  console.log("\nNote: This script searches known addresses. For production, use events or indexing.");
  console.log("=".repeat(80));
  
  // Get owner address
  const owner = await laterPay.owner();
  console.log("\nOwner address:", owner);
  
  // Check owner's approvals
  const ownerCount = await laterPay.userApprovalCount(owner);
  if (ownerCount > 0n) {
    console.log(`\nOwner has ${ownerCount} approval(s):`);
    for (let i = 0; i < Number(ownerCount); i++) {
      const approval = await laterPay.getUserApproval(owner, i);
      const currentTime = Math.floor(Date.now() / 1000);
      const canExecute = !approval.executed && Number(approval.dueDate) <= currentTime;
      
      console.log(`\n  Approval ID: ${i}`);
      console.log(`    Amount: ${hre.ethers.formatUnits(approval.amount, decimals)} ${symbol}`);
      console.log(`    Approved at: ${new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP')}`);
      console.log(`    Due date: ${new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP')}`);
      console.log(`    Status: ${approval.executed ? '✅ Executed' : canExecute ? '✅ Ready to execute' : '⏳ Pending'}`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\nTo check a specific user's approvals, use:");
  console.log(`node scripts/listApprovals.js <user_address> ${network}`);
  console.log("\nTo execute a payment, use:");
  console.log(`node scripts/executePayment.js <user_address> <approval_id> ${network}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

