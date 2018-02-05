pragma solidity ^0.4.17;

contract J8TTokenConfig {
    // The J8T decimals
    uint8 public constant TOKEN_DECIMALS = 8;

    // The J8T decimal factor to obtain luckys
    uint256 public constant J8T_DECIMALS_FACTOR = 10**uint256(TOKEN_DECIMALS);
}