const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const testUSDTAddress = process.env.TEST_USDT_ADDRESS;
  const recipient = process.argv[2];
  const amount = process.argv[3] || "1000";
  const network = process.argv[4] || "hardhat";
  
  if (!testUSDTAddress) {
    console.error("TEST_USDT_ADDRESS not set in environment");
    process.exit(1);
  }
  
  if (!recipient) {
    console.error("Usage: node scripts/mintTokens.js <recipient_address> [amount] [network]");
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
  
  console.log("Minting tokens from:", signer.address);
  console.log("Recipient:", recipient);
  console.log("Amount:", amount, "tUSDT");
  console.log("Network:", network);
  
  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = TestUSDT.attach(testUSDTAddress).connect(signer);
  
  const decimals = await testUSDT.decimals();
  const amountWei = hre.ethers.parseUnits(amount, decimals);
  
  const tx = await testUSDT.mint(recipient, amountWei);
  console.log("\nTransaction hash:", tx.hash);
  await tx.wait();
  console.log("Tokens minted successfully!");
  
  const balance = await testUSDT.balanceOf(recipient);
  console.log("New balance:", hre.ethers.formatUnits(balance, decimals), "tUSDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


