pragma solidity ^0.4.17;
import './J8TToken.sol';
import './ACLManaged.sol';
import './J8TTokenConfig.sol';

contract Custodian is ACLManaged, J8TTokenConfig {
	
	using SafeMath for uint256;

    // The team token allocation is 10% of the total token supply
	// 		team = 1500000000*0.1 = 150000000*(10**8) luckys
	// The advisors token allocation is 13% of the total token supply
	// 		advisors = 1500000000*0.13 = 195000000*(10**8) luckys
	// The bounty token allocation is 2% of the total token supply
	// 		bounty = 1500000000*0.02 = 30000000*(10**8) luckys

	uint256 public constant TEAM_SUPPLY = 150000000;
	uint256 public constant ADVISORS_SUPPLY = 195000000;
	uint256 public constant BOUNTY_SUPPLY = 30000000;


	J8TToken public tokenContract;

	uint256 public currentTeamSupply;
	uint256 public currentBountySupply;
	uint256 public currentAdvisorsSupply;


	// Each token distribution is represented by the AllocationType enum
	// There are three types of allocation:
	// Team - 10% token supply
	// Advisors - 13% token supply
	// Bounty - 2% token supply
	enum AllocationType {
		Team, Advisors, Bounty
	}

	// We trigger the event once the allocation has been processed
	event ProcessableAllocationProcessed(address wallet, uint256 amount, AllocationType allocationType);

	function Custodian(J8TToken _tokenContract) public {
    	require(address(_tokenContract) != address(0));
    	tokenContract = _tokenContract;

    	// The team token allocation is 10% of the total token supply
    	// 		team = 1500000000*0.1 = 150000000*(10**8) luckys
  		// The advisors token allocation is 13% of the total token supply
    	// 		advisors = 1500000000*0.13 = 195000000*(10**8) luckys
  		// The bounty token allocation is 2% of the total token supply
    	// 		bounty = 1500000000*0.02 = 30000000*(10**8) luckys

    	currentTeamSupply = TEAM_SUPPLY.mul(J8T_DECIMALS_FACTOR);
    	currentAdvisorsSupply = ADVISORS_SUPPLY.mul(J8T_DECIMALS_FACTOR);
    	currentBountySupply = BOUNTY_SUPPLY.mul(J8T_DECIMALS_FACTOR);
    }

	function transferAllocation(uint256 _amount, address _wallet, AllocationType _allocationType) external onlyAdmin returns (bool) {
		require(_wallet != address(0));
		require(_amount > 0);
		require(_allocationType == AllocationType.Team ||
				_allocationType == AllocationType.Bounty || 
				_allocationType == AllocationType.Advisors);

		// We need to convert the amount of tokens to all J8T token decimal factor, 10**8 lucky
		uint256 tokensToAllocate = _amount.mul(J8T_DECIMALS_FACTOR);


		// We need to update the allocation supply and tranfer the J8T tokens to the wallet
		// There are three types of allocation:
		// Team - 10% token supply
		// Advisors - 12% token supply
		// Bounty - 2% token supply

		if (_allocationType == AllocationType.Team) {
			require(tokensToAllocate <= currentTeamSupply);
			require(tokenContract.transfer(_wallet, tokensToAllocate));
			currentTeamSupply = currentTeamSupply.sub(tokensToAllocate);
		} else if (_allocationType == AllocationType.Advisors) {
			require(tokensToAllocate <= currentAdvisorsSupply);
			require(tokenContract.transfer(_wallet, tokensToAllocate));
			currentAdvisorsSupply = currentAdvisorsSupply.sub(tokensToAllocate);
		} else if (_allocationType == AllocationType.Bounty) {
			require(tokensToAllocate <= currentBountySupply);
			require(tokenContract.transfer(_wallet, tokensToAllocate));
			currentBountySupply = currentBountySupply.sub(tokensToAllocate);
		}

		ProcessableAllocationProcessed(_wallet, tokensToAllocate, _allocationType);

		return true;
	}

	function setTeamSupply(uint256 _amount) external onlyAdmin returns (bool) {
        currentTeamSupply = _amount;
        return true;
    }

    function setAdvisorsSupply(uint256 _amount) external onlyAdmin returns (bool) {
        currentAdvisorsSupply = _amount;
        return true;
    }

    function setBountySupply(uint256 _amount) external onlyAdmin returns (bool) {
        currentBountySupply = _amount;
        return true;
    }
}