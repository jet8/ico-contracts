pragma solidity ^0.4.17;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract CrowdsaleConfig {
    using SafeMath for uint256;

    // Default start token sale date is 08th March 2018
    uint256 public constant START_TIMESTAMP = 1520467200;

    // Default end token sale date is 1st July 2018
    uint256 public constant END_TIMESTAMP   = 1530403200;

    // The J8T decimals
    uint8   public constant TOKEN_DECIMALS = 8;

    // The J8T decimal factor to obtain luckys
    uint256 public constant J8T_DECIMALS_FACTOR = 10**uint256(TOKEN_DECIMALS);

    // The ETH decimal factor to obtain weis
    uint256 public constant ETH_DECIMALS_FACTOR = 10**uint256(18);

    // The token sale supply 
    uint256 public constant TOKEN_SALE_SUPPLY = 450000000 * J8T_DECIMALS_FACTOR;

    // The minimum contribution amount in weis
    uint256 public constant MIN_CONTRIBUTION_WEIS = 100000000000000000; //0.1 eth

    // The maximum contribution amount in weis
    uint256 public constant MAX_CONTRIBUTION_WEIS = 100000000000000000000; //100 eth

    //@WARNING: WORKING WITH KILO-MULTIPLES TO AVOID IMPOSSIBLE DIVISIONS OF FLOATING POINTS.
    uint256 constant dollar_per_kilo_token = 100; //0.1 dollar per token
    uint256 public constant dollars_per_kilo_ether = 400000; //400$ per ether
    //TOKENS_PER_ETHER = dollars_per_ether / dollar_per_token
    uint256 public constant INITIAL_TOKENS_PER_ETHER = dollars_per_kilo_ether.div(dollar_per_kilo_token);
}