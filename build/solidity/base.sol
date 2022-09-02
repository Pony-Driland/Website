// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

contract PonyDrilandBase {

    // Data
    address payable public owner;

    mapping (address => uint256) public balances;
    mapping (address => uint256) public interactions;

    mapping (address => mapping (uint256 => uint256)) public bookmark;
    mapping (address => mapping (string => uint256)) public nsfw_filter;
    mapping (address => uint256) public volume;

    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 public totalSupply;
    uint256 public totalInteractions;

    // Event
    event Transfer(address indexed from, address indexed to, uint256 value);

    // Constructor
    constructor() {

        owner = payable(msg.sender);        
        name = "Pony Driland";
        symbol = "PD";
        decimals = 3;
        totalSupply = 0;
        totalInteractions = 0;

    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function donate() payable public returns (bool success) {

        // Send BNB to Developer
        donations[msg.sender] = donations[msg.sender] + msg.value;
        payable(owner).transfer(msg.value);
        return true;

    }

    // Send Tokens
    function transfer(address _to, uint256 _value) public returns (bool success) {

        // Validator
        require(_to != address(msg.sender), "Hey! This is youself");
        require(_value >= 0, "Invalid amount!");
        require(_value <= balances[address(msg.sender)], "Invalid amount!");

        // Update Wallet
        balances[_to] = balances[_to] + _value;
        balances[address(msg.sender)] = balances[address(msg.sender)] + _value;

        // Complete
        emit Transfer(msg.sender, _to, _value);
        return true;

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
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;
        return true;

    }

    // NSFW Filter
    function getNsfwFilter(address account, string memory name) external view returns (uint256) {
        return nsfw_filter[account][name];
    }

    function changeNsfwFilter(string memory name, uint256 value) public returns (bool success) {
        
        // Complete
        require(value >= 0, "Invalid Value. This is 1 or 0");
        require(value <= 1, "Invalid Value. This is 1 or 0");

        nsfw_filter[address(msg.sender)][name] = value;
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;
        return true;

    }

    // Volume
    function getVolume(address account) external view returns (uint256) {
        return volume[account];
    }

    function setVolume(uint256 value) public returns (bool success) {
        
        // Complete
        require(value >= 0, "Invalid Volume. 0 - 100");
        require(value <= 100, "Invalid Volume. 0 - 100");

        volume[address(msg.sender)] = value;
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;
        return true;

    }
    
}