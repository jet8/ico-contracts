pragma solidity ^0.4.17;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract ACLManaged is Ownable {
    
    ///////////////////////////
    // ACLManaged PROPERTIES //
    ///////////////////////////

    // The operational acl address
    address public opsAddress;

    // The admin acl address
    address public adminAddress;

    ////////////////////////////////////////
    // ACLManaged FUNCTIONS and MODIFIERS //
    ////////////////////////////////////////

    function ACLManaged() public Ownable() {}

    // Updates the opsAddress propety with the new _opsAddress value
    function setOpsAddress(address _opsAddress) external onlyOwner returns (bool) {
        require(_opsAddress != address(0));
        require(_opsAddress != address(this));

        opsAddress = _opsAddress;
        return true;
    }

    // Updates the adminAddress propety with the new _adminAddress value
    function setAdminAddress(address _adminAddress) external onlyOwner returns (bool) {
        require(_adminAddress != address(0));
        require(_adminAddress != address(this));

        adminAddress = _adminAddress;
        return true;
    }

    //Checks if an address is owner
    function isOwner(address _address) public view returns (bool) {
        bool result = (_address == owner);
        return result;
    }

    //Checks if an address is operator
    function isOps(address _address) public view returns (bool) {
        bool result = (_address == opsAddress);
        return result;
    }

    //Checks if an address is ops or admin
    function isOpsOrAdmin(address _address) public view returns (bool) {
        bool result = (_address == opsAddress || _address == adminAddress);
        return result;
    }

    //Checks if an address is ops,owner or admin
    function isOwnerOrOpsOrAdmin(address _address) public view returns (bool) {
        bool result = (_address == opsAddress || _address == adminAddress || _address == owner);
        return result;
    }

    //Checks whether the msg.sender address is equal to the adminAddress property or not
    modifier onlyAdmin() {
        //Needs to be set. Default constructor will set 0x0;
        address _address = msg.sender;
        require(_address != address(0));
        require(_address == adminAddress);
        _;
    }

    // Checks whether the msg.sender address is equal to the opsAddress property or not
    modifier onlyOps() {
        //Needs to be set. Default constructor will set 0x0;
        address _address = msg.sender;
        require(_address != address(0));
        require(_address == opsAddress);
        _;
    }

    // Checks whether the msg.sender address is equal to the opsAddress or adminAddress property
    modifier onlyAdminAndOps() {
        //Needs to be set. Default constructor will set 0x0;
        address _address = msg.sender;
        require(_address != address(0));
        require(_address == opsAddress || _address == adminAddress);
        _;
    }
}