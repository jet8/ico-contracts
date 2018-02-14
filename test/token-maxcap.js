'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');
const Utils = require('./lib/Utils.js')

var J8TToken = artifacts.require('J8TToken');
var Crowdsale = artifacts.require('Crowdsale');
var Ledger = artifacts.require('Ledger');

contract('Crowdsale', function (accounts) {

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const DECIMALSFACTOR = new BigNumber('10').pow('8')

    const START_TIME                = Moment().add('100', 'second').unix();
    const END_TIME                  = Moment().add('1', 'days').unix();
    const MIN_ETH                   = 0.1
    const MAX_ETH                   = 10
    const CONTRIBUTION_MIN          = web3.toWei(MIN_ETH, "ether")
    const CONTRIBUTION_MAX          = web3.toWei(MAX_ETH, "ether")

    const dollar_per_token   = 0.1;
    const dollars_per_ether  = 400;
    const TOKENS_PER_ETHER  = new BigNumber(dollars_per_ether / dollar_per_token);
    const TOKENS_PER_WEI = new BigNumber(TOKENS_PER_ETHER.mul(DECIMALSFACTOR));
    const TOKEN_SALE_SUPPLY  = new BigNumber('450000000').mul(DECIMALSFACTOR);
    const wallet = accounts[5];

    var accomulatedTokens = new BigNumber(0);
    var accomulatedEth = new BigNumber(0);

    var tokensAmount = new BigNumber(40000);
    var bonusTokensAmount = new BigNumber(15000);

    let token;
    let sale;
    let ledger;

    describe('Individuals hardcaps', () => {
        before(async () => {
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
            await sale.setStartTimestamp(START_TIME);
            await sale.setEndTimestamp(END_TIME);
            await sale.setMinContribution(CONTRIBUTION_MIN);
            await sale.setMaxContribution(CONTRIBUTION_MAX);
            await ledger.setOpsAddress(sale.address);
            await token.transfer(sale.address, totalTokens, { from: accounts[0] })
        })

        it('should allow contributor purchase tokens', async function () {
            let contributorPermissions = 1 // 1 equals to WhitelistPermission.PreSaleContributor
            await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
            await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})

            var timestamp = Moment().add('1', 'second').unix();
            await sale.setStartTimestamp(timestamp);
            await sleep(2000);

            await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MIN})
            await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MIN})
        });

        it('should not allow contributor purchase tokens for a second time', async function () {
        
            try {
                await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MIN})
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);

                return;
            }
            assert(false, "Did not throw as expected");
        });
    });
});