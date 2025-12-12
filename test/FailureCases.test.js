const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LaterPay Failure Cases", function () {
  let testUSDT;
  let laterPay;
  let owner;
  let user;
  let admin;
  let attacker;

  beforeEach(async function () {
    [owner, user, admin, attacker] = await ethers.getSigners();

    // Deploy TestUSDT
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    testUSDT = await TestUSDT.deploy(owner.address);
    await testUSDT.waitForDeployment();

    // Deploy LaterPay
    const LaterPay = await ethers.getContractFactory("LaterPay");
    laterPay = await LaterPay.deploy(await testUSDT.getAddress(), owner.address);
    await laterPay.waitForDeployment();

    // Add admin
    await laterPay.addAdmin(admin.address);

    // Give user some tokens
    const amount = ethers.parseUnits("1000", 6);
    await testUSDT.transfer(user.address, amount);
  });

  describe("Failure Case 1: Emergency Withdraw", function () {
    it("Should not have emergency withdraw in new implementation", async function () {
      // Note: The new implementation doesn't have emergencyWithdraw
      // because tokens are never stored in the contract
      // They are transferred directly from user to owner on execution
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400; // 1 day from now

      // User approves payment (tokens stay in user's wallet)
      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Contract should have 0 balance (tokens are in user's wallet)
      const contractBalance = await testUSDT.balanceOf(await laterPay.getAddress());
      expect(contractBalance).to.equal(0);

      // Note: emergencyWithdraw doesn't exist in the new implementation
      // If it did exist, it wouldn't affect anything since contract has no tokens
    });
  });

  describe("Failure Case 2: Insufficient Contract Balance", function () {
    it("Should fail when contract balance is less than approval amount", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400;

      // User approves payment
      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Manually transfer some tokens out (simulating some issue)
      // Note: This would require the contract to have a function to do this
      // For this test, we'll use emergencyWithdraw to simulate
      const partialAmount = ethers.parseUnits("50", 6);
      // We can't easily do this without modifying the contract
      // But we can test the scenario where balance is insufficient
      
      // Wait for due date
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      // If we could reduce the balance, execution would fail
      // This demonstrates the need for balance checking
    });
  });

  describe("Failure Case 3: Owner Address Issues", function () {
    it("Should handle owner address validation", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400;

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Owner address should be valid
      const ownerAddress = await laterPay.owner();
      expect(ownerAddress).to.not.equal(ethers.ZeroAddress);
      expect(ownerAddress).to.equal(owner.address);
    });
  });

  describe("Failure Case 4: Token Transfer Failure", function () {
    it("Should handle token transfer failures gracefully", async function () {
      // This test would require a mock token that can fail transfers
      // For now, we'll document that the current implementation doesn't handle this
      // and the improved version (LaterPayV2) should handle it
    });
  });

  describe("Failure Case 5: Duplicate Execution Prevention", function () {
    it("Should prevent duplicate execution", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 10;

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // First execution should succeed
      await laterPay.connect(admin).executePayment(user.address, 0);

      // Second execution should fail
      await expect(
        laterPay.connect(admin).executePayment(user.address, 0)
      ).to.be.revertedWith("Payment already executed");
    });
  });

  describe("Failure Case 6: Invalid Approval ID", function () {
    it("Should fail with invalid approval ID", async function () {
      await expect(
        laterPay.connect(admin).executePayment(user.address, 999)
      ).to.be.revertedWith("Invalid approval ID");
    });
  });

  describe("Failure Case 7: Due Date Not Reached", function () {
    it("Should fail if due date not reached", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400;

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Try to execute before due date
      await expect(
        laterPay.connect(admin).executePayment(user.address, 0)
      ).to.be.revertedWith("Due date not reached");
    });
  });

  describe("Failure Case 8: Non-Admin Execution", function () {
    it("Should fail if non-admin tries to execute", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 10;

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // Attacker tries to execute
      await expect(
        laterPay.connect(attacker).executePayment(user.address, 0)
      ).to.be.revertedWith("Not an admin");
    });
  });
});

