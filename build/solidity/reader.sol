// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

contract PonyDrilandReader1 {

    address payable public owner;
    mapping (address => mapping (uint256 => uint256)) public bookmark;
    mapping (address => mapping (string => uint256)) public nsfw_filter;
    mapping (address => mapping (uint256)) public volume;

    // Constructor
    constructor() {
        owner = payable(msg.sender);
    }

    // Info
    function getOwner() public view returns (address) {
        return owner;
    }

    // Bookemark
    function getBookmark(address account, uint256 chapter) external view returns (uint256) {
        return bookmark[account][chapter];
    }

    function insertBookmark(uint256 chapter, uint256 value) public returns (bool success) {
        
        // Complete
        require(chapter >= 1, "Invalid Chapter.");
        require(value >= 0, "Invalid Value.");
        
        bookmark[address(msg.sender)][chapter] = value;
        return true;

    }

    // NSFW Filter
    function getNsfwFilter(address account, string memory name) external view returns (uint256) {
        return nsfw_filter[account][name];
    }

    // Register Data
    function insertNsfwFilter(string memory name, uint256 value) public returns (bool success) {
        
        // Complete
        require(value >= 0, "Invalid Value. This is 1 or 0");
        require(value <= 1, "Invalid Value. This is 1 or 0");

        nsfw_filter[address(msg.sender)][name] = value;
        return true;

    }
    
}