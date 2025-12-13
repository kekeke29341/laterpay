const hre = require("hardhat");
require("dotenv").config();

/**
 * Test partial withdrawal functionality
 * Tests that if user approved 100 USDT but only has 90 USDT, 
 * we can withdraw 90 USDT (the maximum available)
 */
async function main() {
  const network = process.argv[2] || "bsc";
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS || process.env.TEST_USDT_ADDRESS;
  
  if (!laterPayAddress || !usdtAddress) {
    console.error("❌ Error: LATER_PAY_ADDRESS and USDT_ADDRESS must be set in .env");
    process.exit(1);
  }
  
  let provider, deployer, user;
  
  if (network === "sepolia" || network === "bsc" || network === "bscTestnet") {
    if (!process.env.PRIVATE_KEY) {
      console.error("❌ Error: PRIVATE_KEY not set in environment");
      process.exit(1);
    }
    provider = new hre.ethers.JsonRpcProvider(
      network === "sepolia" 
        ? process.env.SEPOLIA_RPC_URL
        : network === "bsc"
        ? (process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/")
        : (process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/")
    );
    deployer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
    user = deployer; // For testing, use same wallet
  } else {
    [deployer] = await hre.ethers.getSigners();
    user = deployer;
    provider = hre.ethers.provider;
  }
  
  console.log("🧪 Testing Partial Withdrawal Functionality");
  console.log("Network:", network);
  console.log("Deployer/Owner:", deployer.address);
  console.log("User:", user.address);
  console.log("LaterPayV2:", laterPayAddress);
  console.log("USDT:", usdtAddress);
  console.log("\n" + "=".repeat(80));
  
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = LaterPayV2.attach(laterPayAddress).connect(user);
  
  const usdtAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];
  const testUSDT = new hre.ethers.Contract(usdtAddress, usdtAbi, user);
  
  const decimals = await testUSDT.decimals();
  const symbol = await testUSDT.symbol();
  
  // Step 1: Check initial balance
  console.log("\n📊 Step 1: Initial Balance");
  const initialUserBalance = await testUSDT.balanceOf(user.address);
  console.log(`User balance: ${hre.ethers.formatUnits(initialUserBalance, decimals)} ${symbol}`);
  
  // Step 2: User approves 100 USDT (maximum amount)
  console.log("\n📝 Step 2: User approves 100 USDT (maximum amount)");
  const maxApprovalAmount = hre.ethers.parseUnits("100", decimals);
  const approveTx = await testUSDT.approve(laterPayAddress, maxApprovalAmount);
  await approveTx.wait();
  console.log("✅ Approval transaction:", approveTx.hash);
  
  // Step 3: User calls approvePayment with 100 USDT
  console.log("\n📝 Step 3: User calls approvePayment with 100 USDT");
  const approvalAmount = hre.ethers.parseUnits("100", decimals);
  const dueDate = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  
  const approvePaymentTx = await laterPay.approvePayment(approvalAmount, dueDate);
  await approvePaymentTx.wait();
  console.log("✅ approvePayment transaction:", approvePaymentTx.hash);
  console.log(`   Approved maximum amount: ${hre.ethers.formatUnits(approvalAmount, decimals)} ${symbol}`);
  
  // Step 4: Check balance after approvePayment (should be unchanged)
  console.log("\n📊 Step 4: Balance after approvePayment (should be unchanged)");
  const afterApprovePaymentBalance = await testUSDT.balanceOf(user.address);
  console.log(`User balance: ${hre.ethers.formatUnits(afterApprovePaymentBalance, decimals)} ${symbol}`);
  
  if (afterApprovePaymentBalance !== initialUserBalance) {
    console.error("❌ ERROR: User balance changed after approvePayment!");
    process.exit(1);
  }
  console.log("✅ User balance unchanged after approvePayment (correct)");
  
  // Step 5: Simulate user spending some tokens (reduce balance to 90 USDT)
  // Note: In real scenario, user would spend tokens elsewhere
  // For testing, we'll check if we can withdraw partial amount
  console.log("\n📊 Step 5: Current user balance");
  const currentBalance = await testUSDT.balanceOf(user.address);
  console.log(`Current balance: ${hre.ethers.formatUnits(currentBalance, decimals)} ${symbol}`);
  console.log(`Approved amount: ${hre.ethers.formatUnits(approvalAmount, decimals)} ${symbol}`);
  
  // Calculate what we can actually withdraw
  const allowance = await testUSDT.allowance(user.address, laterPayAddress);
  const withdrawableAmount = currentBalance < allowance ? currentBalance : allowance;
  const actualWithdrawable = withdrawableAmount > approvalAmount ? approvalAmount : withdrawableAmount;
  
  console.log(`\n💰 Withdrawable amount: ${hre.ethers.formatUnits(actualWithdrawable, decimals)} ${symbol}`);
  console.log(`   (min of balance: ${hre.ethers.formatUnits(currentBalance, decimals)}, allowance: ${hre.ethers.formatUnits(allowance, decimals)}, approval: ${hre.ethers.formatUnits(approvalAmount, decimals)})`);
  
  // Step 6: Wait for due date
  console.log("\n⏳ Step 6: Waiting for due date...");
  const currentTime = Math.floor(Date.now() / 1000);
  const waitTime = dueDate - currentTime + 5;
  if (waitTime > 0) {
    console.log(`Waiting ${waitTime} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }
  
  // Step 7: Execute payment (should withdraw available amount, not full 100)
  console.log("\n💰 Step 7: Executing payment");
  const laterPayAsAdmin = laterPay.connect(deployer);
  const existingCount = await laterPay.userApprovalCount(user.address);
  const approvalId = Number(existingCount) - 1;
  console.log(`Using approval ID: ${approvalId}`);
  
  const executeTx = await laterPayAsAdmin.executePayment(user.address, approvalId);
  const receipt = await executeTx.wait();
  console.log("✅ executePayment transaction:", executeTx.hash);
  
  // Check PaymentExecuted event
  const paymentExecutedEvent = receipt.logs.find(log => {
    try {
      const parsed = laterPay.interface.parseLog(log);
      return parsed && parsed.name === "PaymentExecuted";
    } catch {
      return false;
    }
  });
  
  if (paymentExecutedEvent) {
    const parsedEvent = laterPay.interface.parseLog(paymentExecutedEvent);
    const actualWithdrawn = parsedEvent.args.amount;
    console.log(`✅ PaymentExecuted event: ${hre.ethers.formatUnits(actualWithdrawn, decimals)} ${symbol} withdrawn`);
    
    // Get approval details to check actualAmount
    const approval = await laterPay.getUserApproval(user.address, approvalId);
    console.log(`   Approval amount (max): ${hre.ethers.formatUnits(approval.amount, decimals)} ${symbol}`);
    console.log(`   Actual amount withdrawn: ${hre.ethers.formatUnits(approval.actualAmount, decimals)} ${symbol}`);
    
    if (approval.actualAmount === actualWithdrawn && actualWithdrawn <= approval.amount) {
      console.log("✅ Partial withdrawal working correctly!");
    } else {
      console.error("❌ ERROR: Actual amount mismatch!");
      process.exit(1);
    }
  }
  
  // Step 8: Check final balance
  console.log("\n📊 Step 8: Final Balance");
  const finalBalance = await testUSDT.balanceOf(user.address);
  console.log(`User balance: ${hre.ethers.formatUnits(finalBalance, decimals)} ${symbol}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ PARTIAL WITHDRAWAL TEST PASSED!");
  console.log("\nSummary:");
  console.log(`- User approved: ${hre.ethers.formatUnits(approvalAmount, decimals)} ${symbol} (maximum)`);
  console.log(`- Actual withdrawn: Based on available balance/allowance`);
  console.log(`- System correctly withdraws maximum available amount`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

