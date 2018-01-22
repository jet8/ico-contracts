'use strict';
var ACLManaged = artifacts.require("ACLManaged");

contract('ACLManaged', function (accounts) {
    it('owner', async function() {
        let aclManaged = await ACLManaged.new();
        let owner = await aclManaged.owner();
        assert.equal(owner, accounts[0]);
    });

    it('opsAddress', async function() {
        let aclManaged = await ACLManaged.new();
        let opsAddress = await aclManaged.opsAddress();
        assert.equal(opsAddress, 0x0000000000000000000000000000000000000000);
    });

    it('adminAddress', async function() {
        let aclManaged = await ACLManaged.new();
        let opsAddress = await aclManaged.adminAddress();
        assert.equal(opsAddress, 0x0000000000000000000000000000000000000000);
    });

    it('set opsAddress', async function() {
        let aclManaged = await ACLManaged.new();
        await aclManaged.setOpsAddress(accounts[1]);
        let opsAddress = await aclManaged.opsAddress()
        assert.equal(opsAddress, accounts[1]);
    });

    it('set adminAddress', async function() {
        let aclManaged = await ACLManaged.new();
        await aclManaged.setAdminAddress(accounts[1]);
        let adminAddress = await aclManaged.adminAddress()
        assert.equal(adminAddress, accounts[1]);
    });
});