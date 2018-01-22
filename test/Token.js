'use strict';
var J8TToken = artifacts.require("J8TToken");


contract('J8TToken', function(accounts) {
    describe('token', function () {
        it('should return the correct totalSupply after construction', async function() {
            let token = await J8TToken.new()
            let totalSupply = await token.totalSupply()
            assert.equal(totalSupply.toNumber(), 150000000000000000)
        });

        it('should have the name Jumbo Coin', async function() {
            let token = await J8TToken.new()
            let name = await token.name()
            assert.equal(name, "J8T Token", "J8T Token wasn't the name")
        });

        it('should have the symbol JMB', async function() {
            let token = await J8TToken.new()
            let symbol = await token.symbol()
            assert.equal(symbol, "J8T", "J8T wasn't the symbol")
        });

        it('should have 8 decimals', async function() {
            let token = await J8TToken.new()
            let decimals = await token.decimals()
            assert.equal(decimals, 8, "8 wasn't the number of decimals")
        });
    });

    describe('transfers', function () {
        it('should allow transfer() 100 J8T units from accounts[0] to accounts[1]', async function() {
            let token = await J8TToken.new()
            let amount = 100

            // initial account[0] and account[1] balance
            let account0StartingBalance = await token.balanceOf(accounts[0])
            let account1StartingBalance = await token.balanceOf(accounts[1])

            // transfer amount from account[0] to account[1]
            await token.transfer(accounts[1], amount, { from: accounts[0] })

            // final account[0] and account[1] balance
            let account0EndingBalance = await token.balanceOf(accounts[0])
            let account1EndingBalance = await token.balanceOf(accounts[1])

            assert.equal(account0EndingBalance.toNumber(), account0StartingBalance.toNumber() - amount, "Balance of account 0 incorrect")
            assert.equal(account1EndingBalance.toNumber(), account1StartingBalance.toNumber() + amount, "Balance of account 1 incorrect")
        });

        it('should throw an error when trying to transfer more than a balance', async function () {
            //To take advantatge from previous tests, we get the deployed token
            let token = await J8TToken.new();
            let accountStartingBalance = await token.balanceOf(accounts[1]);
            let amount = accountStartingBalance + 1;
            try {
                await token.transfer(accounts[2], amount, { from: accounts[1] });
                assert.fail("should have thrown an error")
            } catch (error) {
                assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
            }
        });
    });

    describe('allowance', function () {
        it('should return the correct allowance amount after approval', async function () {
            let token = await J8TToken.new();
            let amount = 100;

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            //checking the amount that an owner allowed to
            let allowance = await token.allowance(accounts[0], accounts[1]);
            assert.equal(allowance, amount, "The amount allowed is not equal!")

            //checking the amount to a not allowed account
            let non_allowance = await token.allowance(accounts[0], accounts[2]);
            assert.equal(non_allowance, 0, "The amount allowed is not equal!")
        });

        it('should allow transfer from allowed account', async function () {
            let token = await J8TToken.new();
            let amount = 100;

            let account0StartingBalance = await token.balanceOf(accounts[0]);
            let account1StartingBalance = await token.balanceOf(accounts[1]);
            let account2StartingBalance = await token.balanceOf(accounts[2]);
            assert.equal(account1StartingBalance, 0);
            assert.equal(account2StartingBalance, 0);

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            //account[1] orders a transfer from owner(account[0]) to account[1]
            await token.transferFrom(accounts[0], accounts[2], amount, {from : accounts[1]});
            let account0AfterTransferBalance = await token.balanceOf(accounts[0]);
            let account1AfterTransferBalance = await token.balanceOf(accounts[1]);
            let account2AfterTransferBalance = await token.balanceOf(accounts[2]);

            assert.equal(account0StartingBalance - amount, account0AfterTransferBalance);
            assert.equal(account1AfterTransferBalance, 0);
            assert.equal(amount, account2AfterTransferBalance)
        });

        it('should throw an error when trying to transfer more than allowed', async function() {
            let token = await J8TToken.new();
            let amount = 100;

            //owner(account[0]) approves to account[1] to spend the amount
            await token.approve(accounts[1], amount);

            let overflowed_amount = amount + 1;
            try {
                await token.transferFrom(accounts[0], accounts[2], overflowed_amount, {from: accounts[1]})
                assert.fail("Should throw an error because has tried to send more amount than the amount allowed!")
            } catch (error) {
                assert.isAbove(error.message.search('invalid opcode'), -1, "Should thrown an invalid opcode message");
            }
        })

        it('should throw an error when trying to transfer from not allowed account', async function() {
            let token = await J8TToken.new();
            let amount = 100;
            try {
                await token.transferFrom(accounts[0], accounts[2], amount, {from: accounts[1]})
                assert.fail("Should throw an error because has tried to send from now allowed account!")
            } catch (error) {
                assert.isAbove(error.message.search('invalid opcode'), -1, "Should thrown an invalid opcode message");
            }
        })
    });

    describe('burnable', function () {
        it('owner should be able to burn tokens', async function () {
            let token                = await J8TToken.new();
            let balance              = await token.balanceOf(accounts[0]);
            let totalSupply          = await token.totalSupply();
            let luckys_burned_amount = 100;
            let expectedTotalSupply  = totalSupply - luckys_burned_amount;
            let expectedBalance      = balance - luckys_burned_amount

            const {logs} = await token.burn(luckys_burned_amount);
            let final_supply = await token.totalSupply();
            let final_balance = await token.balanceOf(accounts[0]);
            assert.equal(expectedTotalSupply, final_supply, "Supply after burn do not fit.");
            assert.equal(expectedBalance, final_balance, "Supply after burn do not fit.");

            const event = logs.find(e => e.event === 'Burn');
            assert.notEqual(event, undefined, "Event Burn not fired!")
        });
        it('Cant not burn more tokens than your balance', async function () {
            let token = await J8TToken.new();
            let totalSupply = await token.totalSupply();
            let luckys_burnable_amount = totalSupply + 1;
            try {
                await token.burn(luckys_burnable_amount);
                assert.fail("Should throw an error 'cuz we are trying to burn more than available supply.");
            } catch (error) {
                assert.isAbove(error.message.search('invalid opcode'), -1, "Should thrown an invalid opcode message");
            }
        });
    });
});