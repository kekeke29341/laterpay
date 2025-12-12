const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const testUSDTAddress = process.env.TEST_USDT_ADDRESS;
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const amount = process.argv[2];
  const dueDateDays = process.argv[3] || "1"; // days from now
  const network = process.argv[4] || "hardhat";
  
  if (!testUSDTAddress || !laterPayAddress) {
    console.error("TEST_USDT_ADDRESS and LATER_PAY_ADDRESS must be set in environment");
    process.exit(1);
  }
  
  if (!amount) {
    console.error("Usage: node scripts/approvePayment.js <amount> [days_from_now] [network]");
    console.error("Example: node scripts/approvePayment.js 100 7 sepolia");
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
  console.log("Approving payment from:", signer.address);
  console.log("Amount:", amount, "tUSDT");
  
  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = TestUSDT.attach(testUSDTAddress).connect(signer);
  
  const LaterPay = await hre.ethers.getContractFactory("LaterPay");
  const laterPay = LaterPay.attach(laterPayAddress).connect(signer);
  
  const decimals = await testUSDT.decimals();
  const amountWei = hre.ethers.parseUnits(amount, decimals);
  
  // Calculate due date
  const days = parseFloat(dueDateDays);
  // Get current block timestamp for accurate calculation
  const currentBlock = await provider.getBlock("latest");
  const dueDate = currentBlock.timestamp + Math.floor(days * 24 * 60 * 60);
  const dueDateStr = new Date(dueDate * 1000).toLocaleString('ja-JP');
  console.log("Due date:", dueDateStr);
  
  // Check allowance
  const allowance = await testUSDT.allowance(signer.address, laterPayAddress);
  if (allowance < amountWei) {
    console.log("\nApproving tokens...");
    const approveTx = await testUSDT.approve(laterPayAddress, amountWei);
    console.log("Approve transaction hash:", approveTx.hash);
    await approveTx.wait();
    console.log("Tokens approved!");
  } else {
    console.log("\nSufficient allowance already exists");
  }
  
  // Approve payment
  console.log("\nApproving payment...");
  const tx = await laterPay.approvePayment(amountWei, dueDate);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Payment approved successfully!");
  
  // Get approval count
  const count = await laterPay.userApprovalCount(signer.address);
  console.log("\nYour approval ID:", (Number(count) - 1).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

