const BigNumber = require('bignumber.js')
const Moment = require('moment')

var J8TToken = artifacts.require("J8TToken");
var Crowdsale = artifacts.require("Crowdsale");
var Ledger = artifacts.require("Ledger");
var Custodian = artifacts.require("Custodian");
var CrowdsaleConfig = artifacts.require("CrowdsaleConfig");

module.exports = function(deployer, network, accounts) {
  
  const DECIMALSFACTOR = new BigNumber('10').pow('8')
  const TOKEN_SUPPLY = new BigNumber('1500000000').mul(DECIMALSFACTOR)

  const TOKEN_SALE_SUPPLY  = TOKEN_SUPPLY.mul('0.3');
  const FONDATION_SUPPLY = TOKEN_SUPPLY.mul('0.45');
  const CUSTODIAN_SUPPLY = TOKEN_SUPPLY.mul('0.25');

	var token = null
	var sale = null
  var ledger = null
  var custodian = null

  var tokenSaleWallet = "0xf2d51029d38656DB1D4d6446A2030c73bEfA0242"
  var foundationWallet = "0xf2d51029d38656DB1D4d6446A2030c73bEfA0242"
  var adminAddress = "0xAF54477348B0f1A5E4d054d6d13eA9A20ffBE8d4"
  var opsAddress = "0xAF54477348B0f1A5E4d054d6d13eA9A20ffBE8d4"

	return deployer.deploy(J8TToken, { from: accounts[0], gas: 4700000 }).then(() => {
    	return J8TToken.deployed().then(instance => { token = instance })
   	}).then(() => {
      return deployer.deploy(Ledger, token.address, {from: accounts [0], gas: 4700000}) 
    }).then(() => {
      return Ledger.deployed().then(instance => { ledger = instance })
    }).then(() => {
      return deployer.deploy(Crowdsale, token.address, ledger.address, tokenSaleWallet, { from: accounts[0], gas: 4700000 })
   	}).then(() => {
      return deployer.deploy(Custodian, token.address, { from: accounts[0], gas: 4700000})
    }).then(() => {
      return Crowdsale.deployed().then(instance => { sale = instance })
    }).then(() => {
      return Custodian.deployed().then(instance => { custodian = instance })
    }).then(() => {
      return ledger.setCrowdsaleContract(sale.address, { from: accounts[0] })
    }).then(() => {
      return ledger.setOpsAddress(sale.address, { from: accounts[0] })
    }).then(() => {
      return ledger.setAdminAddress(adminAddress, { from: accounts[0] })
    }).then(() => {
      return custodian.setAdminAddress(adminAddress, { from: accounts[0] })
    }).then(() => {
      return token.transfer(sale.address, TOKEN_SALE_SUPPLY, { from: accounts[0]})
    }).then(() => {
      return token.transfer(custodian.address, CUSTODIAN_SUPPLY, { from: accounts[0]})
    }).then(() => {
      return token.transfer(foundationWallet, FONDATION_SUPPLY, { from: accounts[0]})
    }).then(() => {
	    return sale.setAdminAddress(adminAddress, {from: accounts[0]})
    }).then(() => {
      return sale.setOpsAddress(opsAddress, {from: accounts[0]})
    })
};
