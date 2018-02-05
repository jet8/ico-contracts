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

    it('isOwner', async function() {
        let aclManaged = await ACLManaged.new();
        let isOwner = await aclManaged.isOwner(accounts[1]);
        assert.equal(false, isOwner);
        isOwner = await aclManaged.isOwner(accounts[0]);
        assert.equal(true, isOwner);
    })

    it('isOps', async function () {
        let aclManaged = await ACLManaged.new();
        await aclManaged.setOpsAddress(accounts[1]);
        let isOps = await aclManaged.isOps(accounts[1]);
        assert.equal(true, isOps);
        isOps = await aclManaged.isOps(accounts[0]);
        assert.equal(false, isOps);
    })

    it('isOpsOrAdmin', async function () {
        let aclManaged = await ACLManaged.new();
        await aclManaged.setOpsAddress(accounts[1]);
        await aclManaged.setAdminAddress(accounts[2]);
        let isOpsOrAdmin = await aclManaged.isOpsOrAdmin(accounts[1]);
        assert.equal(true, isOpsOrAdmin);
        isOpsOrAdmin = await aclManaged.isOpsOrAdmin(accounts[2]);
        assert.equal(true, isOpsOrAdmin);
        isOpsOrAdmin = await aclManaged.isOpsOrAdmin(accounts[0]);
        assert.equal(false, isOpsOrAdmin);
    })

    it('isOwnerOrOpsOrAdmin', async function () {
        let aclManaged = await ACLManaged.new();
        await aclManaged.setOpsAddress(accounts[1]);
        await aclManaged.setAdminAddress(accounts[2]);
        let isOwnerOrOpsOrAdmin = await aclManaged.isOwnerOrOpsOrAdmin(accounts[1]);
        assert.equal(true, isOwnerOrOpsOrAdmin);
        isOwnerOrOpsOrAdmin = await aclManaged.isOwnerOrOpsOrAdmin(accounts[2]);
        assert.equal(true, isOwnerOrOpsOrAdmin);
        isOwnerOrOpsOrAdmin = await aclManaged.isOwnerOrOpsOrAdmin(accounts[0]);
        assert.equal(true, isOwnerOrOpsOrAdmin);
        isOwnerOrOpsOrAdmin = await aclManaged.isOwnerOrOpsOrAdmin(accounts[3]);
        assert.equal(false, isOwnerOrOpsOrAdmin);
    })
});