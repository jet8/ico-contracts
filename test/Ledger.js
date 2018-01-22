'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');

var J8TToken = artifacts.require('J8TToken');
var Ledger = artifacts.require('Ledger');
var Crowdsale = artifacts.require('Crowdsale');


contract('Ledger', function (accounts) {
	describe('Add Allocations', () => {

		const DECIMALSFACTOR = new BigNumber('10').pow('8')
		var allocationAmount = new BigNumber(40000).mul(DECIMALSFACTOR);
		let token;
		let ledger;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await ledger.setOpsAddress(accounts[0]);
		});

	 	it('should not add an allocation with an amount equal to zero', async function () {
	 		try {
	 			await ledger.addAllocation(accounts[1], 0, 0, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
        });

        it('should add an allocation', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        });

    	it('should add a new allocation for a contributor that already has an allocation', async function () {
    		await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
    		var balance = await ledger.currentSupply()
    		var totalAllocated = allocationAmount.mul(2)
    		var isEqual = balance.equals(totalAllocated)
    		assert(isEqual)
    	});

    	it('should have granted tokens equal to the ledger current supply', async function () {
    		var totalAmountGranted = await ledger.currentSupply()
    		var totalAllocated = allocationAmount.mul(2)
    		var isEqual = totalAmountGranted.equals(totalAllocated)
    		assert(isEqual)
    	});
    });

    describe('Revoke Allocations', () => {

		const DECIMALSFACTOR = new BigNumber('10').pow('8')
		var allocationAmount = new BigNumber(40000).mul(DECIMALSFACTOR);
		let token;
		let ledger;
		let sale;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await token.transfer(ledger.address, 4 * allocationAmount, { from: accounts[0] })
			sale  = await Crowdsale.new(
                    token.address,
                    ledger.address,
                    accounts[9],
                    { from: accounts[0], gas: 4500000 }
                );
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setCrowdsaleContract(sale.address, {from: accounts[0], gas: 3500000 });
		});

        it('should add allocations', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 1, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 1, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        });

    	it('should revoke public allocation', async function () {
    		var ledgerSupply = await ledger.currentSupply()

    		await ledger.revokeAllocation(accounts[1], 0, {from: accounts[0], gas: 3500000 })

    		var currentLedgerSupply = await ledger.currentSupply()
    		var isEqual = currentLedgerSupply.equals(ledgerSupply.sub(allocationAmount))
    		assert(isEqual)

    		var publicSupply = await ledger.totalPublicAllocation()
    		isEqual = publicSupply.equals(new BigNumber('0'))
    		assert(isEqual)

    		var saleBalance = await token.balanceOf(sale.address)
    		isEqual = saleBalance.equals(allocationAmount)
    		assert(isEqual)
    	});

    	it('should revoke presale allocation', async function () {
    		var ledgerSupply = await ledger.currentSupply()

    		await ledger.revokeAllocation(accounts[1], 1, {from: accounts[0], gas: 3500000 })

    		var currentLedgerSupply = await ledger.currentSupply()
    		var isEqual = currentLedgerSupply.equals(ledgerSupply.sub(allocationAmount.mul(2)))
    		assert(isEqual)

    		var privateSupply = await ledger.totalPrivateAllocation()
    		isEqual = privateSupply.equals(allocationAmount)
    		assert(isEqual)

    		var saleBalance = await token.balanceOf(sale.address)
    		isEqual = saleBalance.equals(allocationAmount.mul(3))
    		assert(isEqual)
    	});

    	it('should revoke partner allocation', async function () {
    		var ledgerSupply = await ledger.currentSupply()

    		await ledger.revokeAllocation(accounts[1], 2, {from: accounts[0], gas: 3500000 })

    		var currentLedgerSupply = await ledger.currentSupply()
    		var isEqual = currentLedgerSupply.equals(ledgerSupply.sub(allocationAmount))
    		assert(isEqual)

    		var privateSupply = await ledger.totalPrivateAllocation()
    		isEqual = privateSupply.equals(new BigNumber('0'))
    		assert(isEqual)

    		var saleBalance = await token.balanceOf(sale.address)
    		isEqual = saleBalance.equals(allocationAmount.mul(4))
    		assert(isEqual)
    	});
    });

    describe('Claim Allocation', () => {
    	var allocationAmount = new BigNumber(40000);
		let token;
		let ledger;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await ledger.setOpsAddress(accounts[0]);
			await token.transfer(ledger.address, 10 * allocationAmount, { from: accounts[0] })
		});

		it('should let add allocations', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[2], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        });

        it('should allow ops update claim status', async function() {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
		});

		it('should not allow invalid contributor claim tokens', async function () {
			try {
				await ledger.claimTokens({from: accounts[7], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should allow valid contributor claim tokens', async function () {
			var ledgerSupply = new BigNumber(await ledger.currentSupply())
			await ledger.claimTokens({from: accounts[1], gas: 3500000 })
			var remainingSupply = new BigNumber(await ledger.currentSupply())
			var tokens = remainingSupply.add(allocationAmount)
			assert(ledgerSupply, tokens)
		});

		it('should not allow valid contributor claim tokens for a second time', async function () {
			try {
				await ledger.claimTokens({from: accounts[1], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});
    });

    describe('Claim Allocations', () => {

    	var allocationAmount = new BigNumber(40000);
		let token;
		let ledger;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await ledger.setOpsAddress(accounts[0]);
			await token.transfer(ledger.address, 10 * allocationAmount, { from: accounts[0] })
		});

		it('should set correct supply values', async function() {
			await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[2], allocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[3], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[4], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[5], allocationAmount, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[6], allocationAmount, 0, {from: accounts[0], gas: 3500000 })

        	var currentSupply = new BigNumber(await ledger.currentSupply())
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(6)
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)
        	amount = allocationAmount.mul(4)
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)
        	amount = allocationAmount.mul(10)
        	isEqual = currentSupply.equals(amount)
        	assert(isEqual)
		});

		it('should not allow public contributors claim their tokens', async function () {
			try {
				await ledger.claimTokens({from: accounts[3], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should allow ops update claim status', async function() {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
		});

		it('should allow public contributors claim their tokens', async function () {
			await ledger.claimTokens({from: accounts[3], gas: 3500000 })
			await ledger.claimTokens({from: accounts[4], gas: 3500000 })
			await ledger.claimTokens({from: accounts[5], gas: 3500000 })
			await ledger.claimTokens({from: accounts[6], gas: 3500000 })
		});

		it('should transfer the correct amount of J8T to public contributors', async function () {

			// contributor 3
			var balance = await token.balanceOf(accounts[3])
			var amount = allocationAmount
			var isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 4
			balance = await token.balanceOf(accounts[4])
			amount = allocationAmount
			isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 5
			balance = await token.balanceOf(accounts[5])
			amount = allocationAmount
			isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 6
			balance = await token.balanceOf(accounts[6])
			amount = allocationAmount
			isEqual = balance.equals(amount)
			assert(isEqual)
		});

		it('should not allow presale contributors claim their tokens', async function () {

    		try {
				await ledger.claimTokens({from: accounts[1], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should allow ops update claim status', async function() {
			await ledger.setCanClaimPartnerTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPresaleTokens(true, { from: accounts[0] });
		});

		it('should allow private contributors claim their tokens', async function () {
			await ledger.claimTokens({from: accounts[1], gas: 3500000 })
			await ledger.claimTokens({from: accounts[2], gas: 3500000 })
		});

		it('should send allocations to all contributors', async function () {
			var remainingSupply = new BigNumber(await ledger.currentSupply())
			var empty = new BigNumber('0')
			var isEqual = remainingSupply.equals(empty)
			assert(isEqual)
		});

		it('should transfer the correct amount of J8T to public contributors', async function () {
			// contributor 3
			var balance = await token.balanceOf(accounts[1])
			var amount = allocationAmount.mul(5)
			var isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 4
			balance = await token.balanceOf(accounts[2])
			amount = allocationAmount
			isEqual = balance.equals(amount)
			assert(isEqual)
		});
    });

    describe('Claim Allocation - Partner Contributor Flow', () => {
    	var allocationAmount = new BigNumber(40000);
		let token;
		let ledger;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await ledger.setOpsAddress(accounts[0]);
			await token.transfer(ledger.address, 8 * allocationAmount, { from: accounts[0] })
		});

		it('should add allocations', async function () {
			await ledger.addAllocation(accounts[1], allocationAmount.mul(5), 2, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount.mul(2), 1, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })

			var currentSupply = new BigNumber(await ledger.currentSupply())
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(7)
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)

			amount = allocationAmount
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)

        	amount = allocationAmount.mul(8)
        	isEqual = currentSupply.equals(amount)
        	assert(isEqual)
		});

		it('should claim and get only public allocation', async function () {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount)
			assert(isEqual)
		});

		it('should claim and get only presale allocation', async function () {
			await ledger.setCanClaimPresaleTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(3))
			assert(isEqual)
		});

		it('should claim and get only partner allocation', async function () {
			await ledger.setCanClaimPartnerTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8))
			assert(isEqual)
		});
    });

    describe('Claim Allocation - Partner Contributor Flow (all at one time)', () => {
    	var allocationAmount = new BigNumber(40000);
		let token;
		let ledger;

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 3500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 3500000 })
			await ledger.setOpsAddress(accounts[0]);
			await token.transfer(ledger.address, 8 * allocationAmount, { from: accounts[0] })
		});

		it('should add allocations', async function () {
			await ledger.addAllocation(accounts[1], allocationAmount.mul(5), 2, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount.mul(2), 1, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount, 0, {from: accounts[0], gas: 3500000 })

			var currentSupply = new BigNumber(await ledger.currentSupply())
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(7)
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)

			amount = allocationAmount
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)

        	amount = allocationAmount.mul(8)
        	isEqual = currentSupply.equals(amount)
        	assert(isEqual)
		});

		it('should claim all contributor allocation', async function () {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPresaleTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPartnerTokens(true, { from: accounts[0] });
			
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8))
			assert(isEqual)
		});
    });
});