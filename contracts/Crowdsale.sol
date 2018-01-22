pragma solidity ^0.4.17;

import './J8TToken.sol';
import './ACLManaged.sol';
import './CrowdsaleConfig.sol';
import './Ledger.sol';

contract Crowdsale is ACLManaged, CrowdsaleConfig {

    using SafeMath for uint256;

    //////////////////////////
    // Crowdsale PROPERTIES //
    //////////////////////////

    // The J8TToken smart contract reference
    J8TToken public tokenContract;

    // The Ledger smart contract reference
    Ledger public ledgerContract;

    // The start token sale date represented as a timestamp
    uint256 public startTimestamp;

    // The end token sale date represented as a timestamp
    uint256 public endTimestamp;

    // Ratio of J8T tokens to per ether
    uint256 public tokensPerEther;

    // The total amount of tokens to be sold
    uint256 public saleSupply;

    // The total amount of wei raised in the token sale
    // Including presales (in eth) and public sale
    uint256 public weiRaised;

    // The current total amount of tokens sold in the token sale
    uint256 public totalTokensSold;

    // The minimum and maximum eth contribution accepted in the token sale
    uint256 public MIN_CONTRIBUTION;
    uint256 public MAX_CONTRIBUTION;

    // The wallet address where the token sale sends all eth contributions
    address public wallet;

    // Controls whether the token sale has finished or not
    bool public isFinalized = false;

    // Map of adresses that requested to purchase tokens
    // Contributors of the token sale are segmented as:
    //  CannotContribute: Cannot contribute in any phase (uint8  - 0)
    //  PreSaleContributor: Can contribute on both pre-sale and pubic sale phases (uint8  - 1)
    //  PublicSaleContributor: Can contribute on he public sale phase (uint8  - 2)
    mapping(address => WhitelistPermission) public whitelist;

    enum WhitelistPermission {
        CannotContribute, PreSaleContributor, PublicSaleContributor 
    }

    //////////////////////
    // Crowdsale EVENTS //
    //////////////////////

    // Triggered when a contribution in the public sale has been processed correctly
    event TokensPurchased(address _contributor, uint256 _amount);

    // Triggered when the whitelist has been updated
    event WhiteListUpdated(address _who, address _account, WhitelistPermission _phase);

    // Triggered when the Crowdsale has been created
    event ContractCreated();

    // Triggered when a presale has been added
    // The phase parameter can be a strategic partner contribution or a presale contribution
    event PresaleAdded(address _contributor, uint256 _amount, uint8 _phase);

    // Triggered when the tokensPerEther property has been updated
    event TokensPerEtherUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the startTimestamp property has been updated
    event StartTimestampUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the endTimestamp property has been updated
    event EndTimestampUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the wallet property has been updated
    event WalletUpdated(address _who, address _oldWallet, address _newWallet);

    // Triggered when the saleSupply property has been updated
    event SaleSupplyUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the MIN_CONTRIBUTION property has been updated
    event MinContributionUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the MAX_CONTRIBUTION property has been updated
    event MaxContributionUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the token sale has finalized
    event Finalized(address _who, uint256 _timestamp);

    // Triggered when the token sale has finalized and there where still token to sale
    // When the token are not sold, we burn them
    event Burned(address _who, uint256 _amount, uint256 _timestamp);

    /////////////////////////
    // Crowdsale FUNCTIONS //
    /////////////////////////
    

    // Crowdsale constructor
    // Takes default values from the CrowdsaleConfig smart contract
    function Crowdsale(
        J8TToken _tokenContract,
        Ledger _ledgerContract,
        address _wallet
    ) public
    {
        uint256 _start            = START_TIMESTAMP;
        uint256 _end              = END_TIMESTAMP;
        uint256 _supply           = TOKEN_SALE_SUPPLY;
        uint256 _min_contribution = MIN_CONTRIBUTION_WEIS;
        uint256 _max_contribution = MAX_CONTRIBUTION_WEIS;
        uint256 _tokensPerEther   = INITIAL_TOKENS_PER_ETHER;

        require(_start > currentTime());
        require(_end > _start);
        require(_tokensPerEther > 0);
        require(address(_tokenContract) != address(0));
        require(address(_ledgerContract) != address(0));
        require(_wallet != address(0));

        ledgerContract   = _ledgerContract;
        tokenContract    = _tokenContract;
        startTimestamp   = _start;
        endTimestamp     = _end;
        tokensPerEther   = _tokensPerEther;
        saleSupply       = _supply;
        MIN_CONTRIBUTION = _min_contribution;
        MAX_CONTRIBUTION = _max_contribution;
        wallet           = _wallet;
        totalTokensSold  = 0;
        weiRaised        = 0;
        isFinalized      = false;  

        ContractCreated();
    }

    // Updates the tokenPerEther propety with the new _tokensPerEther value
    function setTokensPerEther(uint256 _tokensPerEther) external onlyAdmin onlyBeforeSale returns (bool) {
        return updateTokensPerEther(_tokensPerEther);
    }

    // Used for internal testing
    function forceTokensPerEther(uint256 _tokensPerEther) external onlyOwner returns (bool) {
        return updateTokensPerEther(_tokensPerEther);
    }

    // Updates the startTimestamp propety with the new _start value
    function setStartTimestamp(uint256 _start) external onlyAdmin returns (bool) {
        require(_start > currentTime());

        uint256 _oldValue = startTimestamp;
        startTimestamp = _start;

        StartTimestampUpdated(msg.sender, _oldValue, startTimestamp);

        return true;
    }

    // Updates the endTimestamp propety with the new _end value
    function setEndTimestamp(uint256 _end) external onlyAdmin returns (bool) {
        require(_end > startTimestamp);

        uint256 _oldValue = endTimestamp;
        endTimestamp = _end;

        EndTimestampUpdated(msg.sender, _oldValue, endTimestamp);
        
        return true;
    }

    // Updates the wallet propety with the new _newWallet value
    function updateWallet(address _newWallet) external onlyAdmin returns (bool) {
        require(_newWallet != address(0));
        
        address _oldValue = wallet;
        wallet = _newWallet;
        
        WalletUpdated(msg.sender, _oldValue, wallet);
        
        return true;
    }

    // Updates the saleSupply propety with the new _newSaleSupply value
    function setSaleSupply(uint256 _newSaleSupply) external onlyAdmin returns (bool) {
        uint256 _oldValue = saleSupply;
        saleSupply = _newSaleSupply;
       
        SaleSupplyUpdated(msg.sender, _oldValue, saleSupply);
        
        return true;
    }

    // Updates the MIN_CONTRIBUTION propety with the new _newMinControbution value
    function setMinContribution(uint256 _newMinContribution) external onlyAdmin returns (bool) {
        uint256 _oldValue = MIN_CONTRIBUTION;
        MIN_CONTRIBUTION = _newMinContribution;
        
        MinContributionUpdated(msg.sender, _oldValue, MIN_CONTRIBUTION);
        
        return true;
    }

    // Updates the MAX_CONTRIBUTION propety with the new _newMaxContribution value
    function setMaxContribution(uint256 _newMaxContribution) external onlyAdmin returns (bool) {
        uint256 _oldValue = MAX_CONTRIBUTION;
        MAX_CONTRIBUTION = _newMaxContribution;
        
        MaxContributionUpdated(msg.sender, _oldValue, MAX_CONTRIBUTION);
        
        return true;
    }

    // Main public function.
    function () external payable {
        purchaseTokens();
    }

    // Revokes a presale allocation from the contributor with address _contributor
    // Updates the totalTokensSold property substracting the amount of tokens that where previously allocated
    function revokePresale(address _contributor, uint8 _contributorPhase) external payable onlyAdmin returns (bool) {
        require(_contributor != address(0));

        uint256 luckys = ledgerContract.revokeAllocation(_contributor, _contributorPhase);
        
        require(luckys > 0);
        require(luckys <= totalTokensSold);
        
        totalTokensSold = totalTokensSold.sub(luckys);
        
        return true;
    }

    // Adds a new presale allocation for the contributor with address _contributor
    // We can only allocate presale before the token sale has been initialized
    function addPresale(address _contributor, uint256 _tokens, uint8 _contributorPhase) external payable onlyAdmin onlyBeforeSale returns (bool) {
        require(_tokens > 0);

        // Converts the amount of tokens to our smallest J8T value, lucky
        uint256 luckys = _tokens.mul(J8T_DECIMALS_FACTOR);
        uint256 availableTokensToPurchase = saleSupply.sub(totalTokensSold);
        require(luckys <= availableTokensToPurchase);

        // Insert the new allocation to the Ledger
        require(ledgerContract.addAllocation(_contributor, luckys, _contributorPhase));
        // Transfers the tokens form the Crowdsale contract to the Ledger contract
        require(tokenContract.transfer(address(ledgerContract), luckys));

        // Updates totalTokensSold property
        totalTokensSold = totalTokensSold.add(luckys);

        // If we reach the total amount of tokens to sell we finilize the token sale
        if (totalTokensSold == saleSupply) {
            finalization();
        }

        // Trigger PresaleAdded event
        PresaleAdded(_contributor, luckys, _contributorPhase);
    }

    // The purchaseTokens function handles the token purchase flow
    function purchaseTokens() public payable onlyDuringSale returns (bool) {
        address contributor  = msg.sender;
        uint256 weiAmount    = msg.value;

        // The contributor address must be whitelisted in order to be able to purchase tokens
        require(contributorCanContribute(contributor));
        // The weiAmount must be greater or equal than MIN_CONTRIBUTION
        require(weiAmount >= MIN_CONTRIBUTION);
        // The weiAmount cannot be greater than MAX_CONTRIBUTION
        require(weiAmount <= MAX_CONTRIBUTION);
        // The saleSupply must be greater than totalTokensSold
        require(totalTokensSold < saleSupply);

        // We need to convert the tokensPerEther to luckys (10**8)
        uint256 luckyPerEther = tokensPerEther.mul(J8T_DECIMALS_FACTOR);

        // In order to calculate the tokens amoun to be allocated to the contrbutor
        // we need to multiply the amount of wei sent by luckyPerEther and divide the
        // result for the ether decimal factor (10**18)
        uint256 tokensAmount = weiAmount.mul(luckyPerEther).div(ETH_DECIMALS_FACTOR);
        

        uint256 refund = 0;
        uint256 tokensToPurchase = tokensAmount;
        uint256 availableTokensToPurchase = saleSupply.sub(totalTokensSold);
        
        // If the token purchase amount is bigger than the remaining token allocation
        // we can only sell the remainging tokens and refund the unused amount of eth
        if (availableTokensToPurchase < tokensAmount) {
            tokensToPurchase = availableTokensToPurchase;
            weiAmount = tokensToPurchase.mul(ETH_DECIMALS_FACTOR).div(luckyPerEther);
            refund = msg.value.sub(weiAmount);
        }

        // We update the token sale contract data
        totalTokensSold = totalTokensSold.add(tokensToPurchase);
        uint256 weiToPurchase = tokensToPurchase.div(tokensPerEther);
        weiRaised = weiRaised.add(weiToPurchase);

        // Insert the new allocation to the Ledger
        // we set the contribution phase as public (uint8 0)
        require(ledgerContract.addAllocation(contributor, tokensToPurchase, 0));
        // Transfers the tokens form the Crowdsale contract to the Ledger contract
        require(tokenContract.transfer(address(ledgerContract), tokensToPurchase));

        // Issue a refund for any unused ether 
        if (refund > 0) {
            contributor.transfer(refund);
        }

        // Transfer ether contribution to the wallet
        wallet.transfer(weiAmount);

        TokensPurchased(contributor, tokensToPurchase);

        // If we reach the total amount of tokens to sell we finilize the token sale
        if (totalTokensSold == saleSupply) {
            finalization();
        }

        return true;
    }

    // Updates the whitelist
    function updateWhitelist(address _account, WhitelistPermission _permission) external onlyAdmin returns (bool) {
        require(_account != address(0));
        require(_permission == WhitelistPermission.PreSaleContributor || _permission == WhitelistPermission.PublicSaleContributor || _permission == WhitelistPermission.CannotContribute);
        require(!saleHasFinished());

        whitelist[_account] = _permission;

        address _who = msg.sender;
        WhiteListUpdated(_who, _account, _permission);

        return true;
    }

    // Checks that the status of an address account
    // Contributors of the token sale are segmented as:
    //  PreSaleContributor: Can contribute on both pre-sale and pubic sale phases
    //  PublicSaleContributor: Can contribute on he public sale phase
    //  CannotContribute: Cannot contribute in any phase
    function contributorCanContribute(address _contributorAddress) private view returns (bool) {
        WhitelistPermission _contributorPhase = whitelist[_contributorAddress];

        if (_contributorPhase == WhitelistPermission.CannotContribute) {
            return false;
        }

        if (_contributorPhase == WhitelistPermission.PreSaleContributor || 
            _contributorPhase == WhitelistPermission.PublicSaleContributor) {
            return true;
        }

        return false;
    }

    // Returns the current time
    function currentTime() public view returns (uint256) {
        return now;
    }

    // Checks if the sale has finished
    function saleHasFinished() public view returns (bool) {
        if (isFinalized) {
            return true;
        }

        if (endTimestamp < currentTime()) {
            return true;
        }

        if (saleSupply <= totalTokensSold) {
            return true;
        }

        return false;
    }

    modifier onlyBeforeSale() {
        require(currentTime() < startTimestamp);
        _;
    }

    modifier onlyDuringSale() {
        uint256 _currentTime = currentTime();
        require(startTimestamp < _currentTime);
        require(_currentTime < endTimestamp);
        _;
    }

    modifier onlyPostSale() {
        require(endTimestamp < currentTime());
        _;
    }

    ///////////////////////
    // PRIVATE FUNCTIONS //
    ///////////////////////

    function updateTokensPerEther(uint256 _tokensPerEther) private returns (bool) {
        require(_tokensPerEther > 0);

        uint256 _oldValue = tokensPerEther;
        tokensPerEther = _tokensPerEther;

        TokensPerEtherUpdated(msg.sender, _oldValue, tokensPerEther);
        return true;
    }

    // This method is for to be called only for the owner. This way we protect for anyone who wanna finalize the ICO.
    function finalize() external onlyAdmin returns (bool) {
        return finalization();
    }

    // Only used by finalize and setFinalized.
    // Overloaded logic for two uses.
    // NOTE: In case finalize is called by an user and not from addPresale()/purchaseToken()
    // will diff total supply with sold supply to burn token.
    function finalization() private returns (bool) {
        require(!isFinalized);

        isFinalized = true;

        if (totalTokensSold != saleSupply) {
            uint256 burnable_amount = saleSupply.sub(totalTokensSold);
            tokenContract.burn(burnable_amount);
            saleSupply = saleSupply.sub(burnable_amount);
            Burned(msg.sender, burnable_amount, currentTime());
        }

        Finalized(msg.sender, currentTime());

        return true;
    }
}
