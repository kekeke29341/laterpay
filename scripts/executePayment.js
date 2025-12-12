const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const userAddress = process.argv[2];
  const approvalId = process.argv[3];
  const network = process.argv[4] || "hardhat";
  
  if (!laterPayAddress) {
    console.error("LATER_PAY_ADDRESS must be set in environment");
    process.exit(1);
  }
  
  if (!userAddress || approvalId === undefined) {
    console.error("Usage: node scripts/executePayment.js <user_address> <approval_id> [network]");
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
  } else {
    provider = hre.ethers.provider;
    [signer] = await hre.ethers.getSigners();
  }
  console.log("Executing payment from:", signer.address);
  console.log("User address:", userAddress);
  console.log("Approval ID:", approvalId);
  
  const LaterPay = await hre.ethers.getContractFactory("LaterPay");
  const laterPay = LaterPay.attach(laterPayAddress).connect(signer);
  
  // Check if admin
  const isAdmin = await laterPay.admins(signer.address);
  const owner = await laterPay.owner();
  if (!isAdmin && signer.address !== owner) {
    console.error("Error: You are not an admin!");
    process.exit(1);
  }
  
  // Get approval details
  const approval = await laterPay.getUserApproval(userAddress, approvalId);
  const testUSDTAddress = await laterPay.paymentToken();
  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = TestUSDT.attach(testUSDTAddress).connect(provider);
  const decimals = await testUSDT.decimals();
  
  console.log("\nApproval details:");
  console.log("  Amount:", hre.ethers.formatUnits(approval.amount, decimals), "tUSDT");
  console.log("  Approved at:", new Date(Number(approval.approvedAt) * 1000).toLocaleString('ja-JP'));
  console.log("  Due date:", new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP'));
  console.log("  Executed:", approval.executed);
  
  if (approval.executed) {
    console.error("\nError: Payment already executed!");
    process.exit(1);
  }
  
  // Get current block timestamp
  const currentBlock = await provider.getBlock("latest");
  const currentTime = currentBlock.timestamp;
  if (Number(approval.dueDate) > currentTime) {
    console.error("\nError: Due date not reached yet!");
    console.error("Current time:", new Date(currentTime * 1000).toLocaleString('ja-JP'));
    console.error("Due date:", new Date(Number(approval.dueDate) * 1000).toLocaleString('ja-JP'));
    console.error("Please wait", Math.ceil((Number(approval.dueDate) - currentTime) / 60), "minutes");
    process.exit(1);
  }
  
  // Execute payment
  console.log("\nExecuting payment...");
  const tx = await laterPay.executePayment(userAddress, approvalId);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Payment executed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

