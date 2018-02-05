pragma solidity ^0.4.11;
import './Crowdsale.sol';

contract CrowdsaleMock is Crowdsale
{
    uint256 public _now;

    function CrowdsaleMock(
        J8TToken _tokenContract,
        Ledger _ledgerContract,
        address _wallet,
        uint256 _start,
        uint256 _end,
        uint256 _tokensPerEther,
        uint256 _min_contribution,
        uint256 _max_contribution,
        uint256 _currentTime
    ) public Crowdsale(_tokenContract, _ledgerContract, _wallet) {
        _now             = _currentTime;
        startTimestamp   = _start;
        endTimestamp     = _end;
        MIN_CONTRIBUTION = _min_contribution;
    }

    function currentTime() public view returns (uint256) {
        return _now;
    }

    function changeTime(uint256 _newTime) public onlyOwner returns (bool) {
        _now = _newTime;

        return true;
    }
}
