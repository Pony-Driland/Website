// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

contract PonyDrilandReader1 {

    address payable public owner;
    mapping (address => mapping (uint256 => uint256)) public bookmark;
    mapping (address => mapping (string => uint256)) public nsfw_filter;

    // Constructor
    constructor() {
        owner = payable(msg.sender);
    }

    // Info
    function getOwner() public view returns (address) {
        return owner;
    }

    function getBookmark(address account, uint256 chapter) external view returns (uint256) {
        return bookmark[account][chapter];
    }

    function getNsfwFilter(address account, string memory name) external view returns (uint256) {
        return nsfw_filter[account][name];
    }

    // Register Data
    function insertNsfwFilter(string memory name, uint256 value) public returns (bool success) {
        
        // Complete
        nsfw_filter[address(msg.sender)][name] = value;
        return true;

    }

    function insertBookmark(uint256 chapter, uint256 value) public returns (bool success) {
        
        // Complete
        bookmark[address(msg.sender)][chapter] = value;
        return true;

    }
    
}