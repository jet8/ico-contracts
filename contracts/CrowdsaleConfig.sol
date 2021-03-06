pragma solidity ^0.4.17;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './J8TTokenConfig.sol';

contract CrowdsaleConfig is J8TTokenConfig {
    using SafeMath for uint256;

    // Default start token sale date is 28th February 15:00 SGP 2018
    uint256 public constant START_TIMESTAMP = 1551521564;

    // Default end token sale date is 14th March 15:00 SGP 2018
    uint256 public constant END_TIMESTAMP = 1562407964;

    // The ETH decimal factor to obtain weis
    uint256 public constant ETH_DECIMALS_FACTOR = 10**uint256(18);

    // The token sale supply 
    uint256 public constant TOKEN_SALE_SUPPLY = 450000000 * J8T_DECIMALS_FACTOR;

    // The minimum contribution amount in weis
    uint256 public constant MIN_CONTRIBUTION_WEIS = 0.1 ether;

    // The maximum contribution amount in weis
    uint256 public constant MAX_CONTRIBUTION_WEIS = 10 ether;

    //@WARNING: WORKING WITH KILO-MULTIPLES TO AVOID IMPOSSIBLE DIVISIONS OF FLOATING POINTS.
    uint256 constant dollar_per_kilo_token = 100; //0.1 dollar per token
    uint256 public constant dollars_per_kilo_ether = 900000; //900$ per ether
    //TOKENS_PER_ETHER = dollars_per_ether / dollar_per_token
    uint256 public constant INITIAL_TOKENS_PER_ETHER = dollars_per_kilo_ether.div(dollar_per_kilo_token);
}