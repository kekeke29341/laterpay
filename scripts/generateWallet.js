const { ethers } = require("ethers");

async function main() {
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("=".repeat(80));
  console.log("New Wallet Generated");
  console.log("=".repeat(80));
  console.log("\nAddress:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("\n" + "=".repeat(80));
  console.log("\n⚠️  IMPORTANT: Save this private key securely!");
  console.log("Add it to your .env file as PRIVATE_KEY=" + wallet.privateKey);
  console.log("\nSend Sepolia ETH to this address:", wallet.address);
  console.log("You can get Sepolia ETH from: https://sepoliafaucet.com/");
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

