// Config
storyCfg.web3 = {
    contract: '0x5816b6e25d5224c0afe33b22f28b611a98ca0985',
    welcome: `Hello crypto pony, welcome to the Pony Driland Dapp! The dimension of lost creatures and the home of hope.`
};

storyCfg.web3.abi = {};
storyCfg.web3.abi.base = [

    {
        "inputs": [],
        "stateMutability": "nonpayable", "type": "constructor"
    },
    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "chapter", "type": "uint256" },
        { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }],
        "name": "Bookmark", "type": "event"
    },

    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "value", "type": "address" }],
        "name": "Enable", "type": "event"
    },

    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
        { "indexed": false, "internalType": "string", "name": "value", "type": "string" }],
        "name": "Interaction", "type": "event"
    },

    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
        { "indexed": false, "internalType": "string", "name": "filter", "type": "string" },
        { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }],
        "name": "NsfwFilter", "type": "event"
    },

    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
        { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }],
        "name": "OwnershipTransferred", "type": "event"
    },

    {
        "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
        { "indexed": false, "internalType": "string", "name": "value", "type": "string" }],
        "name": "Volume", "type": "event"
    },

    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" },
        { "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "bookmark", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "string", "name": "_name", "type": "string" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "changeNsfwFilter", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
        "stateMutability": "nonpayable", "type": "function"
    },

    {
        "inputs": [],
        "name": "enable", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
        "stateMutability": "nonpayable", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "enabled", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "_account", "type": "address" },
        { "internalType": "uint256", "name": "_chapter", "type": "uint256" }],
        "name": "getBookmark", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "getInteractions", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "_account", "type": "address" },
        { "internalType": "string", "name": "_name", "type": "string" }],
        "name": "getNsfwFilter", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "getOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "_account", "type": "address" }],
        "name": "getVolume", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "getWallets", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "uint256", "name": "_chapter", "type": "uint256" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "insertBookmark", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
        "stateMutability": "nonpayable", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "interactions", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" },
        { "internalType": "string", "name": "", "type": "string" }],
        "name": "nsfw_filter", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "owner", "outputs": [{ "internalType": "address payable", "name": "", "type": "address" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "setVolume", "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
        "stateMutability": "nonpayable", "type": "function"
    },

    {
        "inputs": [],
        "name": "totalInteractions", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
        "name": "transferOwnership", "outputs": [],
        "stateMutability": "nonpayable", "type": "function"
    },

    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "volume", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    },

    {
        "inputs": [],
        "name": "wallets", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    }

];