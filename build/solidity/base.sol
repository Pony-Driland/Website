// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

contract PonyDrilandBase {

    // Data
    address payable public owner;

    mapping (address => uint256) public balances;
    mapping (address => uint256) public donations;
    mapping (address => uint256) public interactions;
    mapping (address => uint256) public perm;

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
    event Interaction(address indexed from, string value);
    event Enable(address indexed value);
    
    event Volume(address indexed from, string value);
    event NsfwFilter(address indexed from, string filter, uint256 value);
    event Bookmark(address indexed from, uint256 chapter, uint256 value);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Burn(address indexed from, uint256 value);
    event Mint(address indexed from, address indexed to, uint256 value);

    event SetPerm(address indexed from, address indexed to, uint256 value);

    // Constructor
    constructor() {

        owner = payable(msg.sender);        
        name = "Pony Driland";
        symbol = "PD";
        decimals = 3;

        totalSupply = 0;
        totalInteractions = 0;

    }

    // Tokens
    function balanceOf(address _account) external view returns (uint256) {
        return balances[_account];
    }

    // Donation
    function donate() payable public returns (bool success) {

        // Send BNB to Developer
        donations[msg.sender] = donations[msg.sender] + msg.value;
        owner.transfer(msg.value);
        return true;

    }

    function transferOwnership(address newOwner) public {
        require(address(msg.sender) == address(owner), "You are not allowed to do this.");
        emit OwnershipTransferred(owner, newOwner);
        owner = payable(newOwner);
    }

    // Set Perm
    function setPerm(address _to, uint256 _value) public returns (bool success) {

        // Validator
        require(address(msg.sender) == address(owner), "You are not allowed to do this.");
        require(_to != address(0), "Zero address.");
        require(_value >= 0, "Invalid amount!");

        // Update Wallet
        perm[_to] = _value;

        // Complete
        emit SetPerm(msg.sender, _to, _value);
        return true;

    }

    // Mint Tokens
    function mint(address _to, uint256 _value) public returns (bool success) {

        // Validator
        require(address(msg.sender) == address(owner), "You are not allowed to do this.");
        require(_to != address(0), "Mint to the zero address.");
        require(_value >= 0, "Invalid amount!");

        // Update Wallet
        balances[_to] = balances[_to] + _value;
        totalSupply = totalSupply + _value;

        // Complete
        emit Mint(msg.sender, _to, _value);
        return true;

    }

    function burn(uint256 _value) public returns (bool success) {

        // Validator
        require(address(msg.sender) == address(owner), "You are not allowed to do this.");
        require(_value <= balances[address(msg.sender)], "Invalid amount!");
        require(_value >= 0, "Invalid amount!");

        // Update Wallet
        balances[address(msg.sender)] = balances[address(msg.sender)] - _value;
        totalSupply = totalSupply - _value;

        // Complete
        emit Burn(msg.sender, _value);
        return true;

    }

    // Send Tokens
    function transfer(address _to, uint256 _value) public returns (bool success) {

        // Validator
        require(_value <= balances[address(msg.sender)], "Invalid amount!");
        require(balances[address(msg.sender)] >= 1, "You must have at least 1 token.");

        // Update Wallet
        balances[_to] = balances[_to] + _value;
        balances[address(msg.sender)] = balances[address(msg.sender)] - _value;

        // Complete
        emit Transfer(msg.sender, _to, _value);
        return true;

    }

    // Enable Panel
    function enable() public returns (bool success) {

        // Update Wallet
        require(balances[address(msg.sender)] <= 0, "This account is already activated.");
        balances[address(msg.sender)] = balances[address(msg.sender)] + 1;
        totalSupply = totalSupply + 1;

        // Complete
        emit Enable(msg.sender);
        emit Interaction(msg.sender, "enable");
        return true;

    }

    // Info
    function getOwner() public view returns (address) {
        return owner;
    }

    // Bookemark
    function getBookmark(address _account, uint256 _chapter) external view returns (uint256) {
        return bookmark[_account][_chapter];
    }

    function insertBookmark(uint256 _chapter, uint256 _value) public returns (bool success) {
        
        // Complete
        require(balances[address(msg.sender)] >= 1, "You need to activate your account.");
        require(_chapter >= 1, "Invalid Chapter.");
        require(_value >= 0, "Invalid Value.");
        
        bookmark[address(msg.sender)][_chapter] = _value;
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;

        emit Interaction(msg.sender, "insert_bookmark");
        return true;

    }

    // NSFW Filter
    function getNsfwFilter(address _account, string memory _name) external view returns (uint256) {
        return nsfw_filter[_account][_name];
    }

    function changeNsfwFilter(string memory _name, uint256 _value) public returns (bool success) {
        
        // Complete
        require(balances[address(msg.sender)] >= 1, "You need to activate your account.");
        require(_value >= 0, "Invalid Value. This is 1 or 0");
        require(_value <= 1, "Invalid Value. This is 1 or 0");

        nsfw_filter[address(msg.sender)][_name] = _value;
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;

        emit Interaction(msg.sender, "change_nsfw_filter");
        return true;

    }

    // Volume
    function getVolume(address _account) external view returns (uint256) {
        return volume[_account];
    }

    function setVolume(uint256 _value) public returns (bool success) {
        
        // Complete
        require(balances[address(msg.sender)] >= 1, "You need to activate your account.");
        require(_value >= 0, "Invalid Volume. 0 - 100");
        require(_value <= 100, "Invalid Volume. 0 - 100");

        volume[address(msg.sender)] = _value;
        interactions[address(msg.sender)] = interactions[address(msg.sender)] + 1;
        totalInteractions = totalInteractions + 1;

        emit Interaction(msg.sender, "set_volume");
        return true;

    }
    
}