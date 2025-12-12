// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDT
 * @dev Test USDT token for Sepolia testnet
 */
contract TestUSDT is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Test USDT", "tUSDT") Ownable(initialOwner) {
        // Mint initial supply for testing
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Decimals override (USDT uses 6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

