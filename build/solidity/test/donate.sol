// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

contract PonyDrilandDonate {

    // Data
    address payable public owner;
    mapping (address => uint256) public donations;
    event Donation(address indexed from, uint256 value, bytes data);

    // Constructor
    constructor() {
        owner = payable(msg.sender); 
    }

    // Donation
    function donate(uint256 _amount) payable public returns (bool success) {
        
        require(address(msg.sender) != address(owner), "You are not allowed to do this.");
        require(_amount >= 0, "Invalid amount!");
        require(_amount <= msg.sender.balance, "Invalid amount!");
        
        (bool _sent, bytes memory _data) = owner.call{value: _amount}("");
        require(_sent, "Failed to send Ether");

        donations[msg.sender] = donations[msg.sender] + _amount;
        emit Donation(msg.sender, _amount, _data);
        return true;
        
    }

    function getDonation(address _account) external view returns (uint256) {
        return donations[_account];
    }

    
}