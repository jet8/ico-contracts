pragma solidity ^0.4.17;
import './J8TToken.sol';
import './ACLManaged.sol';
import './Crowdsale.sol';


contract Ledger is ACLManaged {
	
	using SafeMath for uint256;

    ///////////////////////
    // Ledger PROPERTIES //
    ///////////////////////

	// The Allocation struct represents a token sale purchase
    // amountGranted is the amount of tokens purchased
    // isClaimed whether the allocation has been alredy claimed
	struct Allocation {
		uint256 amountGranted;
		bool isClaimed;
	}

    // ContributionPhase enum cases are
    // PublicContribution, the contribution has been made in the public sale phase
    // PreSaleContribution, the contribution has been made in the presale phase
    // PartnerContribution, the contribution has been made in the private phase
    enum ContributionPhase {
        PublicContribution, PreSaleContribution, PartnerContribution
    }

	// Map of adresses that purchased tokens on the public phase
    mapping(address => Allocation) public publicAllocations;

    // Map of adresses that purchased tokens on the presale phase
    mapping(address => Allocation) public presaleAllocations;

    // Map of adresses that purchased tokens on the private phase
    mapping(address => Allocation) public partnerAllocations;

    // Reference to the J8TToken contract
    J8TToken public tokenContract;

    // Reference to the Crowdsale contract
    Crowdsale public crowdsaleContract;

    // Total private allocation, counting the amount of tokens from the
    // partner and the presale phase
    uint256 public totalPrivateAllocation;

    // Total public allocation
    uint256 public totalPublicAllocation;

    // The current token supply stored in the Ledger contract
    uint256 public currentSupply;

    // Whether the token allocations can be claimed on the public sale phase
    bool public canClaimTokens;

    // Whether the token allocations can be claimed on the partner sale phase
    bool public canClaimPartnerTokens;

    // Whether the token allocations can be claimed on the presale sale phase
    bool public canClaimPresaleTokens;

    ///////////////////
    // Ledger EVENTS //
    ///////////////////

    // Triggered when an allocation has been granted
    event AllocationGranted(address _contributor, uint256 _amount, uint8 _phase);

    // Triggered when an allocation has been revoked
    event AllocationRevoked(address _contributor, uint256 _amount, uint8 _phase);

    // Triggered when an allocation has been claimed
    event AllocationClaimed(address _contributor, uint256 _amount, uint8 _phase);

    //////////////////////
    // Ledger FUNCTIONS //
    //////////////////////

    // Ledger constructor
    // Sets default values for canClaimTokens, canClaimPresaleTokens and canClaimPartnerTokens properties
    function Ledger(J8TToken _tokenContract) public {
    	require(address(_tokenContract) != address(0));
    	tokenContract = _tokenContract;
        canClaimTokens = false;
        canClaimPresaleTokens = false;
        canClaimPartnerTokens = false;
    }

    function () external payable {
        claimTokens();
    }

    // Revokes an allocation from the contributor with address _contributor
    // Deletes the allocation from the corresponding mapping property and transfers
    // the total amount of tokens of the allocation back to the Crowdsale contract
    function revokeAllocation(address _contributor, uint8 _phase) public onlyAdminAndOps payable returns (uint256) {
        require(_contributor != address(0));
        require(_contributor != address(this));

        // Can't revoke  an allocation if the contribution phase is not in the ContributionPhase enum
        ContributionPhase _contributionPhase = ContributionPhase(_phase);
        require(_contributionPhase == ContributionPhase.PublicContribution ||
                _contributionPhase == ContributionPhase.PreSaleContribution ||
                _contributionPhase == ContributionPhase.PartnerContribution);

        uint256 grantedAllocation = 0;

        // Deletes the allocation from the respective mapping
        if (_contributionPhase == ContributionPhase.PublicContribution) {
            grantedAllocation = publicAllocations[_contributor].amountGranted;
            delete publicAllocations[_contributor];
        } else if (_contributionPhase == ContributionPhase.PreSaleContribution) {
            grantedAllocation = presaleAllocations[_contributor].amountGranted;
            delete presaleAllocations[_contributor];
        } else if (_contributionPhase == ContributionPhase.PartnerContribution) {
            grantedAllocation = partnerAllocations[_contributor].amountGranted;
            delete partnerAllocations[_contributor];
        }

        // The granted amount allocation must be less that the current token supply on the contract
        require(grantedAllocation <= currentSupply);

        // Updates the current supply as well as the total public allocation and
        // the total private allocation substracting the amount of tokens that has been revoked

        currentSupply = currentSupply.sub(grantedAllocation);

        if (_contributionPhase == ContributionPhase.PublicContribution) {
            require(grantedAllocation <= totalPublicAllocation);
            totalPublicAllocation = totalPublicAllocation.sub(grantedAllocation);
        } else {
            require(grantedAllocation <= totalPrivateAllocation);
            totalPrivateAllocation = totalPrivateAllocation.sub(grantedAllocation);
        }

        // We sent back the amount of tokens that has been revoked to the corwdsale contract
        require(tokenContract.transfer(address(crowdsaleContract), grantedAllocation));

        AllocationRevoked(_contributor, grantedAllocation, _phase);

        return grantedAllocation;

    }

    // Adds a new allocation for the contributor with address _contributor
    function addAllocation(address _contributor, uint256 _amount, uint8 _phase) public onlyAdminAndOps returns (bool) {
    	require(_contributor != address(0));
    	require(_contributor != address(this));

    	// Can't create or update an allocation if the amount of tokens to be allocated is not greater than zero
    	require(_amount > 0);

        // Can't create an allocation if the contribution phase is not in the ContributionPhase enum
        ContributionPhase _contributionPhase = ContributionPhase(_phase);
        require(_contributionPhase == ContributionPhase.PublicContribution ||
                _contributionPhase == ContributionPhase.PreSaleContribution ||
                _contributionPhase == ContributionPhase.PartnerContribution);

        uint256 grantedAllocation = 0;
        uint256 totalGrantedAllocation = 0;

        // Fetch the allocatio from the respective mapping and updates the granted amount of tokens
        if (_contributionPhase == ContributionPhase.PublicContribution) {
            grantedAllocation = publicAllocations[_contributor].amountGranted;
            totalGrantedAllocation = grantedAllocation.add(_amount);
            publicAllocations[_contributor] = Allocation(totalGrantedAllocation, false);
        } else if (_contributionPhase == ContributionPhase.PreSaleContribution) {
            grantedAllocation = presaleAllocations[_contributor].amountGranted;
            totalGrantedAllocation = grantedAllocation.add(_amount);
            presaleAllocations[_contributor] = Allocation(totalGrantedAllocation, false);
        } else if (_contributionPhase == ContributionPhase.PartnerContribution) {
            grantedAllocation = partnerAllocations[_contributor].amountGranted;
            totalGrantedAllocation = grantedAllocation.add(_amount);
            partnerAllocations[_contributor] = Allocation(totalGrantedAllocation, false);
        }

        // Updates the contract data
        if (_contributionPhase == ContributionPhase.PublicContribution) {
            totalPublicAllocation = totalPublicAllocation.add(_amount);
        } else {
            totalPrivateAllocation = totalPrivateAllocation.add(_amount);
        }

        currentSupply = currentSupply.add(_amount);

        AllocationGranted(_contributor, totalGrantedAllocation, _phase);

        return true;
    }

    // The claimTokens() function handles the contribution token claim.
    // Tokens can only be claimed after we open this phase.
    // The lockouts periods are defined by the foundation.
    // There are 3 different lockouts:
    //      Public sale lockout
    //      Presale lockout
    //      Partner lockout
    //
    // A contributor that has contributed in all the phases can claim
    // all its tokens, but only the ones that are accesible to claim
    // be transfered.
    // 
    // A contributor can claim its tokens after each phase has been opened
    function claimTokens() public payable onlyAfterOpenClaim returns (bool) {
        require(msg.sender != address(0));

        bool hasTransferedTokens = false;

        // We need to check if the contributor has made a contribution on each
        // phase, public, presale and partner

        uint256 amountToTransfer = 0;

        // If amount granted is greated than zero and the allocation hasn't
        // been already claimed we proceed to transfer to tokens.
        Allocation storage publicA = publicAllocations[msg.sender];
        if (publicA.amountGranted > 0 && !publicA.isClaimed) {
            amountToTransfer = publicA.amountGranted;
            
            // The amount to transfer must be less or equal to the current supply
            require(amountToTransfer <= currentSupply);
            require(tokenContract.transfer(msg.sender, amountToTransfer));

            // We update the current supply by substracting the amount of tokens
            // that has been transfered and we set the allocation as claimed
            currentSupply = currentSupply.sub(amountToTransfer);
            publicA.isClaimed = true;

            AllocationClaimed(msg.sender, amountToTransfer, 0);
            hasTransferedTokens = true;
        }

        Allocation storage presaleA = presaleAllocations[msg.sender];
        if (presaleA.amountGranted > 0 && !presaleA.isClaimed && canClaimPresaleTokens) {
            amountToTransfer = presaleA.amountGranted;

            require(amountToTransfer <= currentSupply);
            require(tokenContract.transfer(msg.sender, amountToTransfer));

            currentSupply = currentSupply.sub(amountToTransfer);
            presaleA.isClaimed = true;

            AllocationClaimed(msg.sender, amountToTransfer, 1);
            hasTransferedTokens = true;
        }

        Allocation storage partnerA = partnerAllocations[msg.sender];
        if (partnerA.amountGranted > 0 && !partnerA.isClaimed && canClaimPartnerTokens) {
            amountToTransfer = partnerA.amountGranted;

            require(amountToTransfer <= currentSupply);
            require(tokenContract.transfer(msg.sender, amountToTransfer));

            currentSupply = currentSupply.sub(amountToTransfer);
            partnerA.isClaimed = true;

            AllocationClaimed(msg.sender, amountToTransfer, 2);
            hasTransferedTokens = true;
        }

        require(hasTransferedTokens);
        return true;
    }

    modifier onlyAfterOpenClaim() {
        require(canClaimTokens);
        _;
    }

    // Updates the canClaimTokens propety with the new _canClaimTokens value
    function setCanClaimTokens(bool _canClaimTokens) external onlyAdminAndOps returns (bool) {
        canClaimTokens = _canClaimTokens;
        return true;
    }

    // Updates the canClaimPresaleTokens propety with the new _canClaimTokens value
    function setCanClaimPresaleTokens(bool _canClaimTokens) external onlyAdminAndOps returns (bool) {
        canClaimPresaleTokens = _canClaimTokens;
        return true;
    }

    // Updates the canClaimPartnerTokens propety with the new _canClaimTokens value
    function setCanClaimPartnerTokens(bool _canClaimTokens) external onlyAdminAndOps returns (bool) {
        canClaimPartnerTokens = _canClaimTokens;
        return true;
    }

    // Updates the crowdsale contract propety with the new _crowdsaleContract value
    function setCrowdsaleContract(Crowdsale _crowdsaleContract) public onlyOwner returns (bool) {
        crowdsaleContract = _crowdsaleContract;
        return true;
    }
}