const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LaterPay System", function () {
  let testUSDT;
  let laterPay;
  let owner;
  let user;
  let admin;
  let addr1;

  beforeEach(async function () {
    [owner, user, admin, addr1] = await ethers.getSigners();

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
    const amount = ethers.parseUnits("1000", 6); // 1000 tUSDT
    await testUSDT.transfer(user.address, amount);
  });

  describe("Deployment", function () {
    it("Should set the right payment token", async function () {
      expect(await laterPay.paymentToken()).to.equal(await testUSDT.getAddress());
    });

    it("Should set owner as admin", async function () {
      expect(await laterPay.admins(owner.address)).to.equal(true);
    });
  });

  describe("Payment Approval", function () {
    it("Should allow user to approve payment", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400; // 1 day from now

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      const approval = await laterPay.getUserApproval(user.address, 0);
      expect(approval.amount).to.equal(amount);
      expect(approval.executed).to.equal(false);
    });

    it("Should NOT transfer tokens to contract on approval", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400;

      const initialUserBalance = await testUSDT.balanceOf(user.address);

      // User approves but tokens stay in user's wallet
      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Contract should have 0 balance (tokens still in user's wallet)
      expect(await testUSDT.balanceOf(await laterPay.getAddress())).to.equal(0);
      // User should still have all their tokens (no transfer happened)
      expect(await testUSDT.balanceOf(user.address)).to.equal(initialUserBalance);
    });
  });

  describe("Payment Execution", function () {
    it("Should allow admin to execute payment after due date", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 10; // 10 seconds from now

      const initialUserBalance = await testUSDT.balanceOf(user.address);
      const initialOwnerBalance = await testUSDT.balanceOf(owner.address);

      // User approves payment (tokens stay in user's wallet)
      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      // Verify tokens are still in user's wallet
      expect(await testUSDT.balanceOf(user.address)).to.equal(initialUserBalance);
      expect(await testUSDT.balanceOf(await laterPay.getAddress())).to.equal(0);

      // Wait for due date
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // Execute payment - transfers directly from user to owner
      await laterPay.connect(admin).executePayment(user.address, 0);

      const approval = await laterPay.getUserApproval(user.address, 0);
      expect(approval.executed).to.equal(true);
      
      // Owner should have received the tokens
      expect(await testUSDT.balanceOf(owner.address)).to.equal(initialOwnerBalance + amount);
      // User should have lost the tokens
      expect(await testUSDT.balanceOf(user.address)).to.equal(initialUserBalance - amount);
      // Contract should still have 0 tokens
      expect(await testUSDT.balanceOf(await laterPay.getAddress())).to.equal(0);
    });

    it("Should not allow execution before due date", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 86400; // 1 day from now

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      await expect(
        laterPay.connect(admin).executePayment(user.address, 0)
      ).to.be.revertedWith("Due date not reached");
    });

    it("Should not allow non-admin to execute", async function () {
      const amount = ethers.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const dueDate = currentBlock.timestamp + 10; // 10 seconds from now

      await testUSDT.connect(user).approve(await laterPay.getAddress(), amount);
      await laterPay.connect(user).approvePayment(amount, dueDate);

      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        laterPay.connect(addr1).executePayment(user.address, 0)
      ).to.be.revertedWith("Not an admin");
    });
  });

  describe("Admin Management", function () {
    it("Should allow owner to add admin", async function () {
      await laterPay.connect(owner).addAdmin(addr1.address);
      expect(await laterPay.admins(addr1.address)).to.equal(true);
    });

    it("Should allow owner to remove admin", async function () {
      await laterPay.connect(owner).removeAdmin(admin.address);
      expect(await laterPay.admins(admin.address)).to.equal(false);
    });
  });
});

