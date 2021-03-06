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
    // hasClaimedBonusTokens whether the allocation has been alredy claimed
    struct Allocation {
        uint256 amountGranted;
        uint256 amountBonusGranted;
        bool hasClaimedBonusTokens;
    }

    // ContributionPhase enum cases are
    // PreSaleContribution, the contribution has been made in the presale phase
    // PartnerContribution, the contribution has been made in the private phase
    enum ContributionPhase {
        PreSaleContribution, PartnerContribution
    }

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

    // Whether the token allocations can be claimed on the partner sale phase
    bool public canClaimPartnerTokens;

    // Whether the token allocations can be claimed on the presale sale phase
    bool public canClaimPresaleTokens;

    // Whether the bonus token allocations can be claimed
    bool public canClaimPresaleBonusTokensPhase1;
    bool public canClaimPresaleBonusTokensPhase2;

    // Whether the bonus token allocations can be claimed
    bool public canClaimPartnerBonusTokensPhase1;
    bool public canClaimPartnerBonusTokensPhase2;

    ///////////////////
    // Ledger EVENTS //
    ///////////////////

    // Triggered when an allocation has been granted
    event AllocationGranted(address _contributor, uint256 _amount, uint8 _phase);

    // Triggered when an allocation has been revoked
    event AllocationRevoked(address _contributor, uint256 _amount, uint8 _phase);

    // Triggered when an allocation has been claimed
    event AllocationClaimed(address _contributor, uint256 _amount);

    // Triggered when a bonus allocation has been claimed
    event AllocationBonusClaimed(address _contributor, uint256 _amount);

    // Triggered when crowdsale contract updated
    event CrowdsaleContractUpdated(address _who, address _old_address, address _new_address);

    //Triggered when any can claim token boolean is updated. _type param indicates which is updated.
    event CanClaimTokensUpdated(address _who, string _type, bool _oldCanClaim, bool _newCanClaim);

    //////////////////////
    // Ledger FUNCTIONS //
    //////////////////////

    // Ledger constructor
    // Sets default values for canClaimPresaleTokens and canClaimPartnerTokens properties
    function Ledger(J8TToken _tokenContract) public {
        require(address(_tokenContract) != address(0));
        tokenContract = _tokenContract;
        canClaimPresaleTokens = false;
        canClaimPartnerTokens = false;
        canClaimPresaleBonusTokensPhase1 = false;
        canClaimPresaleBonusTokensPhase2 = false;
        canClaimPartnerBonusTokensPhase1 = false;
        canClaimPartnerBonusTokensPhase2 = false;
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
        require(_contributionPhase == ContributionPhase.PreSaleContribution ||
                _contributionPhase == ContributionPhase.PartnerContribution);

        uint256 grantedAllocation = 0;

        // Deletes the allocation from the respective mapping
        if (_contributionPhase == ContributionPhase.PreSaleContribution) {
            grantedAllocation = presaleAllocations[_contributor].amountGranted.add(presaleAllocations[_contributor].amountBonusGranted);
            delete presaleAllocations[_contributor];
        } else if (_contributionPhase == ContributionPhase.PartnerContribution) {
            grantedAllocation = partnerAllocations[_contributor].amountGranted.add(partnerAllocations[_contributor].amountBonusGranted);
            delete partnerAllocations[_contributor];
        }

        // The granted amount allocation must be less that the current token supply on the contract
        uint256 currentSupply = tokenContract.balanceOf(address(this));
        require(grantedAllocation <= currentSupply);

        // Updates the total private allocation substracting the amount of tokens that has been revoked
        require(grantedAllocation <= totalPrivateAllocation);
        totalPrivateAllocation = totalPrivateAllocation.sub(grantedAllocation);
        
        // We sent back the amount of tokens that has been revoked to the corwdsale contract
        require(tokenContract.transfer(address(crowdsaleContract), grantedAllocation));

        AllocationRevoked(_contributor, grantedAllocation, _phase);

        return grantedAllocation;

    }

    // Adds a new allocation for the contributor with address _contributor
    function addAllocation(address _contributor, uint256 _amount, uint256 _bonus, uint8 _phase) public onlyAdminAndOps returns (bool) {
        require(_contributor != address(0));
        require(_contributor != address(this));

        // Can't create or update an allocation if the amount of tokens to be allocated is not greater than zero
        require(_amount > 0);

        // Can't create an allocation if the contribution phase is not in the ContributionPhase enum
        ContributionPhase _contributionPhase = ContributionPhase(_phase);
        require(_contributionPhase == ContributionPhase.PreSaleContribution ||
                _contributionPhase == ContributionPhase.PartnerContribution);


        uint256 totalAmount = _amount.add(_bonus);
        uint256 totalGrantedAllocation = 0;
        uint256 totalGrantedBonusAllocation = 0;

        // Fetch the allocation from the respective mapping and updates the granted amount of tokens
        if (_contributionPhase == ContributionPhase.PreSaleContribution) {
            totalGrantedAllocation = presaleAllocations[_contributor].amountGranted.add(_amount);
            totalGrantedBonusAllocation = presaleAllocations[_contributor].amountBonusGranted.add(_bonus);
            presaleAllocations[_contributor] = Allocation(totalGrantedAllocation, totalGrantedBonusAllocation, false);
        } else if (_contributionPhase == ContributionPhase.PartnerContribution) {
            totalGrantedAllocation = partnerAllocations[_contributor].amountGranted.add(_amount);
            totalGrantedBonusAllocation = partnerAllocations[_contributor].amountBonusGranted.add(_bonus);
            partnerAllocations[_contributor] = Allocation(totalGrantedAllocation, totalGrantedBonusAllocation, false);
        }

        // Updates the contract data
        totalPrivateAllocation = totalPrivateAllocation.add(totalAmount);

        AllocationGranted(_contributor, totalAmount, _phase);

        return true;
    }

    // The claimTokens() function handles the contribution token claim.
    // Tokens can only be claimed after we open this phase.
    // The lockouts periods are defined by the foundation.
    // There are 2 different lockouts:
    //      Presale lockout
    //      Partner lockout
    //
    // A contributor that has contributed in all the phases can claim
    // all its tokens, but only the ones that are accesible to claim
    // be transfered.
    // 
    // A contributor can claim its tokens after each phase has been opened
    function claimTokens() public payable returns (bool) {
        require(msg.sender != address(0));
        require(msg.sender != address(this));

        uint256 amountToTransfer = 0;

        // We need to check if the contributor has made a contribution on each
        // phase, presale and partner
        Allocation storage presaleA = presaleAllocations[msg.sender];
        if (presaleA.amountGranted > 0 && canClaimPresaleTokens) {
            amountToTransfer = amountToTransfer.add(presaleA.amountGranted);
            presaleA.amountGranted = 0;
        }

        Allocation storage partnerA = partnerAllocations[msg.sender];
        if (partnerA.amountGranted > 0 && canClaimPartnerTokens) {
            amountToTransfer = amountToTransfer.add(partnerA.amountGranted);
            partnerA.amountGranted = 0;
        }

        // The amount to transfer must greater than zero
        require(amountToTransfer > 0);

        // The amount to transfer must be less or equal to the current supply
        uint256 currentSupply = tokenContract.balanceOf(address(this));
        require(amountToTransfer <= currentSupply);
        
        // Transfer the token allocation to contributor
        require(tokenContract.transfer(msg.sender, amountToTransfer));
        AllocationClaimed(msg.sender, amountToTransfer);
    
        return true;
    }

    function claimBonus() external payable returns (bool) {
        require(msg.sender != address(0));
        require(msg.sender != address(this));

        uint256 amountToTransfer = 0;

        // BONUS PHASE 1
        Allocation storage presale = presaleAllocations[msg.sender];
        if (presale.amountBonusGranted > 0 && !presale.hasClaimedBonusTokens && canClaimPresaleBonusTokensPhase1) {
            uint256 amountPresale = presale.amountBonusGranted.div(2);
            amountToTransfer = amountPresale;
            presale.amountBonusGranted = amountPresale;
            presale.hasClaimedBonusTokens = true;
        }

        Allocation storage partner = partnerAllocations[msg.sender];
        if (partner.amountBonusGranted > 0 && !partner.hasClaimedBonusTokens && canClaimPartnerBonusTokensPhase1) {
            uint256 amountPartner = partner.amountBonusGranted.div(2);
            amountToTransfer = amountToTransfer.add(amountPartner);
            partner.amountBonusGranted = amountPartner;
            partner.hasClaimedBonusTokens = true;
        }

        // BONUS PHASE 2
        if (presale.amountBonusGranted > 0 && canClaimPresaleBonusTokensPhase2) {
            amountToTransfer = amountToTransfer.add(presale.amountBonusGranted);
            presale.amountBonusGranted = 0;
        }

        if (partner.amountBonusGranted > 0 && canClaimPartnerBonusTokensPhase2) {
            amountToTransfer = amountToTransfer.add(partner.amountBonusGranted);
            partner.amountBonusGranted = 0;
        }

        // The amount to transfer must greater than zero
        require(amountToTransfer > 0);

        // The amount to transfer must be less or equal to the current supply
        uint256 currentSupply = tokenContract.balanceOf(address(this));
        require(amountToTransfer <= currentSupply);
        
        // Transfer the token allocation to contributor
        require(tokenContract.transfer(msg.sender, amountToTransfer));
        AllocationBonusClaimed(msg.sender, amountToTransfer);

        return true;
    }

    // Updates the canClaimPresaleTokens propety with the new _canClaimTokens value
    function setCanClaimPresaleTokens(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPresaleTokens;
        canClaimPresaleTokens = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPresaleTokens", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the canClaimPartnerTokens property with the new _canClaimTokens value
    function setCanClaimPartnerTokens(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPartnerTokens;
        canClaimPartnerTokens = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPartnerTokens", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the canClaimBonusTokens property with the new _canClaimTokens value
    function setCanClaimPresaleBonusTokensPhase1(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPresaleBonusTokensPhase1;
        canClaimPresaleBonusTokensPhase1 = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPresaleBonusTokensPhase1", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the canClaimBonusTokens property with the new _canClaimTokens value
    function setCanClaimPresaleBonusTokensPhase2(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPresaleBonusTokensPhase2;
        canClaimPresaleBonusTokensPhase2 = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPresaleBonusTokensPhase2", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the canClaimBonusTokens property with the new _canClaimTokens value
    function setCanClaimPartnerBonusTokensPhase1(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPartnerBonusTokensPhase1;
        canClaimPartnerBonusTokensPhase1 = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPartnerBonusTokensPhase1", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the canClaimBonusTokens property with the new _canClaimTokens value
    function setCanClaimPartnerBonusTokensPhase2(bool _canClaimTokens) external onlyAdmin returns (bool) {
        bool _oldCanClaim = canClaimPartnerBonusTokensPhase2;
        canClaimPartnerBonusTokensPhase2 = _canClaimTokens;
        CanClaimTokensUpdated(msg.sender, "canClaimPartnerBonusTokensPhase2", _oldCanClaim, _canClaimTokens);
        return true;
    }

    // Updates the crowdsale contract property with the new _crowdsaleContract value
    function setCrowdsaleContract(Crowdsale _crowdsaleContract) public onlyOwner returns (bool) {
        address old_crowdsale_address = crowdsaleContract;

        crowdsaleContract = _crowdsaleContract;

        CrowdsaleContractUpdated(msg.sender, old_crowdsale_address, crowdsaleContract);

        return true;
    }
}