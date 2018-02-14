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
    const contributorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    const wallet = accounts[5];

    var accomulatedTokens = new BigNumber(0);
    var accomulatedEth = new BigNumber(0);

    var tokensAmount = new BigNumber(40000);
    var bonusTokensAmount = new BigNumber(15000);

    let token;
    let sale;
    let ledger;

    describe('Whitelist Permissions', () => {
        describe('Updates', () => {
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

            it('should add pre-sale contributor to whitlist', async function () {
                let contributorPermissions = 1 // 1 equals to WhitelistPermission.PreSaleContributor
                await sale.updateWhitelist(contributorAddress, contributorPermissions, {from: accounts[0]})
            });

            it('should add public sale contributor to whitlist', async function () {
                let contributorPermissions = 2 // 2 equals to WhitelistPermission.PublicSaleContributor
                await sale.updateWhitelist(contributorAddress, contributorPermissions, {from: accounts[0]})
            });

            it('should add a blacklisted contributor to whitlist', async function () {
                let contributorPermissions = 0 // 0 equals to WhitelistPermission.CannotContribute
                await sale.updateWhitelist(contributorAddress, contributorPermissions, {from: accounts[0]})
            });

            it('should not add a contributor with incorrect contributing phase to whitlist', async function () {
                let contributorPermissions = -1 // -1 not a WhitelistPermission value

                try {
                    await sale.updateWhitelist(contributorAddress, contributorPermissions, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }

                assert(false, "Did not throw as expected");
            });

            it('should not allow a non ops user to updateWhiteList', async function () {
                let contributorPermissions = 1;
                try {
                    await sale.updateWhitelist(contributorAddress, contributorPermissions, {from: accounts[1]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);
                    return;
                }
                assert(false, "Did not throw as expected");
            })

            it('should not add batch array with invalid contributor phase', async function() {
                let contributorPermissions = 4;
                let contributors = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
                try {
                    await sale.updateWhitelist_batch(contributors, contributorPermissions, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);
                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should add batch array', async function () {
                let contributorPermissions = 2;
                let contributors = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
                await sale.updateWhitelist_batch(contributors, contributorPermissions, {from: accounts[0]})
            });
        });

        describe('Buy Tokens', () => {
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

            it('should not allow contributor purchase tokens before starts token sale', async function () {
                let contributorPermissions = 1 // 1 equals to WhitelistPermission.PreSaleContributor
                await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})

                try {
                    await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MIN})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should allow pre-sale contributor purchase tokens', async function () {
                var timestamp = Moment().add('1', 'second').unix();
                await sale.setStartTimestamp(timestamp);
                await sleep(3000);
                let contributorPermissions = 1 // 1 equals to WhitelistPermission.PreSaleContributor
                await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})
                await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MIN})
                
                var tokenBalance = await token.balanceOf(ledger.address)
                accomulatedTokens = accomulatedTokens.add(TOKENS_PER_WEI.mul(MIN_ETH))
                var isEqual = tokenBalance.equals(accomulatedTokens)
                assert(isEqual)
            });

            it('should allow public sale contributor purchase tokens', async function () {
                let contributorPermissions = 2 // 2 equals to WhitelistPermission.PublicSaleContributor
                await sale.updateWhitelist(accounts[2], contributorPermissions, {from: accounts[0]})
                await sale.purchaseTokens({from: accounts[2], value: CONTRIBUTION_MAX})
                
                var tokenBalance = await token.balanceOf(ledger.address)
                accomulatedTokens = accomulatedTokens.add(TOKENS_PER_WEI.mul(MAX_ETH))
                assert(tokenBalance.equals(accomulatedTokens))
            });

            it('should not allow blacklisted contributor purchase tokens', async function () {
                let contributorPermissions = 0 // 0 equals to WhitelistPermission.CannotContribute
                await sale.updateWhitelist(accounts[1], contributorPermissions, {from: accounts[0]})

                try {
                    await sale.purchaseTokens({from: accounts[1], value: CONTRIBUTION_MIN})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should not allow a not whitlisted contributor purchase tokens', async function () {
                try {
                    await sale.purchaseTokens({from: accounts[3], value: CONTRIBUTION_MIN})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });
        });

        describe('Add Presales', () => {

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
                await sale.setAdminAddress(accounts[0]);
                await sale.setTokensPerEther(TOKENS_PER_ETHER);
                await sale.setStartTimestamp(START_TIME);
                await sale.setEndTimestamp(END_TIME);
                await sale.setMinContribution(CONTRIBUTION_MIN);
                await sale.setMaxContribution(CONTRIBUTION_MAX);
                await ledger.setOpsAddress(sale.address);
                await token.transfer(sale.address, totalTokens, { from: accounts[0] })
            })

            // Contribution Phases
            // Public = 0
            // Presale = 1
            // Partner = 2

            it('should not add presale contribution - invalid bonus amount', async function() {
                try {
                    await sale.addPresale(accounts[1], tokensAmount, 0, 2, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should not add partner contribution with invalid amount', async function () {
                try {
                    await sale.addPresale(accounts[1], 0, bonusTokensAmount, 2, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should not add partner contribution with invalid phase', async function () {
                try {
                    await sale.addPresale(accounts[1], tokensAmount, bonusTokensAmount, 3, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should add presale contribution', async function () {
                var saleBalance = await token.balanceOf(sale.address)
                var ledgerBalance = await token.balanceOf(ledger.address)

                await sale.addPresale(accounts[1], tokensAmount, bonusTokensAmount, 1, {from: accounts[0]})

                var currentSaleBalance = await token.balanceOf(sale.address)
                var currentLedgerBalance = await token.balanceOf(ledger.address)

                var isEqual = currentSaleBalance.equals(saleBalance.sub(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)

                var isEqual = currentLedgerBalance.equals(ledgerBalance.add(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)
            });

            it('should add partner contribution', async function () {
                var saleBalance = await token.balanceOf(sale.address)
                var ledgerBalance = await token.balanceOf(ledger.address)

                await sale.addPresale(accounts[1], tokensAmount, bonusTokensAmount, 2, {from: accounts[0]})
                
                var currentSaleBalance = await token.balanceOf(sale.address)
                var currentLedgerBalance = await token.balanceOf(ledger.address)

                var isEqual = currentSaleBalance.equals(saleBalance.sub(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)

                var isEqual = currentLedgerBalance.equals(ledgerBalance.add(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)
            });
        });

        describe('Revoke Presales', () => {

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
                await sale.setAdminAddress(accounts[0]);
                await sale.setTokensPerEther(TOKENS_PER_ETHER);
                await sale.setStartTimestamp(START_TIME);
                await sale.setEndTimestamp(END_TIME);
                await sale.setMinContribution(CONTRIBUTION_MIN);
                await sale.setMaxContribution(CONTRIBUTION_MAX);
                await ledger.setOpsAddress(sale.address);
                await ledger.setCrowdsaleContract(sale.address, {from: accounts[0], gas: 3500000 });
                await token.transfer(sale.address, totalTokens, { from: accounts[0] })
            })

            // Contribution Phases
            // Public = 0
            // Presale = 1
            // Partner = 2

            it('should add presales', async function () {
                await sale.addPresale(accounts[1], tokensAmount, bonusTokensAmount, 1, {from: accounts[0]})
                await sale.addPresale(accounts[1], tokensAmount, bonusTokensAmount, 2, {from: accounts[0]})
                await sale.addPresale(accounts[2], tokensAmount, bonusTokensAmount, 2, {from: accounts[0]})
            });

            it('should revoke presale allocation', async function () {
                var saleBalance = await token.balanceOf(sale.address)
                var ledgerBalance = await token.balanceOf(ledger.address)

                await sale.revokePresale(accounts[1], 1, {from: accounts[0]})
                
                var currentSaleBalance = await token.balanceOf(sale.address)
                var isEqual = currentSaleBalance.equals(saleBalance.add(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)

                var currentLedgerBalance = await token.balanceOf(ledger.address)
                isEqual = currentLedgerBalance.equals(ledgerBalance.sub(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)  
            });

            it('should revoke parner allocation', async function () {
                var saleBalance = await token.balanceOf(sale.address)
                var ledgerBalance = await token.balanceOf(ledger.address)

                await sale.revokePresale(accounts[1], 2, {from: accounts[0]})
                
                var currentSaleBalance = await token.balanceOf(sale.address)
                var isEqual = currentSaleBalance.equals(saleBalance.add(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)

                var currentLedgerBalance = await token.balanceOf(ledger.address)
                isEqual = currentLedgerBalance.equals(ledgerBalance.sub(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR)))
                assert(isEqual)

                await sale.revokePresale(accounts[2], 2, {from: accounts[0]})

                currentSaleBalance = await token.balanceOf(sale.address)
                isEqual = currentSaleBalance.equals(saleBalance.add(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR).mul(2)))
                assert(isEqual)

                currentLedgerBalance = await token.balanceOf(ledger.address)
                isEqual = currentLedgerBalance.equals(ledgerBalance.sub(tokensAmount.add(bonusTokensAmount).mul(DECIMALSFACTOR).mul(2)))
                assert(isEqual)
            });

            it('should not revoke a partner allocation', async function () {
                try {
                    await sale.revokePresale(accounts[2], 2, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });

            it('should not revoke a presale allocation', async function () {
                try {
                    await sale.revokePresale(accounts[2], 1, {from: accounts[0]})
                } catch (error) {
                    assert(true, `Expected throw, but got ${error} instead`);

                    return;
                }
                assert(false, "Did not throw as expected");
            });
        });
    });
});

