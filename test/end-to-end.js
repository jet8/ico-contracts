'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');
const Utils = require('./lib/Utils.js')

var J8TToken = artifacts.require('J8TToken');
var Crowdsale = artifacts.require('Crowdsale');
var Ledger = artifacts.require('Ledger');

contract('Crowdsale - Refund', function (accounts) {

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const DECIMALSFACTOR = new BigNumber('10').pow('8')
    const DECIMALSFACTOR_ETH = new BigNumber('10').pow('18')

    const END_TIME                  = Moment().add('1', 'days').unix();
    const MIN_ETH                   = 0.1
    const MAX_ETH                   = 1
    const CONTRIBUTION_MIN          = web3.toWei(MIN_ETH, "ether")
    const CONTRIBUTION_MAX          = web3.toWei(MAX_ETH, "ether")

    const dollar_per_token   = 0.01;
    const dollars_per_ether  = 800000;
    const TOKENS_PER_ETHER  = new BigNumber(dollars_per_ether / dollar_per_token);
    const TOKENS_PER_WEI = new BigNumber(TOKENS_PER_ETHER.mul(DECIMALSFACTOR));
    const TOKEN_SALE_SUPPLY  = new BigNumber('450000000').mul(DECIMALSFACTOR);
    const contributorAddress = accounts[1]
    const wallet = accounts[9];

    var accomulatedTokens = new BigNumber(0);
    var accomulatedEth = new BigNumber(0);

    let token;
    let sale;
    let ledger;
    let initialWalletBalance;

    beforeEach(async () => {
        token = await J8TToken.new({ from: accounts[0], gas: 4500000 })
        var totalTokens = new BigNumber(TOKEN_SALE_SUPPLY)
        ledger = await Ledger.new(token.address, { from: accounts[0], gas: 4500000 })
        sale  = await Crowdsale.new(
            token.address,
            ledger.address,
            wallet,
            { from: accounts[0], gas: 4500000 }
        );
        await sale.setAdminAddress(accounts[0])
        await sale.setTokensPerEther(TOKENS_PER_ETHER);
        await sale.setStartTimestamp(Moment().add('1', 'second').unix());
        await sale.setEndTimestamp(END_TIME);
        await sale.setMinContribution(CONTRIBUTION_MIN);
        await sale.setMaxContribution(CONTRIBUTION_MAX);
        await ledger.setOpsAddress(sale.address);
        await token.transfer(sale.address, totalTokens, { from: accounts[0] })
    })

    it('should refund unused ETH', async function () {
        await sleep(3000)
        
        let contributorPermissions = 2 // 1 equals to WhitelistPermission.PublicContributor
        await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[3], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[4], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[5], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[6], contributorPermissions, {from: accounts[0]})

        initialWalletBalance = await Utils.getBalance(accounts[9])

        await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[3], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[4], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[5], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[6], value: CONTRIBUTION_MAX})
        
        // Crowdsale has allocated the total token sale supply
        var tokenBalance = await token.balanceOf(sale.address)
        var isEqual = tokenBalance.equals(0)
        assert(isEqual)

        // The funds wallet has received the total amount of ETH
        var walletEthBalance = await Utils.getBalance(accounts[9])
        var isEqual = walletEthBalance.sub(initialWalletBalance).equals(new BigNumber('5.625').mul(DECIMALSFACTOR_ETH))
        assert(isEqual)
    });

    it('should refund unused ETH', async function () {
        await sleep(3000)
        var tokens = 1000000
        
        let contributorPermissions = 2 // 1 equals to WhitelistPermission.PublicContributor
        await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[3], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[4], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[5], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[6], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[7], contributorPermissions, {from: accounts[0]})

        initialWalletBalance = await Utils.getBalance(accounts[9])

        await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MAX})
        var walletBalance9Old = await token.balanceOf(accounts[1])   
        await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[3], value: CONTRIBUTION_MAX})
        
        await token.transfer(sale.address, tokens, {from: accounts[1]})
        
        await sale.purchaseTokens({from: accounts[4], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[5], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[6], value: CONTRIBUTION_MAX})
        
        // Crowdsale has allocated the total token sale supply
        var tokenBalance = await token.balanceOf(sale.address)
        var isEqual = tokenBalance.equals(tokens)
        assert(isEqual)

        // The funds wallet has received the total amount of ETH
        var walletEthBalance = await Utils.getBalance(accounts[9])
        var isEqual = walletEthBalance.sub(initialWalletBalance).equals(new BigNumber('5.625').mul(DECIMALSFACTOR_ETH))
        assert(isEqual)

        var walletBalance9 = await token.balanceOf(accounts[1]) 
        isEqual = walletBalance9.equals(walletBalance9Old.sub(tokens))
        assert(isEqual)


        try {
            await sale.purchaseTokens({from: accounts[7], value: CONTRIBUTION_MIN})
        } catch (error) {
            assert(true, `Expected throw, but got ${error} instead`)
            return
        }
    });
})