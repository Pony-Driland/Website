// Connection Update
puddyWeb3.on('signerUpdated', function (signer) {

    storyCfg.web3.contract = new ethers.Contract(
        storyCfg.web3.contractAddress,
        storyCfg.web3.abi.base,
        signer
    );

});