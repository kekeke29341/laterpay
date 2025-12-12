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
        uint256 amount;
        uint256 approvedAt;
        uint256 dueDate;
        bool executed;
        uint256 executionAttempts; // Track execution attempts
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
     */
    function approvePayment(uint256 amount, uint256 dueDate) external {
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");
        
        // Check user has sufficient balance
        uint256 userBalance = paymentToken.balanceOf(msg.sender);
        require(userBalance >= amount, "Insufficient balance");
        
        // Transfer tokens from user to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 approvalId = userApprovalCount[msg.sender];
        userApprovals[msg.sender].push(PaymentApproval({
            user: msg.sender,
            amount: amount,
            approvedAt: block.timestamp,
            dueDate: dueDate,
            executed: false,
            executionAttempts: 0
        }));
        
        userApprovalCount[msg.sender]++;
        
        emit PaymentApproved(msg.sender, approvalId, amount, dueDate);
    }

    /**
     * @dev Admin executes payment withdrawal with improved error handling
     */
    function executePayment(address user, uint256 approvalId) external onlyAdmin nonReentrant {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        
        PaymentApproval storage approval = userApprovals[user][approvalId];
        require(!approval.executed, "Payment already executed");
        require(block.timestamp >= approval.dueDate, "Due date not reached");
        
        // Check contract has sufficient balance
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        require(contractBalance >= approval.amount, "Insufficient contract balance");
        
        // Check owner address is valid
        address ownerAddress = owner();
        require(ownerAddress != address(0), "Invalid owner address");
        
        // Increment attempt counter
        approval.executionAttempts++;
        
        // Execute payment - safeTransfer will revert on failure
        // We check balance and owner address before this, so it should succeed
        // If it fails, the transaction will revert and executionAttempts will be incremented
        // (though the state change will be rolled back)
        paymentToken.safeTransfer(ownerAddress, approval.amount);
        
        // If we reach here, transfer was successful
        approval.executed = true;
        emit PaymentExecuted(user, approvalId, approval.amount, block.timestamp);
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
        
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        if (contractBalance < approval.amount) {
            return (false, "Insufficient contract balance");
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
     */
    function emergencyWithdrawApproval(address user, uint256 approvalId) external onlyOwner {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        
        PaymentApproval storage approval = userApprovals[user][approvalId];
        require(!approval.executed, "Already executed");
        
        approval.executed = true;
        paymentToken.safeTransfer(owner(), approval.amount);
        
        emit PaymentExecuted(user, approvalId, approval.amount, block.timestamp);
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }
}

