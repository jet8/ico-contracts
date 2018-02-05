pragma solidity ^0.4.17;
import 'zeppelin-solidity/contracts/token/StandardToken.sol';
import 'zeppelin-solidity/contracts/token/BurnableToken.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import './J8TTokenConfig.sol';

//////////////////////////////////////////////////////////////////////
// @title J8T Token 									   			//
// @dev ERC20 J8T Token 								   			//
//														   			//
// J8T Tokens are divisible by 1e8 (100,000,000) base      			//
//														   			//
// J8T are displayed using 8 decimal places of precision.  			//
//														   			//
// 1 J8T is equivalent to 100000000 luckys:				   			//
//   100000000 == 1 * 10**8 == 1e8 == One Hundred Million luckys 	//
//														   			//
// 1,5 Billion J8T (total supply) is equivalent to:        			//
//   150000000000000000 == 1500000000 * 10**8 == 1,5e17 luckys   	//
// 														   			//
//////////////////////////////////////////////////////////////////////

contract J8TToken is J8TTokenConfig, BurnableToken, Ownable {
	string public constant name            = "J8T Token";
	string public constant symbol          = "J8T";
	uint256 public constant decimals       = TOKEN_DECIMALS;
	uint256 public constant INITIAL_SUPPLY = 1500000000 * (10 ** uint256(decimals));

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function J8TToken() {
	    totalSupply = INITIAL_SUPPLY;
	    balances[msg.sender] = INITIAL_SUPPLY;

        //https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md#transfer-1
        //EIP 20: A token contract which creates new tokens SHOULD trigger a
        //Transfer event with the _from address set to 0x0
        //when tokens are created.
        Transfer(0x0, msg.sender, INITIAL_SUPPLY);
	 }
}
