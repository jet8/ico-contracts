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

    // The total amount of wei raised in the token sale
    // Including presales (in eth) and public sale
    uint256 public weiRaised;

    // The current total amount of tokens sold in the token sale
    uint256 public totalTokensSold;

    // The minimum and maximum eth contribution accepted in the token sale
    uint256 public minContribution;
    uint256 public maxContribution;

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

    // Map of addresses that has already contributed on the token sale
    mapping(address => bool) public hasContributed;

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

    // Triggered when the minContribution property has been updated
    event MinContributionUpdated(address _who, uint256 _oldValue, uint256 _newValue);

    // Triggered when the maxContribution property has been updated
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
        minContribution = _min_contribution;
        maxContribution = _max_contribution;
        wallet           = _wallet;
        totalTokensSold  = 0;
        weiRaised        = 0;
        isFinalized      = false;  

        ContractCreated();
    }

    // Updates the tokenPerEther propety with the new _tokensPerEther value
    function setTokensPerEther(uint256 _tokensPerEther) external onlyAdmin onlyBeforeSale returns (bool) {
        require(_tokensPerEther > 0);

        uint256 _oldValue = tokensPerEther;
        tokensPerEther = _tokensPerEther;

        TokensPerEtherUpdated(msg.sender, _oldValue, tokensPerEther);
        return true;
    }

    // Updates the startTimestamp propety with the new _start value
    function setStartTimestamp(uint256 _start) external onlyAdmin returns (bool) {
        require(_start < endTimestamp);
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

    // Updates the minContribution propety with the new _newMinControbution value
    function setMinContribution(uint256 _newMinContribution) external onlyAdmin returns (bool) {
        require(_newMinContribution <= maxContribution);

        uint256 _oldValue = minContribution;
        minContribution = _newMinContribution;
        
        MinContributionUpdated(msg.sender, _oldValue, minContribution);
        
        return true;
    }

    // Updates the maxContribution propety with the new _newMaxContribution value
    function setMaxContribution(uint256 _newMaxContribution) external onlyAdmin returns (bool) {
        require(_newMaxContribution > minContribution);

        uint256 _oldValue = maxContribution;
        maxContribution = _newMaxContribution;
        
        MaxContributionUpdated(msg.sender, _oldValue, maxContribution);
        
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

        // We can only revoke allocations from pre sale or strategic partners
        // ContributionPhase.PreSaleContribution == 1,  ContributionPhase.PartnerContribution == 1
        require(_contributorPhase == 0 || _contributorPhase == 1);

        uint256 luckys = ledgerContract.revokeAllocation(_contributor, _contributorPhase);
        
        require(luckys > 0);
        require(luckys <= totalTokensSold);
        
        totalTokensSold = totalTokensSold.sub(luckys);
        
        return true;
    }

    // Adds a new presale allocation for the contributor with address _contributor
    // We can only allocate presale before the token sale has been initialized
    function addPresale(address _contributor, uint256 _tokens, uint256 _bonus, uint8 _contributorPhase) external payable onlyAdminAndOps onlyBeforeSale returns (bool) {
        require(_tokens > 0);
        require(_bonus > 0);

        // Converts the amount of tokens to our smallest J8T value, lucky
        uint256 luckys = _tokens.mul(J8T_DECIMALS_FACTOR);
        uint256 bonusLuckys = _bonus.mul(J8T_DECIMALS_FACTOR);
        uint256 totalTokens = luckys.add(bonusLuckys);

        uint256 availableTokensToPurchase = tokenContract.balanceOf(address(this));
        
        require(totalTokens <= availableTokensToPurchase);

        // Insert the new allocation to the Ledger
        require(ledgerContract.addAllocation(_contributor, luckys, bonusLuckys, _contributorPhase));
        // Transfers the tokens form the Crowdsale contract to the Ledger contract
        require(tokenContract.transfer(address(ledgerContract), totalTokens));

        // Updates totalTokensSold property
        totalTokensSold = totalTokensSold.add(totalTokens);

        // If we reach the total amount of tokens to sell we finilize the token sale
        availableTokensToPurchase = tokenContract.balanceOf(address(this));
        if (availableTokensToPurchase == 0) {
            finalization();
        }

        // Trigger PresaleAdded event
        PresaleAdded(_contributor, totalTokens, _contributorPhase);
    }

    // The purchaseTokens function handles the token purchase flow
    function purchaseTokens() public payable onlyDuringSale returns (bool) {
        address contributor = msg.sender;
        uint256 weiAmount = msg.value;

        // A contributor can only contribute once on the public sale
        require(hasContributed[contributor] == false);
        // The contributor address must be whitelisted in order to be able to purchase tokens
        require(contributorCanContribute(contributor));
        // The weiAmount must be greater or equal than minContribution
        require(weiAmount >= minContribution);
        // The weiAmount cannot be greater than maxContribution
        require(weiAmount <= maxContribution);
        // The availableTokensToPurchase must be greater than 0
        uint256 availableTokensToPurchase = tokenContract.balanceOf(address(this));
        require(availableTokensToPurchase > 0);

        // We need to convert the tokensPerEther to luckys (10**8)
        uint256 luckyPerEther = tokensPerEther.mul(J8T_DECIMALS_FACTOR);

        // In order to calculate the tokens amount to be allocated to the contrbutor
        // we need to multiply the amount of wei sent by luckyPerEther and divide the
        // result for the ether decimal factor (10**18)
        uint256 tokensAmount = weiAmount.mul(luckyPerEther).div(ETH_DECIMALS_FACTOR);
        

        uint256 refund = 0;
        uint256 tokensToPurchase = tokensAmount;
        
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

        // Transfers the tokens form the Crowdsale contract to the Ledger contract
        require(tokenContract.transfer(contributor, tokensToPurchase));

        // Issue a refund for any unused ether 
        if (refund > 0) {
            contributor.transfer(refund);
        }

        // Transfer ether contribution to the wallet
        wallet.transfer(weiAmount);

        // Update hasContributed mapping
        hasContributed[contributor] = true;

        TokensPurchased(contributor, tokensToPurchase);

        // If we reach the total amount of tokens to sell we finilize the token sale
        availableTokensToPurchase = tokenContract.balanceOf(address(this));
        if (availableTokensToPurchase == 0) {
            finalization();
        }

        return true;
    }

    // Updates the whitelist
    function updateWhitelist(address _account, WhitelistPermission _permission) external onlyAdminAndOps returns (bool) {
        require(_account != address(0));
        require(_permission == WhitelistPermission.PreSaleContributor || _permission == WhitelistPermission.PublicSaleContributor || _permission == WhitelistPermission.CannotContribute);
        require(!saleHasFinished());

        whitelist[_account] = _permission;

        address _who = msg.sender;
        WhiteListUpdated(_who, _account, _permission);

        return true;
    }

    function updateWhitelist_batch(address[] _accounts, WhitelistPermission _permission) external onlyAdminAndOps returns (bool) {
        require(_permission == WhitelistPermission.PreSaleContributor || _permission == WhitelistPermission.PublicSaleContributor || _permission == WhitelistPermission.CannotContribute);
        require(!saleHasFinished());

        for(uint i = 0; i < _accounts.length; ++i) {
            require(_accounts[i] != address(0));
            whitelist[_accounts[i]] = _permission;
            WhiteListUpdated(msg.sender, _accounts[i], _permission);
        }

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

        uint256 availableTokensToPurchase = tokenContract.balanceOf(address(this));
        if (availableTokensToPurchase == 0) {
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

        uint256 availableTokensToPurchase = tokenContract.balanceOf(address(this));
        
        if (availableTokensToPurchase > 0) {
            tokenContract.burn(availableTokensToPurchase);
            Burned(msg.sender, availableTokensToPurchase, currentTime());
        }

        Finalized(msg.sender, currentTime());

        return true;
    }

    function saleSupply() public view returns (uint256) {
        return tokenContract.balanceOf(address(this));
    }
}
