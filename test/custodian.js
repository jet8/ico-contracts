'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');

var J8TToken = artifacts.require('J8TToken');
var Custodian = artifacts.require('Custodian');

contract('Custodian', function (accounts) {
	describe('Process Allocations', () => {

		const DECIMALSFACTOR = new BigNumber('10').pow('8')
		var allocationAmount = new BigNumber(40000);
		let token;
		let custodian;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			custodian = await Custodian.new(token.address, {from: accounts[0], gas: 3500000 })
			await token.transfer(custodian.address, allocationAmount.mul(10).mul(DECIMALSFACTOR), { from: accounts[0] })
			await custodian.setOpsAddress(accounts[0]);
			await custodian.setTeamSupply(allocationAmount.mul(4).mul(DECIMALSFACTOR), { from: accounts[0] })
			await custodian.setAdvisorsSupply(allocationAmount.mul(5).mul(DECIMALSFACTOR), { from: accounts[0] })
			await custodian.setBountySupply(allocationAmount.mul(1).mul(DECIMALSFACTOR), { from: accounts[0] })
		});

		it('should not process an allocation with an incorrect amount of J8T tokens', async function () {
			try {
				// amount = 0
				// wallet = accounts[1]
				// allocation type = team (0)
				await custodian.transferAllocation(0, accounts[1], 0, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should not process an allocation with an incorrect allocation type', async function () {
			try {
				// amount = 0
				// wallet = accounts[1]
				// allocation type = 3 (which is not a defined allocation type)
				await custodian.transferAllocation(0, accounts[1], 3, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should process a team allocation', async function () {
			var custodianBalance = await token.balanceOf(custodian.address)
			var teamSupply = await custodian.currentTeamSupply()

			// amount = 80000 J8T tokens
			// wallet = accounts[1]
			// allocation type = team (0)
			await custodian.transferAllocation(allocationAmount.mul(2), accounts[1], 0, {from: accounts[0], gas: 3500000})
			
			// we check if the balance of the wallet has the correct amount of tokens
			var balance = new BigNumber(await token.balanceOf(accounts[1]))
			var alloc = allocationAmount.mul(2).mul(DECIMALSFACTOR)
			var isEqual = balance.equals(alloc)
			assert(isEqual)

			// we check if the current team supply has the correct amount of tokens
			var currentTeamSupply = new BigNumber(await custodian.currentTeamSupply())
			isEqual = currentTeamSupply.equals(teamSupply.sub(allocationAmount.mul(DECIMALSFACTOR).mul(2)))
			assert(isEqual)

			// we check if the custiodian token supply is the correct
			var currentCustodianBalance = new BigNumber(await token.balanceOf(custodian.address))
			isEqual = currentCustodianBalance.equals(custodianBalance.sub(allocationAmount.mul(DECIMALSFACTOR).mul(2)))
			assert(isEqual)
		});

		it('should process an advisor allocation', async function () {
			var custodianBalance = await token.balanceOf(custodian.address)
			var advisorsSupply = await custodian.currentAdvisorsSupply()

			// amount = 80000 J8T tokens
			// wallet = accounts[2]
			// allocation type = advisors (1)
			await custodian.transferAllocation(allocationAmount.mul(2), accounts[2], 1, {from: accounts[0], gas: 3500000})
			
			// we check if the balance of the wallet has the correct amount of tokens
			var balance = new BigNumber(await token.balanceOf(accounts[2]))
			var alloc = allocationAmount.mul(2).mul(DECIMALSFACTOR)
			var isEqual = balance.equals(alloc)
			assert(isEqual)

			// we check if the current team supply has the correct amount of tokens
			var currentAdvisorsSupply = await custodian.currentAdvisorsSupply()
			isEqual = currentAdvisorsSupply.equals(advisorsSupply.sub(allocationAmount.mul(DECIMALSFACTOR).mul(2)))
			assert(isEqual)

			// we check if the custiodian token supply is the correct
			var currentCustodianBalance = await token.balanceOf(custodian.address)
			isEqual = currentCustodianBalance.equals(custodianBalance.sub(allocationAmount.mul(DECIMALSFACTOR).mul(2)))
			assert(isEqual)
		});

		it('should process a bounty allocation', async function () {
			var custodianBalance = await token.balanceOf(custodian.address)
			var bountySupply = await custodian.currentBountySupply()

			// amount = 40000 J8T tokens
			// wallet = accounts[3]
			// allocation type = bounty (2)
			await custodian.transferAllocation(allocationAmount, accounts[3], 2, {from: accounts[0], gas: 3500000})
			
			// we check if the balance of the wallet has the correct amount of tokens
			var balance = new BigNumber(await token.balanceOf(accounts[3]))
			var alloc = allocationAmount.mul(DECIMALSFACTOR)
			var isEqual = balance.equals(alloc)
			assert(isEqual)

			// we check if the current team supply has the correct amount of tokens
			var currentBountySupply = await custodian.currentBountySupply()
			isEqual = currentBountySupply.equals(bountySupply.sub(allocationAmount.mul(DECIMALSFACTOR)))
			assert(isEqual)

			// we check if the custiodian token supply is the correct
			var currentCustodianBalance = await token.balanceOf(custodian.address)
			isEqual = currentCustodianBalance.equals(custodianBalance.sub(allocationAmount.mul(DECIMALSFACTOR)))
			assert(isEqual)
		});

		it('should not process a team allocation with a bigger amount than the current team supply', async function () {
			try {
				// amount = 120000
				// wallet = accounts[1]
				// allocation type = 0 (team)
				// it should fail: the required amonut is bigger than the current team supply
				await custodian.transferAllocation(allocationAmount.mul(3), accounts[1], 0, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should not process an advisor allocation with a bigger amount than the current advisor supply', async function () {
			try {
				// amount = 160000
				// wallet = accounts[2]
				// allocation type = 1 (advisors)
				// it should fail: the required amonut is bigger than the current advisors supply
				await custodian.transferAllocation(allocationAmount.mul(4), accounts[2], 1, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should not process a bounty allocation with a bigger amount than the current bounty supply', async function () {
			try {
				// amount = 40000
				// wallet = accounts[3]
				// allocation type = 2 (bounty)
				// it should fail: the required amonut is bigger than the current bounty supply
				await custodian.transferAllocation(allocationAmount, accounts[3], 2, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});
	});
});