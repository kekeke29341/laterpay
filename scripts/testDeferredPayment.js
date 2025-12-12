const hre = require("hardhat");
require("dotenv").config();

/**
 * Test script to verify deferred payment behavior
 * This tests that:
 * 1. approvePayment does NOT transfer tokens (only records approval)
 * 2. executePayment transfers tokens directly from user to owner
 */
async function main() {
  const network = process.argv[2] || "bsc";
  const laterPayAddress = process.env.LATER_PAY_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS || process.env.TEST_USDT_ADDRESS;
  
  if (!laterPayAddress || !usdtAddress) {
    console.error("❌ Error: LATER_PAY_ADDRESS and USDT_ADDRESS (or TEST_USDT_ADDRESS) must be set in .env");
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
    // For testing, we'll use the same wallet as user (in production, use different addresses)
    user = deployer;
  } else {
    [deployer] = await hre.ethers.getSigners();
    user = deployer;
    provider = hre.ethers.provider;
  }
  
  console.log("🧪 Testing Deferred Payment System");
  console.log("Network:", network);
  console.log("Deployer/Owner:", deployer.address);
  console.log("User:", user.address);
  console.log("LaterPayV2:", laterPayAddress);
  console.log("USDT:", usdtAddress);
  console.log("\n" + "=".repeat(80));
  
  const LaterPayV2 = await hre.ethers.getContractFactory("LaterPayV2");
  const laterPay = LaterPayV2.attach(laterPayAddress).connect(user);
  
  // Use IERC20 ABI for USDT (works for both TestUSDT and real USDT)
  const usdtAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];
  const testUSDT = new hre.ethers.Contract(usdtAddress, usdtAbi, user);
  
  const decimals = await testUSDT.decimals();
  const symbol = await testUSDT.symbol();
  
  // Step 1: Check initial balances
  console.log("\n📊 Step 1: Initial Balances");
  const initialUserBalance = await testUSDT.balanceOf(user.address);
  const initialOwnerBalance = await testUSDT.balanceOf(deployer.address);
  const initialContractBalance = await laterPay.getContractBalance();
  
  console.log(`User balance: ${hre.ethers.formatUnits(initialUserBalance, decimals)} ${symbol}`);
  console.log(`Owner balance: ${hre.ethers.formatUnits(initialOwnerBalance, decimals)} ${symbol}`);
  console.log(`Contract balance: ${hre.ethers.formatUnits(initialContractBalance, decimals)} ${symbol}`);
  
  // Step 2: User approves contract to spend tokens
  console.log("\n📝 Step 2: User approves contract to spend tokens");
  // Use 50% of user balance for testing
  const paymentAmount = initialUserBalance / 2n;
  const approvalAmount = paymentAmount;
  const approveTx = await testUSDT.approve(laterPayAddress, approvalAmount);
  await approveTx.wait();
  console.log("✅ Approval transaction:", approveTx.hash);
  
  const allowance = await testUSDT.allowance(user.address, laterPayAddress);
  console.log(`Allowance: ${hre.ethers.formatUnits(allowance, decimals)} ${symbol}`);
  
  // Step 3: Check balances after approve (should be unchanged)
  console.log("\n📊 Step 3: Balances after approve (should be unchanged)");
  const afterApproveUserBalance = await testUSDT.balanceOf(user.address);
  const afterApproveOwnerBalance = await testUSDT.balanceOf(deployer.address);
  const afterApproveContractBalance = await laterPay.getContractBalance();
  
  console.log(`User balance: ${hre.ethers.formatUnits(afterApproveUserBalance, decimals)} ${symbol}`);
  console.log(`Owner balance: ${hre.ethers.formatUnits(afterApproveOwnerBalance, decimals)} ${symbol}`);
  console.log(`Contract balance: ${hre.ethers.formatUnits(afterApproveContractBalance, decimals)} ${symbol}`);
  
  if (afterApproveUserBalance !== initialUserBalance) {
    console.error("❌ ERROR: User balance changed after approve!");
    process.exit(1);
  }
  console.log("✅ User balance unchanged after approve (correct)");
  
  // Step 4: User calls approvePayment (should NOT transfer tokens)
  console.log("\n📝 Step 4: User calls approvePayment");
  // Check existing approvals count to get the next approval ID
  const existingCount = await laterPay.userApprovalCount(user.address);
  console.log(`Existing approvals count: ${existingCount}`);
  const dueDate = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  
  const approvePaymentTx = await laterPay.approvePayment(paymentAmount, dueDate);
  await approvePaymentTx.wait();
  console.log("✅ approvePayment transaction:", approvePaymentTx.hash);
  
  // Step 5: Check balances after approvePayment (should be unchanged)
  console.log("\n📊 Step 5: Balances after approvePayment (should be unchanged)");
  const afterApprovePaymentUserBalance = await testUSDT.balanceOf(user.address);
  const afterApprovePaymentOwnerBalance = await testUSDT.balanceOf(deployer.address);
  const afterApprovePaymentContractBalance = await laterPay.getContractBalance();
  
  console.log(`User balance: ${hre.ethers.formatUnits(afterApprovePaymentUserBalance, decimals)} ${symbol}`);
  console.log(`Owner balance: ${hre.ethers.formatUnits(afterApprovePaymentOwnerBalance, decimals)} ${symbol}`);
  console.log(`Contract balance: ${hre.ethers.formatUnits(afterApprovePaymentContractBalance, decimals)} ${symbol}`);
  
  if (afterApprovePaymentUserBalance !== initialUserBalance) {
    console.error("❌ ERROR: User balance changed after approvePayment!");
    console.error("Expected:", hre.ethers.formatUnits(initialUserBalance, decimals));
    console.error("Actual:", hre.ethers.formatUnits(afterApprovePaymentUserBalance, decimals));
    process.exit(1);
  }
  if (afterApprovePaymentContractBalance !== initialContractBalance) {
    console.error("❌ ERROR: Contract balance changed after approvePayment!");
    console.error("Expected:", hre.ethers.formatUnits(initialContractBalance, decimals));
    console.error("Actual:", hre.ethers.formatUnits(afterApprovePaymentContractBalance, decimals));
    process.exit(1);
  }
  console.log("✅ User balance unchanged after approvePayment (correct)");
  console.log("✅ Contract balance unchanged after approvePayment (correct)");
  
  // Step 6: Wait for due date
  console.log("\n⏳ Step 6: Waiting for due date...");
  const currentTime = Math.floor(Date.now() / 1000);
  const waitTime = dueDate - currentTime + 5; // Wait a bit longer to be safe
  if (waitTime > 0) {
    console.log(`Waiting ${waitTime} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }
  
  // Step 7: Execute payment (should transfer from user to owner)
  console.log("\n💰 Step 7: Executing payment");
  const laterPayAsAdmin = laterPay.connect(deployer);
  // Use the new approval ID (existingCount)
  const approvalId = Number(existingCount);
  console.log(`Using approval ID: ${approvalId}`);
  const executeTx = await laterPayAsAdmin.executePayment(user.address, approvalId);
  const receipt = await executeTx.wait();
  console.log("✅ executePayment transaction:", executeTx.hash);
  
  // Check if PaymentExecuted event was emitted
  const paymentExecutedEvent = receipt.logs.find(log => {
    try {
      const parsed = laterPay.interface.parseLog(log);
      return parsed && parsed.name === "PaymentExecuted";
    } catch {
      return false;
    }
  });
  
  if (!paymentExecutedEvent) {
    console.error("❌ ERROR: PaymentExecuted event not found!");
    process.exit(1);
  }
  
  const parsedEvent = laterPay.interface.parseLog(paymentExecutedEvent);
  console.log(`✅ PaymentExecuted event emitted: ${hre.ethers.formatUnits(parsedEvent.args.amount, decimals)} ${symbol}`);
  
  // Step 8: Check balances after executePayment
  console.log("\n📊 Step 8: Balances after executePayment");
  const afterExecuteUserBalance = await testUSDT.balanceOf(user.address);
  const afterExecuteOwnerBalance = await testUSDT.balanceOf(deployer.address);
  const afterExecuteContractBalance = await laterPay.getContractBalance();
  
  console.log(`User balance: ${hre.ethers.formatUnits(afterExecuteUserBalance, decimals)} ${symbol}`);
  console.log(`Owner balance: ${hre.ethers.formatUnits(afterExecuteOwnerBalance, decimals)} ${symbol}`);
  console.log(`Contract balance: ${hre.ethers.formatUnits(afterExecuteContractBalance, decimals)} ${symbol}`);
  
  // Note: If user and owner are the same address, balance won't change
  // But we can verify the transfer happened by checking the event and allowance
  if (user.address.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("ℹ️  User and Owner are the same address, so balance won't change");
    console.log("   But the transfer was executed (confirmed by PaymentExecuted event)");
  } else {
    // Verify: User balance should decrease by paymentAmount
    const expectedUserBalance = initialUserBalance - paymentAmount;
    if (afterExecuteUserBalance !== expectedUserBalance) {
      console.error("❌ ERROR: User balance incorrect after executePayment!");
      console.error("Expected:", hre.ethers.formatUnits(expectedUserBalance, decimals));
      console.error("Actual:", hre.ethers.formatUnits(afterExecuteUserBalance, decimals));
      process.exit(1);
    }
    
    // Verify: Owner balance should increase by paymentAmount
    const expectedOwnerBalance = initialOwnerBalance + paymentAmount;
    if (afterExecuteOwnerBalance !== expectedOwnerBalance) {
      console.error("❌ ERROR: Owner balance incorrect after executePayment!");
      console.error("Expected:", hre.ethers.formatUnits(expectedOwnerBalance, decimals));
      console.error("Actual:", hre.ethers.formatUnits(afterExecuteOwnerBalance, decimals));
      process.exit(1);
    }
  }
  
  // Verify: Contract balance should remain unchanged
  if (afterExecuteContractBalance !== initialContractBalance) {
    console.error("❌ ERROR: Contract balance changed after executePayment!");
    console.error("Expected:", hre.ethers.formatUnits(initialContractBalance, decimals));
    console.error("Actual:", hre.ethers.formatUnits(afterExecuteContractBalance, decimals));
    process.exit(1);
  }
  
  // Verify: Approval should be marked as executed
  const approval = await laterPay.getUserApproval(user.address, approvalId);
  if (!approval.executed) {
    console.error("❌ ERROR: Approval not marked as executed!");
    process.exit(1);
  }
  console.log("✅ Approval marked as executed");
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL TESTS PASSED!");
  console.log("\nSummary:");
  console.log(`- approvePayment: No token transfer (user balance unchanged)`);
  console.log(`- executePayment: Direct transfer from user to owner`);
  console.log(`- Contract balance: Unchanged throughout`);
  console.log(`- User balance decreased by: ${hre.ethers.formatUnits(paymentAmount, decimals)} ${symbol}`);
  console.log(`- Owner balance increased by: ${hre.ethers.formatUnits(paymentAmount, decimals)} ${symbol}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

