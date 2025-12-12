// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LaterPayCorrect
 * @dev Corrected deferred payment system contract
 * 
 * Flow:
 * 1. User calls approvePayment() - only approves tokens, does NOT transfer
 * 2. User must separately call token.approve() to allow contract to transfer
 * 3. After due date, admin calls executePayment() - transfers directly from user to owner
 */
contract LaterPayCorrect is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;

    struct PaymentApproval {
        address user;
        uint256 amount;
        uint256 approvedAt;
        uint256 dueDate;
        bool executed;
    }

    mapping(address => PaymentApproval[]) public userApprovals;
    mapping(address => uint256) public userApprovalCount;
    
    mapping(address => bool) public admins;
    
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
     * @notice This function does NOT transfer tokens. User must separately call token.approve()
     * @param amount Amount to approve
     * @param dueDate Timestamp when payment can be executed
     */
    function approvePayment(uint256 amount, uint256 dueDate) external {
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");
        
        // Check user has sufficient balance (but don't transfer yet)
        uint256 userBalance = paymentToken.balanceOf(msg.sender);
        require(userBalance >= amount, "Insufficient balance");
        
        // Store approval information (tokens stay in user's wallet)
        uint256 approvalId = userApprovalCount[msg.sender];
        userApprovals[msg.sender].push(PaymentApproval({
            user: msg.sender,
            amount: amount,
            approvedAt: block.timestamp,
            dueDate: dueDate,
            executed: false
        }));
        
        userApprovalCount[msg.sender]++;
        
        emit PaymentApproved(msg.sender, approvalId, amount, dueDate);
    }

    /**
     * @dev Admin executes payment withdrawal
     * @notice Transfers tokens directly from user's wallet to owner's wallet
     * @param user Address of the user whose payment to execute
     * @param approvalId Index of the approval to execute
     */
    function executePayment(address user, uint256 approvalId) external onlyAdmin nonReentrant {
        require(approvalId < userApprovalCount[user], "Invalid approval ID");
        
        PaymentApproval storage approval = userApprovals[user][approvalId];
        require(!approval.executed, "Payment already executed");
        require(block.timestamp >= approval.dueDate, "Due date not reached");
        
        // Check user still has sufficient balance
        uint256 userBalance = paymentToken.balanceOf(user);
        require(userBalance >= approval.amount, "User has insufficient balance");
        
        // Check contract has approval to transfer from user
        uint256 allowance = paymentToken.allowance(user, address(this));
        require(allowance >= approval.amount, "Insufficient allowance");
        
        // Check owner address is valid
        address ownerAddress = owner();
        require(ownerAddress != address(0), "Invalid owner address");
        
        // Mark as executed BEFORE transfer (prevents reentrancy)
        approval.executed = true;
        
        // Transfer directly from user's wallet to owner's wallet
        paymentToken.safeTransferFrom(user, ownerAddress, approval.amount);
        
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
        
        uint256 userBalance = paymentToken.balanceOf(user);
        if (userBalance < approval.amount) {
            return (false, "User has insufficient balance");
        }
        
        uint256 allowance = paymentToken.allowance(user, address(this));
        if (allowance < approval.amount) {
            return (false, "Insufficient allowance");
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
}


