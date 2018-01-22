'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');
const Utils = require('./lib/Utils.js')

var J8TToken = artifacts.require('J8TToken');
var Crowdsale = artifacts.require('Crowdsale');
var Ledger = artifacts.require('Ledger');

contract('Crowdsale - Finalization', function (accounts) {

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const DECIMALSFACTOR     = new BigNumber('10').pow('8')
    const DECIMALSFACTOR_ETH = new BigNumber('10').pow('18')

    const END_TIME                  = Moment().add('1', 'days').unix();
    const MIN_ETH                   = 0.1
    const MAX_ETH                   = 10
    const CONTRIBUTION_MIN          = web3.toWei(MIN_ETH, "ether")
    const CONTRIBUTION_MAX          = web3.toWei(MAX_ETH, "ether")

    const dollar_per_token   = 0.01;
    const dollars_per_ether  = 400;
    const TOKENS_PER_ETHER   = new BigNumber(dollars_per_ether / dollar_per_token);
    const TOKENS_PER_WEI     = new BigNumber(TOKENS_PER_ETHER.mul(DECIMALSFACTOR));
    const TOKEN_SALE_SUPPLY  = new BigNumber('1100000').mul(DECIMALSFACTOR);
    const contributorAddress = accounts[1]
    const wallet = accounts[9];

    var accomulatedTokens = new BigNumber(0);
    var accomulatedEth = new BigNumber(0);

    let token;
    let sale;
    let ledger;
    let initialWalletBalance;

    beforeEach(async () => {
        token           = await J8TToken.new({ from: accounts[0], gas: 3500000 })
        var totalTokens = new BigNumber(TOKEN_SALE_SUPPLY)
        ledger          = await Ledger.new(token.address, { from: accounts[0], gas: 3500000 })
        sale            = await Crowdsale.new(
            token.address,
            ledger.address,
            wallet,
            { from: accounts[0], gas: 4500000 }
        );
        await sale.forceTokensPerEther(TOKENS_PER_ETHER);
        await sale.setAdminAddress(accounts[0])
        await sale.setStartTimestamp(Moment().add('1', 'second').unix());
        await sale.setEndTimestamp(END_TIME);
        await sale.setSaleSupply(totalTokens);
        await sale.setMinContribution(CONTRIBUTION_MIN);
        await sale.setMaxContribution(CONTRIBUTION_MAX);
        await ledger.setOpsAddress(sale.address);
        await token.transfer(sale.address, totalTokens, { from: accounts[0] })
    })

    it('should finalize when everything is sold', async function () {

        await sleep(3000)

        let contributorPermissions = 2 // 1 equals to WhitelistPermission.PublicContributor
        await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[3], contributorPermissions, {from: accounts[0]})

        initialWalletBalance = await Utils.getBalance(accounts[9])
        await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MAX})
        const {logs} = await sale.purchaseTokens({from: accounts[3], value: CONTRIBUTION_MAX})
        const event_finalized  = logs.find(e => e.event == "Finalized");
        assert.notEqual(event_finalized, undefined);
        const event_burned     = logs.find(e => e.event == "Burned");
        assert.equal(event_burned, undefined);

        let isFinalized = await sale.isFinalized();
        assert.equal(isFinalized, true);
    })

    it ('should finalize and burn when admin triggers finalize and not everything is sold', async function () {
        
        await sleep(3000)

        let contributorPermissions = 2 // 1 equals to WhitelistPermission.PublicContributor
        await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
        await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})

        initialWalletBalance = await Utils.getBalance(accounts[9])
        await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MAX})
        await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MAX})

        const sale_supply            = (await sale.saleSupply()).toNumber();
        const tokens_sold            = (await sale.totalTokensSold()).toNumber()
        const expected_burned_amount = sale_supply - tokens_sold;
        const token_supply           = (await token.totalSupply()).toNumber()

        //Finalize & Logs
        const {logs} = await sale.finalize({from: accounts[0]});
        const event_finalized  = logs.find(e => e.event == "Finalized");
        assert.notEqual(event_finalized, undefined);
        const event_burned     = logs.find(e => e.event == "Burned");
        assert.notEqual(event_burned, undefined);

        //Amounts status
        const token_supply_after_burn = (await token.totalSupply()).toNumber()
        const sale_supply_after_burn  = (await sale.saleSupply()).toNumber();
        assert.equal(token_supply_after_burn, token_supply - expected_burned_amount);
        assert.equal(sale_supply_after_burn, sale_supply - expected_burned_amount);
    })
});