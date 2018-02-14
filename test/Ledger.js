'use strict';
const BigNumber = require('bignumber.js')
const Moment = require('moment');

var J8TToken = artifacts.require('J8TToken');
var Ledger = artifacts.require('Ledger');
var Crowdsale = artifacts.require('Crowdsale');


contract('Ledger', function (accounts) {
	
	const DECIMALSFACTOR = new BigNumber('10').pow('8')
	var allocationAmount = new BigNumber(40000).mul(DECIMALSFACTOR);
	var bonusAllocationAmount = new BigNumber(15000).mul(DECIMALSFACTOR);
	
	let token;
	let ledger;
	let sale;

	describe('Add Allocations', () => {

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await ledger.setOpsAddress(accounts[0]);
			await token.transfer(ledger.address, 2 * allocationAmount, { from: accounts[0] })
		});

	 	it('should not add an allocation with an amount equal to zero', async function () {
	 		try {
	 			await ledger.addAllocation(accounts[1], 0, 0, 0, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
        });

        it('should add an allocation', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        });

    	it('should add a new allocation for a contributor that already has an allocation', async function () {
    		await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
    		var balance = await token.balanceOf(ledger.address)
    		var totalAllocated = allocationAmount.mul(2)
    		var isEqual = balance.equals(totalAllocated)
    		assert(isEqual)
    	});

    	it('should have granted tokens equal to the ledger current supply', async function () {
    		var totalAmountGranted = await token.balanceOf(ledger.address)
    		var totalAllocated = allocationAmount.mul(2)
    		var isEqual = totalAmountGranted.equals(totalAllocated)
    		assert(isEqual)
    	});
    });

    describe('Revoke Allocations', () => {

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await token.transfer(ledger.address, 4 * allocationAmount + bonusAllocationAmount * 3, { from: accounts[0] })
			sale  = await Crowdsale.new(
                    token.address,
                    ledger.address,
                    accounts[9],
                    { from: accounts[0], gas: 4500000 }
                );
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setCrowdsaleContract(sale.address, {from: accounts[0], gas: 3500000 });
		});

		it('should trigger event when setCrowdsaleContract is called', async function (){
            const {logs} = await ledger.setCrowdsaleContract(sale.address, {from: accounts[0], gas: 3500000 });
            const event_finalized  = logs.find(e => e.event === "crowdsaleContractUpdated");
            assert.notEqual(event_finalized, undefined);
		});

        it('should add allocations', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 1, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 1, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        });

    	it('should not revoke public allocation', async function () {
    		try {
				await ledger.revokeAllocation(accounts[1], 0, {from: accounts[0], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
    	});

    	it('should revoke presale allocation', async function () {
    		var ledgerSupply = await token.balanceOf(ledger.address)
    		var privateSupply = await ledger.totalPrivateAllocation()

    		await ledger.revokeAllocation(accounts[1], 1, {from: accounts[0], gas: 3500000 })

    		var currentLedgerSupply = await token.balanceOf(ledger.address)
    		var isEqual = currentLedgerSupply.equals(ledgerSupply.sub(allocationAmount.mul(2).add(bonusAllocationAmount.mul(2))))
    		assert(isEqual)

    		var currentPrivateSupply = await ledger.totalPrivateAllocation()
    		isEqual = currentPrivateSupply.equals(privateSupply.sub(allocationAmount.mul(2).add(bonusAllocationAmount.mul(2))))
    		assert(isEqual)

    		var saleBalance = await token.balanceOf(sale.address)
    		isEqual = saleBalance.equals(allocationAmount.mul(2).add(bonusAllocationAmount.mul(2)))
    		assert(isEqual)
    	});

    	it('should revoke partner allocation', async function () {
    		var ledgerSupply = await token.balanceOf(ledger.address)

    		await ledger.revokeAllocation(accounts[1], 2, {from: accounts[0], gas: 3500000 })

    		var currentLedgerSupply = await token.balanceOf(ledger.address)
    		var isEqual = currentLedgerSupply.equals(ledgerSupply.sub(allocationAmount.add(bonusAllocationAmount)))
    		assert(isEqual)

    		var privateSupply = await ledger.totalPrivateAllocation()
    		isEqual = privateSupply.equals(new BigNumber('0'))
    		assert(isEqual)

    		var saleBalance = await token.balanceOf(sale.address)
    		isEqual = saleBalance.equals(allocationAmount.mul(3).add(bonusAllocationAmount.mul(3)))
    		assert(isEqual)
    	});
    });

    describe('Claim Allocation', () => {

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setAdminAddress(accounts[0]);
			await token.transfer(ledger.address, 2 * allocationAmount, { from: accounts[0] })
		});

		it('should let add allocations', async function () {
        	await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[2], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        });

        it('should allow admin update claim status', async function() {
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
			var ledgerSupply = new BigNumber(await token.balanceOf(ledger.address))
			await ledger.claimTokens({from: accounts[1], gas: 3500000 })
			var remainingSupply = new BigNumber(await token.balanceOf(ledger.address))
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

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setAdminAddress(accounts[0]);
			await token.transfer(ledger.address, 10 * allocationAmount + 6 * bonusAllocationAmount, { from: accounts[0] })
		});

		it('should set correct supply values', async function() {
			await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[1], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[2], allocationAmount, bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[3], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[4], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[5], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })
        	await ledger.addAllocation(accounts[6], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })

        	var currentSupply = new BigNumber(await token.balanceOf(ledger.address))
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(6).add(bonusAllocationAmount.mul(6))
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)
        	amount = allocationAmount.mul(4)
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)
        	amount = allocationAmount.mul(10).add(bonusAllocationAmount.mul(6))
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

		it('should send allocations to all private contributors', async function () {
			var remainingSupply = new BigNumber(await token.balanceOf(ledger.address))
			var bonuses = bonusAllocationAmount.mul(6)
			var isEqual = remainingSupply.equals(bonuses)
			assert(isEqual)
		});

		it('should transfer the correct amount of J8T to private contributors', async function () {
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

		it('should not allow partner contributors claim bonus tokens', async function () {

    		try {
				await ledger.claimTokens({from: accounts[1], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should allow admin update presale bonus claim status', async function() {
			await ledger.setCanClaimPresaleBonusTokensPhase1(true, { from: accounts[0] });
		});

		it('should not allow partner contributors claim bonus tokens', async function () {

    		try {
				await ledger.claimTokens({from: accounts[1], gas: 3500000 })
	 		} catch (error) {
	 			assert(true, `Expected throw, but got ${error} instead`)
	 			return
	 		}
	 		assert(false, "Did not throw as expected");
		});

		it('should allow admin update partner bonus claim status', async function() {
			await ledger.setCanClaimPartnerBonusTokensPhase1(true, { from: accounts[0] });
		});

		it('should allow partner contributors claim phase 1 bonus tokens', async function () {
			await ledger.claimBonus({from: accounts[1], gas: 3500000 })
			await ledger.claimBonus({from: accounts[2], gas: 3500000 })
		});

		it('should send bonus base allocations to all private contributors', async function () {
			var remainingSupply = new BigNumber(await token.balanceOf(ledger.address))
			var balance = new BigNumber(bonusAllocationAmount.mul(3))
			var isEqual = remainingSupply.equals(balance)
			assert(isEqual)
		});

		it('should transfer the correct amount of J8T bonus phase 1 to private contributors', async function () {
			// contributor 3
			var balance = await token.balanceOf(accounts[1])
			var amount = allocationAmount.mul(5).add(bonusAllocationAmount.mul(2.5))
			var isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 4
			balance = await token.balanceOf(accounts[2])
			amount = allocationAmount.add(bonusAllocationAmount.mul(0.5))
			isEqual = balance.equals(amount)
			assert(isEqual)
		});

		it('should allow admin update partner bonus claim status', async function() {
			await ledger.setCanClaimPartnerBonusTokensPhase2(true, { from: accounts[0] });
		});

		it('should allow partner contributors claim phase 2 bonus tokens', async function () {
			await ledger.claimBonus({from: accounts[1], gas: 3500000 })
			await ledger.claimBonus({from: accounts[2], gas: 3500000 })
		});

		it('should send bonus base allocations to all private contributors', async function () {
			var remainingSupply = new BigNumber(await token.balanceOf(ledger.address))
			var balance = new BigNumber(0)
			var isEqual = remainingSupply.equals(balance)
			assert(isEqual)
		});

		it('should transfer the correct amount of J8T bonus phase 2 to private contributors', async function () {
			// contributor 3
			var balance = await token.balanceOf(accounts[1])
			var amount = allocationAmount.mul(5).add(bonusAllocationAmount.mul(5))
			var isEqual = balance.equals(amount)
			assert(isEqual)

			// contributor 4
			balance = await token.balanceOf(accounts[2])
			amount = allocationAmount.add(bonusAllocationAmount.mul(1))
			isEqual = balance.equals(amount)
			assert(isEqual)
		});
    });

    describe('Claim Allocation - Partner Contributor Flow', () => {

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setAdminAddress(accounts[0]);
			await token.transfer(ledger.address, 8 * allocationAmount + bonusAllocationAmount * 2, { from: accounts[0] })
		});

		it('should add allocations', async function () {
			await ledger.addAllocation(accounts[1], allocationAmount.mul(5), bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount.mul(2), bonusAllocationAmount, 1, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })

			var currentSupply = new BigNumber(await token.balanceOf(ledger.address))
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(7).add(bonusAllocationAmount.mul(2))
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)

			amount = allocationAmount
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)

        	amount = allocationAmount.mul(8).add(bonusAllocationAmount.mul(2))
        	isEqual = currentSupply.equals(amount)
        	assert(isEqual)
		});

		it('should set claim and get only public allocation', async function () {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount)
			assert(isEqual)
		});

		it('should set claim and get only presale allocation', async function () {
			await ledger.setCanClaimPresaleTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(3))
			assert(isEqual)
		});

		it('should set claim and get only partner allocation', async function () {
			await ledger.setCanClaimPartnerTokens(true, { from: accounts[0] });
			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8))
			assert(isEqual)
		});

		it('should set claim and get presale bonus phase 1 allocation', async function () {
			await ledger.setCanClaimPresaleBonusTokensPhase1(true, { from: accounts[0] });
			await ledger.claimBonus({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8).add(bonusAllocationAmount.mul(0.5)))
			assert(isEqual)
		});

		it('should set claim and get presale bonus phase 2 allocation', async function () {
			await ledger.setCanClaimPresaleBonusTokensPhase2(true, { from: accounts[0] });
			await ledger.claimBonus({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8).add(bonusAllocationAmount))
			assert(isEqual)
		});

		it('should set claim and get partner bonus phase 1 allocation', async function () {
			await ledger.setCanClaimPartnerBonusTokensPhase1(true, { from: accounts[0] });
			await ledger.claimBonus({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8).add(bonusAllocationAmount.mul(1.5)))
			assert(isEqual)
		});

		it('should set claim and get partner bonus phase 2 allocation', async function () {
			await ledger.setCanClaimPartnerBonusTokensPhase2(true, { from: accounts[0] });
			await ledger.claimBonus({from: accounts[1], gas: 3500000})
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8).add(bonusAllocationAmount.mul(2)))
			assert(isEqual)
		});
    });

    describe('Claim Allocation - Partner Contributor Flow (all at one time)', () => {

		before('should initialize token and ledger smart contracts', async function () {
			token = await J8TToken.new({ from: accounts[0], gas: 4500000 });
			ledger = await Ledger.new(token.address, {from: accounts[0], gas: 4500000 })
			await ledger.setOpsAddress(accounts[0]);
			await ledger.setAdminAddress(accounts[0]);
			await token.transfer(ledger.address, 8 * allocationAmount + bonusAllocationAmount * 2, { from: accounts[0] })
		});

		it('should add allocations', async function () {
			await ledger.addAllocation(accounts[1], allocationAmount.mul(5), bonusAllocationAmount, 2, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount.mul(2), bonusAllocationAmount, 1, {from: accounts[0], gas: 3500000 })
			await ledger.addAllocation(accounts[1], allocationAmount, 0, 0, {from: accounts[0], gas: 3500000 })

			var currentSupply = new BigNumber(await token.balanceOf(ledger.address))
        	var privateAllocations = new BigNumber(await ledger.totalPrivateAllocation())
        	var publicAllocations = new BigNumber(await ledger.totalPublicAllocation())

        	var amount = allocationAmount.mul(7).add(bonusAllocationAmount.mul(2))
        	var isEqual = privateAllocations.equals(amount)
        	assert(isEqual)

			amount = allocationAmount
        	isEqual = publicAllocations.equals(amount)
        	assert(isEqual)

        	amount = allocationAmount.mul(8).add(bonusAllocationAmount.mul(2))
        	isEqual = currentSupply.equals(amount)
        	assert(isEqual)
		});

		it('should claim all contributor allocation', async function () {
			await ledger.setCanClaimTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPresaleTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPartnerTokens(true, { from: accounts[0] });
			await ledger.setCanClaimPresaleBonusTokensPhase1(true, { from: accounts[0] });
			await ledger.setCanClaimPresaleBonusTokensPhase2(true, { from: accounts[0] });
			await ledger.setCanClaimPartnerBonusTokensPhase1(true, { from: accounts[0] });
			await ledger.setCanClaimPartnerBonusTokensPhase2(true, { from: accounts[0] });

			await ledger.claimTokens({from: accounts[1], gas: 3500000})
			await ledger.claimBonus({from: accounts[1], gas: 3500000})
			
			var balanceL = await token.balanceOf(ledger.address)
			var balance = await token.balanceOf(accounts[1])
			var isEqual = balance.equals(allocationAmount.mul(8).add(bonusAllocationAmount.mul(2)))
			assert(isEqual)
		});
    });
});