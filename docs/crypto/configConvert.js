// Prepare Functions
storyCfg.web3.abi.functionsString = [];
for (const item in storyCfg.web3.abi.base) {

    // Function
    if (storyCfg.web3.abi.base[item].type === 'function') {

        // View
        if (storyCfg.web3.abi.base[item].stateMutability === 'view') {

            let values = '';
            let args = '';
            for (const item2 in storyCfg.web3.abi.base[item].outputs) {

                if (values) { values += ','; }
                values += storyCfg.web3.abi.base[item].outputs[item2].type;

            }

            for (const item2 in storyCfg.web3.abi.base[item].inputs) {
                
                let extra = '';
                if (args) { args += ','; }

                if(storyCfg.web3.abi.base[item].inputs[item2].type === 'string') {
                    extra = ' memory';
                }

                args += `${storyCfg.web3.abi.base[item].inputs[item2].type}${extra} ${storyCfg.web3.abi.base[item].inputs[item2].name}`;

            }

            storyCfg.web3.abi.functionsString.push('function ' + storyCfg.web3.abi.base[item].name + '() public view returns (' + values + ')');

        }

    }

}

// Connection Update
puddyWeb3.waitReadyProvider().then(() => {
    puddyWeb3.waitAddress().then(() => {
        
        storyCfg.web3.contract = new ethers.Contract(
            storyCfg.web3.contractAddress, 
            storyCfg.web3.abi.functionsString, 
            puddyWeb3.getProvider().getSigner()
        );

    });
});