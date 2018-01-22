pragma solidity ^0.4.17;
import 'zeppelin-solidity/contracts/token/StandardToken.sol';
import 'zeppelin-solidity/contracts/token/BurnableToken.sol';

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

contract J8TToken is BurnableToken {
	string public constant name            = "J8T Token";
	string public constant symbol          = "J8T";
	uint256 public constant decimals       = 8;
	uint256 public constant INITIAL_SUPPLY = 1500000000 * (10 ** uint256(decimals));

	function J8TToken() {
	    totalSupply = INITIAL_SUPPLY;
	    balances[msg.sender] = INITIAL_SUPPLY;
	 }
}
