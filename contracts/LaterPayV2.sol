// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LaterPayV2
 * @dev Improved deferred payment system contract with better error handling
 */
contract LaterPayV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;

    struct PaymentApproval {
        address user;
        uint256 amount; // Maximum amount that can be withdrawn
        uint256 approvedAt;
        uint256 dueDate;
        bool executed;
        uint256 executionAttempts; // Track execution attempts
        uint256 actualAmount; // Actual amount withdrawn (0 if not executed yet)
    }

    mapping(address => PaymentApproval[]) public userApprovals;
    mapping(address => uint256) public userApprovalCount;
    
    mapping(address => bool) public admins;
    
    // Events
    event PaymentApproved(
        address indexed user,
        uint256 indexed approvalId,
        uint256 amount,
        uint256 dueDate
    );
    
    event PaymentExecuted(
        address indexed user,
        uint256 indexed approvalId,
        uint256 amount,
        uint256 executedAt
    );
    
    event PaymentExecutionFailed(
        address indexed user,
        uint256 indexed approvalId,
        string reason,
        uint256 attemptCount
    );
    
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Not an admin");
        _;
    }

    constructor(address _paymentToken, address initialOwner) Ownable(initialOwner) {
        require(_paymentToken != address(0), "Invalid token address");
        require(initialOwner != address(0), "Invalid owner address");
        paymentToken = IERC20(_paymentToken);
        admins[initialOwner] = true;
    }

    /**
     * @dev User approves a payment for future withdrawal
     * Note: This function only records the approval. The actual payment transfer
     * happens when executePayment is called. User must approve this contract
     * to spend tokens before calling this function.
     */
    function approvePayment(uint256 amount, uint256 dueDate) external {
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");
        
        // Note: amount is the maximum amount that can be withdrawn
        // At execution time, the actual amount will be min(userBalance, allowance, amount)
        // We don't check balance here - user may not have enough at approval time,
        // but should have enough (or at least some) at execution time
        
        // Check user has approved this contract to spend tokens (at least the maximum amount)
        uint256 allowance = paymentToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance. Please approve this contract to spend tokens.");
        
        // Do NOT transfer tokens here - this is a deferred payment system
        // Tokens will be transferred only when executePayment is called
        
        uint256 approvalId = userApprovalCount[msg.sender];
        userApprovals[msg.sender].push(PaymentApproval({
            user: msg.sender,
            amount: amount, // Maximum amount
            approvedAt: block.timestamp,
            dueDate: dueDate,
            executed: false,
            executionAttempts: 0,
            actualAmount: 0 // Will be set when executed
        }));
        
        userApprovalCount[msg.sender]++;
        
        emit PaymentApproved(msg.sender, approvalId, amount, dueDate);
    }

    /**
     * @dev Admin executes payment withdrawal with improved error handling
     * This function transfers tokens directly from user to owner at execution time
     */
    function executePayment(address user, uint256 approvalId) external onlyAdmin nonReentrant {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        
        PaymentApproval storage approval = userApprovals[user][approvalId];
        require(!approval.executed, "Payment already executed");
        require(block.timestamp >= approval.dueDate, "Due date not reached");
        
        // Get user's current balance and allowance
        uint256 userBalance = paymentToken.balanceOf(user);
        uint256 allowance = paymentToken.allowance(user, address(this));
        
        // Calculate actual amount to withdraw: min(userBalance, allowance, approval.amount)
        // This allows partial withdrawal if user doesn't have full amount
        uint256 actualAmount = userBalance < allowance ? userBalance : allowance;
        if (actualAmount > approval.amount) {
            actualAmount = approval.amount;
        }
        
        // Check that we can withdraw at least some amount
        require(actualAmount > 0, "No funds available to withdraw");
        
        // Check owner address is valid
        address ownerAddress = owner();
        require(ownerAddress != address(0), "Invalid owner address");
        
        // Increment attempt counter
        approval.executionAttempts++;
        
        // Transfer tokens directly from user to owner (not via contract)
        // This is the actual payment execution - funds move only at this point
        // Transfer the actual available amount (may be less than approval.amount)
        paymentToken.safeTransferFrom(user, ownerAddress, actualAmount);
        
        // If we reach here, transfer was successful
        approval.executed = true;
        approval.actualAmount = actualAmount;
        emit PaymentExecuted(user, approvalId, actualAmount, block.timestamp);
    }

    /**
     * @dev Get user's approval details
     */
    function getUserApproval(address user, uint256 approvalId) 
        external 
        view 
        returns (PaymentApproval memory) 
    {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        return userApprovals[user][approvalId];
    }

    /**
     * @dev Get all approvals for a user
     */
    function getUserApprovals(address user) 
        external 
        view 
        returns (PaymentApproval[] memory) 
    {
        return userApprovals[user];
    }

    /**
     * @dev Get all executable approvals (due date passed, not executed)
     */
    function getExecutableApprovals() external view returns (
        address[] memory users,
        uint256[] memory approvalIds,
        uint256[] memory amounts,
        uint256 count
    ) {
        // This is a simplified version - in production, you might want to use events
        // or a more efficient data structure
        uint256 maxResults = 100; // Limit to prevent gas issues
        address[] memory tempUsers = new address[](maxResults);
        uint256[] memory tempApprovalIds = new uint256[](maxResults);
        uint256[] memory tempAmounts = new uint256[](maxResults);
        uint256 resultCount = 0;
        
        // Note: This is inefficient for large numbers of users
        // In production, consider using events or off-chain indexing
        // For now, this is a placeholder
        
        return (tempUsers, tempApprovalIds, tempAmounts, resultCount);
    }

    /**
     * @dev Check if payment can be executed
     */
    function canExecutePayment(address user, uint256 approvalId) external view returns (
        bool canExecute,
        string memory reason
    ) {
        if (approvalId >= userApprovalCount[user]) {
            return (false, "Invalid approval ID");
        }
        
        PaymentApproval memory approval = userApprovals[user][approvalId];
        
        if (approval.executed) {
            return (false, "Already executed");
        }
        
        if (block.timestamp < approval.dueDate) {
            return (false, "Due date not reached");
        }
        
        // Check user has at least some balance and allowance
        uint256 userBalance = paymentToken.balanceOf(user);
        uint256 allowance = paymentToken.allowance(user, address(this));
        
        // Calculate actual withdrawable amount
        uint256 actualAmount = userBalance < allowance ? userBalance : allowance;
        if (actualAmount > approval.amount) {
            actualAmount = approval.amount;
        }
        
        if (actualAmount == 0) {
            return (false, "No funds available to withdraw");
        }
        
        address ownerAddress = owner();
        if (ownerAddress == address(0)) {
            return (false, "Invalid owner address");
        }
        
        return (true, "");
    }

    /**
     * @dev Add an admin address
     */
    function addAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid address");
        admins[admin] = true;
        emit AdminAdded(admin);
    }

    /**
     * @dev Remove an admin address
     */
    function removeAdmin(address admin) external onlyOwner {
        admins[admin] = false;
        emit AdminRemoved(admin);
    }

    /**
     * @dev Emergency withdraw specific approval (only owner)
     * This allows owner to withdraw a specific approval in case of issues
     * Transfers directly from user to owner, bypassing due date check
     */
    function emergencyWithdrawApproval(address user, uint256 approvalId) external onlyOwner {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        
        PaymentApproval storage approval = userApprovals[user][approvalId];
        require(!approval.executed, "Already executed");
        
        // Get user's current balance and allowance
        uint256 userBalance = paymentToken.balanceOf(user);
        uint256 allowance = paymentToken.allowance(user, address(this));
        
        // Calculate actual amount to withdraw: min(userBalance, allowance, approval.amount)
        uint256 actualAmount = userBalance < allowance ? userBalance : allowance;
        if (actualAmount > approval.amount) {
            actualAmount = approval.amount;
        }
        
        // Check that we can withdraw at least some amount
        require(actualAmount > 0, "No funds available to withdraw");
        
        address ownerAddress = owner();
        require(ownerAddress != address(0), "Invalid owner address");
        
        approval.executed = true;
        approval.actualAmount = actualAmount;
        // Transfer directly from user to owner (not via contract)
        paymentToken.safeTransferFrom(user, ownerAddress, actualAmount);
        
        emit PaymentExecuted(user, approvalId, actualAmount, block.timestamp);
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }
}

