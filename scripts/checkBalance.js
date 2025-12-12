const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const network = process.argv[3] || "hardhat";
  const provider = network === "sepolia" 
    ? new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
    : hre.ethers.provider;
  
  const signer = network === "sepolia" && process.env.PRIVATE_KEY
    ? new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider)
    : (await hre.ethers.getSigners())[0];
  
  const address = process.argv[2] || signer.address;
  
  console.log("Checking balance for:", address);
  
  // ETH balance
  const ethBalance = await provider.getBalance(address);
  console.log("\nETH Balance:", hre.ethers.formatEther(ethBalance), "ETH");
  
  // TestUSDT balance (if address provided)
  const testUSDTAddress = process.env.TEST_USDT_ADDRESS;
  if (testUSDTAddress) {
    try {
      const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
      const testUSDT = TestUSDT.attach(testUSDTAddress).connect(provider);
      const decimals = await testUSDT.decimals();
      const balance = await testUSDT.balanceOf(address);
      console.log("tUSDT Balance:", hre.ethers.formatUnits(balance, decimals), "tUSDT");
    } catch (error) {
      console.log("tUSDT contract not found or not deployed");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

