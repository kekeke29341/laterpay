const hre = require("hardhat");
require("dotenv").config();

/**
 * Emergency withdraw approval (Owner only)
 * This allows owner to withdraw even before due date
 */
async function main() {
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const userAddress = process.argv[2];
  const approvalId = process.argv[3];
  const network = process.argv[4] || "bsc";
  
  if (!laterPayAddress) {
    console.error("LATER_PAY_ADDRESS must be set in environment");
    process.exit(1);
  }
  
  if (!userAddress || approvalId === undefined) {
    console.error("Usage: node scripts/emergencyWithdraw.js <user_address> <approval_id> [network]");
    process.exit(1);
  }
  
  let provider, signer;
  
  if (network === "sepolia") {
    if (!process.env.PRIVATE_KEY) {
      console.error("PRIVATE_KEY not set in environment");
      process.exit(1);
    }
    provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else if (network === "bsc" || network === "bscTestnet") {
    if (!process.env.PRIVATE_KEY) {
      console.error("PRIVATE_KEY not set in environment");
      process.exit(1);
    }
    provider = new hre.ethers.JsonRpcProvider(
      network === "bsc" 
        ? (process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/")
        : (process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/")
    );
    signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else {
    provider = hre.ethers.provider;
    [signer] = await hre.ethers.getSigners();
  }
  
  console.log("Emergency withdraw from:", signer.address);
  console.log("User address:", userAddress);
  console.log("Approval ID:", approvalId);
  
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = LaterPayV2.attach(laterPayAddress).connect(signer);
  
  // Check if owner
  const owner = await laterPay.owner();
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("Error: Only owner can use emergency withdraw!");
    console.error("Your address:", signer.address);
    console.error("Owner address:", owner);
    process.exit(1);
  }
  
  // Get approval details
  const approval = await laterPay.getUserApproval(userAddress, approvalId);
  const usdtAddress = await laterPay.paymentToken();
  const usdtAbi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
  const usdtContract = new hre.ethers.Contract(usdtAddress, usdtAbi, provider);
  const decimals = await usdtContract.decimals();
  const symbol = await usdtContract.symbol();
  
  console.log("\nApproval details:");
  console.log("  Amount:", hre.ethers.formatUnits(approval.amount, decimals), symbol);
  console.log("  Approved at:", new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP'));
  console.log("  Due date:", new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP'));
  console.log("  Executed:", approval.executed);
  
  if (approval.executed) {
    console.error("\nError: Payment already executed!");
    process.exit(1);
  }
  
  // Check contract balance
  const contractBalance = await laterPay.getContractBalance();
  console.log("\nContract balance:", hre.ethers.formatUnits(contractBalance, decimals), symbol);
  
  if (contractBalance < approval.amount) {
    console.error("\nError: Insufficient contract balance!");
    process.exit(1);
  }
  
  // Execute emergency withdraw
  console.log("\n⚠️  Executing EMERGENCY WITHDRAW (Owner only, bypasses due date)...");
  const tx = await laterPay.emergencyWithdrawApproval(userAddress, approvalId);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("\n✅ Emergency withdraw executed successfully!");
  console.log(`${hre.ethers.formatUnits(approval.amount, decimals)} ${symbol} transferred to owner address: ${owner}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

