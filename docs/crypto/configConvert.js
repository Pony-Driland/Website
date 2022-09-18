// Prepare Functions
storyCfg.web3.abi.functionsString = [];
for (const item in storyCfg.web3.abi.base) {

    // Function
    if (storyCfg.web3.abi.base[item].type === 'function') {

        // View
        if (storyCfg.web3.abi.base[item].stateMutability === 'view') {

            let values = '';
            for (const item2 in storyCfg.web3.abi.base[item].inputs) {

                if (values) { values += ','; }
                values += storyCfg.web3.abi.base[item].inputs[item2].type;

            }

            storyCfg.web3.abi.functionsString.push('function ' + storyCfg.web3.abi.base[item].name + '() public view returns (' + values + ')');

        }

    }

}

// Connection Update
puddyWeb3.waitReadyProvider().then(() => {
    puddyWeb3.waitAddress().then((address) => {
        console.log(address);
        storyCfg.web3.abi.functions = new ethers.Contract(puddyWeb3.getAddress(), storyCfg.web3.abi.base, signer);
    });
});