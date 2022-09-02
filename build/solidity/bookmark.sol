pragma solidity 0.8.15;

contract PonyDrilandBookmark {

    // Constructor
    constructor() {
        owner = payable(msg.sender);
    }

    // Info
    function getOwner() public view returns (address) {
        return owner;
    }
    
}