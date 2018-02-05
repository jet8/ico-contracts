'use strict';
const Moment = require('moment');
var J8TToken = artifacts.require('J8TToken');
var Crowdsale = artifacts.require('Crowdsale');
var CrowdsaleMock = artifacts.require('CrowdsaleMock');
var Ledger = artifacts.require('Ledger');

contract('Crowdsale - Setters', function ([_owner, _wallet, _another_wallet, _normal_user]) {
    const START_TIME        = Moment().add('100', 'second').unix();
    const END_TIME          = Moment().add('1', 'days').unix();
    const CONTRIBUTION_MIN  = web3.toWei(0.1, "ether");
    const CONTRIBUTION_MAX  = web3.toWei("1000000", "ether");
    const dollar_per_token  = 0.01;
    const dollars_per_ether = 400;
    const TOKENS_PER_ETHER  = dollars_per_ether / dollar_per_token;
    const TOKEN_SALE_SUPPLY = 40000000;

    let token;
    let sale;
    let ledger;

    before('Setup crowdsale contract', async function () {
        token = await J8TToken.new();
        ledger = await Ledger.new(token.address);
        sale = await Crowdsale.new(
            token.address,
            ledger.address,
            _wallet,
            { from: _owner, gas: 4500000 }
        );
        sale.setAdminAddress(_owner);
    });

    describe('setter startTimestamp', () => {
        let new_start = Moment().add('200', 'second').unix();
        it('should update startTimestamp', async () => {
             const {logs} = await sale.setStartTimestamp(new_start);
             assert.equal(await sale.startTimestamp(), new_start);
             const event = logs.find(e => e.event === 'StartTimestampUpdated');
             assert.notEqual(event, undefined);
        });
        it('should throw an error when trying to update the startime a non owner address', async () => {
            try {
                await sale.setStartTimestamp(new_start, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });
    });
    describe('setter endTimestamp', () => {
        let new_end = Moment().add('300', 'second').unix();
        it('should update endTimestamp', async () => {
            const {logs} = await sale.setEndTimestamp(new_end);
            assert.equal(await sale.endTimestamp(), new_end);
            const event = logs.find(e => e.event === 'EndTimestampUpdated');
            assert.notEqual(event, undefined);
        });

        it('should throw an error when trying to update the startime a non owner address', async () => {
            try {
                await sale.setStartTimestamp(new_end, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });
    });
    describe('setter update wallet', () => {
        it('should update the wallet', async function () {
            await sale.setAdminAddress(_owner);
            const {logs} = await sale.updateWallet(_another_wallet);
            assert.equal(await sale.wallet(), _another_wallet);
            const event = logs.find(e => e.event === 'WalletUpdated');
            assert.notEqual(event, undefined);
        });
        it('should throw an error when trying to update the wallet a non admin address', async () => {
            try {
                await sale.updateWallet(_another_wallet, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });
        it('should throw an error when tyring to update the wallet to an address 0', async () => {
            await sale.setAdminAddress(_owner);
            try {
                await sale.updateWallet(0);
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        })
    });

    describe('setter setMinContribution', function(){
        var random_min_contribution = web3.toWei(0.5, "ether");
        it('should update min contribution', async function (){
            const {logs} = await sale.setMinContribution(random_min_contribution);
            assert.equal((await sale.minContribution()).toNumber(), random_min_contribution);
            const event = logs.find(e => e.event === 'MinContributionUpdated');
            assert.notEqual(event, undefined);
        });
        it('should throw an error when trying to update the min contribution a non owner addres', async () => {
            try {
                await sale.setMinContribution(random_min_contribution, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });
    });

    describe('setter setMaxContribution', function(){
        var random_max_contribution = web3.toWei(2, "ether");
        it('should update max contribution', async function (){
            const {logs} = await sale.setMaxContribution(random_max_contribution);
            assert.equal((await sale.maxContribution()).toNumber(), random_max_contribution);
            const event = logs.find(e => e.event === 'MaxContributionUpdated');
            assert.notEqual(event, undefined);
        });
        it('should throw an error when trying to update the max contribution a non owner addres', async () => {
            try {
                await sale.setMaxContribution(random_max_contribution, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });
    });

    describe('setter ether per token', function (){
        beforeEach(async function() {
            //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
            //await advanceBlock()
        })

        it('should set a new rate value', async function (){
            let random_value = 25;
            await sale.setAdminAddress(_owner);
            const {logs} = await sale.setTokensPerEther(random_value);
            const event = logs.find(e => e.event === 'TokensPerEtherUpdated');
            assert.equal(await sale.tokensPerEther(), random_value, 'Setter tokens per ether has failed!')
            assert.notEqual(event, undefined);
        });

        it('should throw an error when trying to set tokens per ether a non admin user', async function () {
            let random_value = 25;
            try {
                await sale.setTokensPerEther(random_value, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });

        it('should force update tokens per ether', async () => {
            let random_value = 25;
            const {logs} = await sale.forceTokensPerEther(random_value);
            assert.equal(await sale.tokensPerEther(), random_value);
            const event = logs.find(e => e.event === 'TokensPerEtherUpdated');
            assert.notEqual(event, undefined);
        });

        it('should throw error when forcing tokens per ether a non owner user', async () => {
            let random_value = 25;
            try {
                await sale.forceTokensPerEther(random_value, {from: _normal_user});
            } catch (error) {
                assert(true, `Expected throw, but got ${error} instead`);
                return;
            }
            assert(false, "Did not throw as expected");
        });

    //     it('should throw an error when admin user tries to set tokens per ether after sale has started', async function () {
    //         let mockSale = await CrowdsaleMock.new(
    //             token.address,
    //             _wallet,
    //             START_TIME,
    //             END_TIME,
    //             TOKENS_PER_ETHER,
    //             TOKEN_SALE_SUPPLY,
    //             CONTRIBUTION_MIN,
    //             CONTRIBUTION_MAX,
    //             START_TIME + 20,
    //             { from: _owner, gas: 4500000 }
    //         );
    //         let random_value = 25;
    //         await mockSale.setAdminAddress(_owner);
    //         try {
    //             await mockSale.setTokensPerEther(random_value);
    //         } catch (error) {
    //             assert(true, `Expected throw, but got ${error} instead`);
    //             return;
    //         }
    //         assert(false, "Did not throw as expected");
    //     });
    });
});

// // Increases testrpc time by the passed duration in seconds
// function increaseBlockChainTime(duration) {
//     const id = Date.now()
//
//     return new Promise((resolve, reject) => {
//         web3.currentProvider.sendAsync({
//             jsonrpc: '2.0',
//             method: 'evm_increaseTime',
//             params: [duration],
//             id: id,
//         }, err1 => {
//             if (err1) return reject(err1)
//
//             web3.currentProvider.sendAsync({
//                 jsonrpc: '2.0',
//                 method: 'evm_mine',
//                 id: id+1,
//             }, (err2, res) => {
//                 return err2 ? reject(err2) : resolve(res)
//             })
//         })
//     })
// }
//
// function advanceBlock() {
//     return new Promise((resolve, reject) => {
//         web3.currentProvider.sendAsync({
//             jsonrpc: '2.0',
//             method: 'evm_mine',
//             id: Date.now(),
//         }, (err, res) => {
//             return err ? reject(err) : resolve(res)
//         })
//     })
// }