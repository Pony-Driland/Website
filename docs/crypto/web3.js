// BETA MODULE!

var PuddyWeb3 = class {

    // Constructor Base
    constructor(network, provider) {

        // Base
        const tinyThis = this;

        // Networks
        this.callbacks = { accountsChanged: [], networkChanged: [], connectionUpdate: [], network: [], readyProvider: [] };

        this.providerConnected = false;
        this.connected = false;
        this.networks = {

            matic: {
                chainId: "0x89",
                rpcUrls: ["https://polygon-rpc.com/"],
                chainName: "Polygon Mainnet",
                nativeCurrency: {
                    name: "MATIC",
                    symbol: "MATIC",
                    decimals: 18
                },
                blockExplorerUrls: ["https://polygonscan.com/"]
            },

            bsc: {
                chainId: "56",
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                chainName: "Smart Chain",
                nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18
                },
                blockExplorerUrls: ["https://bscscan.com/"]
            }

        };

        if (typeof network === 'string') { this.network = network; }

        // Get Provider
        if (provider !== null) {
            if (provider) {

                this.enabled = true;
                this.provider = new ethers.providers.Web3Provider(provider);

                this.provider.on('accountsChanged', (accounts) => {
                    tinyThis.accountsChanged(accounts);
                });

                this.checkConnection();

            } else if (window.ethereum) {

                window.ethereum.on('accountsChanged', function (accounts) {
                    tinyThis.accountsChanged(accounts);
                });

                window.ethereum.on('networkChanged', function (networkId) {
                    tinyThis.networkChanged(networkId);
                });

                this.enabled = true;
                this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

                this.provider.on('network', (newNetwork, oldNetwork) => {
                    tinyThis.setNetwork(newNetwork, oldNetwork);
                });

                this.checkConnection();
                this.readyProvider();

            } else {
                this.enabled = false;
            }
        } else { this.enabled = false; }

        // Complete
        return this;

    }

    on(where, callback) {
        if (typeof callback === 'function' && Array.isArray(this.callbacks[where])) {
            this.callbacks[where].push(callback);
        }
    }

    // Ready Provider
    async readyProvider() {

        this.providerConnected = true;
        for (const item in this.callbacks.readyProvider) {
            await this.callbacks.readyProvider[item]();
        }

        return;

    }

    async isReadyProvider() {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {

            try {

                if (tinyThis.providerConnected) {
                    resolve(true);
                } else {
                    setTimeout(function () { tinyThis.isReadyProvider().then((data) => { resolve(data); }).catch(reject); }, 500);
                }

            } catch (err) { reject(err); }

            return;

        });
    }

    // Account Changed
    async accountsChanged(data) {

        // Address
        this.address = await this.provider.getSigner().getAddress();
        this.address = this.address.toLowerCase();
        localStorage.setItem('web3_address', this.address);

        for (const item in this.callbacks.accountsChanged) {
            await this.callbacks.accountsChanged[item](data);
        }

        return;

    }

    // Account Changed
    async networkChanged(networkId) {

        // Network
        this.networkId = networkId;
        localStorage.setItem('web3_network_id', this.networkId);

        for (const item in this.callbacks.networkChanged) {
            await this.callbacks.networkChanged[item](networkId);
        }

        return;

    }

    async setNetwork(newNetwork, oldNetwork) {

        // Network
        this.networkId = newNetwork.chainId;
        localStorage.setItem('web3_network_id', this.networkId);

        for (const item in this.callbacks.network) {
            await this.callbacks.network[item](newNetwork, oldNetwork);
        }

        return;

    }

    // Connection Detected
    connectionUpdate() {
        if (this.address) {

            // Verified
            this.connected = true;

            // Finish
            $(async () => {

                for (const item in this.callbacks.connectionUpdate) {
                    await this.callbacks.connectionUpdate[item]();
                }

                return;

            });

            return true;

        } else { return false; }
    }

    // Wallet Connect
    async startWalletConnect() {

        const providerData = {
            bridge: "https://bridge.walletconnect.org",
            chainId: Number(this.networks[this.network].chainId),
            rpc: {}
        };

        providerData.rpc[providerData.chainId] = this.networks[this.network].rpcUrls[0];
        this.wallet_connect = new WalletConnectProvider.default(providerData);

        if (this.wallet_connect.connected) {
            await this.wallet_connect.enable({ chainId: String(this.networks[this.network].chainId) });
        }

        this.enabled = true;
        this.provider = new ethers.providers.Web3Provider(this.wallet_connect);

        this.provider.on('accountsChanged', async (data) => {
            tinyThis.accountsChanged(data);
        });

        await this.checkConnection();
        await this.readyProvider();
        return this.wallet_connect;

    }

    getWalletConnect() {
        return this.wallet_connect;
    }

    // Alert Enabled
    alertIsEnabled() {
        if (!this.enabled) {
            alert('MetaMask not detected. Please install MetaMask first.');
        }
    }

    // Data
    isEnabled() { return this.enabled; }
    getProvider() { return this.provider; }
    getAddress() { return this.address; }
    isConnected() { return this.connected; }
    existAccounts() { return (Array.isArray(this.accounts) && this.accounts.length > 0) }

    // Test Data
    async testMessage() {
        if (this.enabled) {

            console.log('[web3] [log] Request Account...');
            const address = await this.requestAccounts();
            console.log('[web3] [address]', address);

            const message = ethers.utils.toUtf8Bytes('This is a tiny Pudding Web3 Test! :3' + '\n\nNonce: 0');
            //const message = 'This is a tiny Pudding Web3 Test! :3' + '\n\nNonce: 0';

            console.log('[web3] [message]', message);
            const signature = await this.provider.send('personal_sign', [ethers.utils.hexlify(message), address.toLowerCase()]);
            //const signature = await this.provider.getSigner().signMessage(message);
            console.log('[web3] [signature]', signature);

            return;

        } else { return null; }
    }

    /* Create token transfer ABI encoded data
    * `transfer()` method signature at https://eips.ethereum.org/EIPS/eip-20
    * ABI encoding ruleset at https://solidity.readthedocs.io/en/develop/abi-spec.html
    */
    createRaw(abi, functionName, data) {
        const iface = new ethers.utils.Interface(abi);
        return iface.encodeFunctionData(functionName, data);
    }

    executeContract(contract_address, abi, functionName, data, HexZero, gasLimit = 100000) {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {
            if (tinyThis.enabled) {

                // Result
                let transaction;

                try {

                    // Loading
                    const send_account = await tinyThis.requestAccounts();
                    const nonce = await tinyThis.provider.getTransactionCount(send_account, "latest");
                    const currentGasPrice = await tinyThis.getGasPrice();

                    // Hex Value
                    if (!HexZero) {
                        HexZero = ethers.constants.HexZero;
                    }

                    // construct the transaction data
                    const tx = {
                        nonce: nonce,
                        gasLimit: ethers.utils.hexlify(gasLimit),
                        gasPrice: ethers.utils.hexlify(parseInt(currentGasPrice)),
                        to: contract_address,
                        value: HexZero,
                        data: tinyThis.createRaw(abi, functionName, data),
                    };

                    // Transaction
                    transaction = await tinyThis.provider.getSigner().sendTransaction(tx);

                } catch (err) { return reject(err); }
                return resolve(transaction);

            } else { resolve(null); }
            return;
        });
    }

    readContract(contract_address, abi, functionName, data) {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {
            if (tinyThis.enabled) {

                // Result
                let transaction;

                try {

                    const contract = new ethers.Contract(contract_address, abi, tinyThis.provider);
                    transaction = await contract[functionName].apply(contract, data);

                } catch (err) { return reject(err); }
                return resolve(transaction);

            } else { resolve(null); }
            return;
        });
    }

    // Send Payment
    sendTransaction(send_token_amount, to_address = '{{WALLETADDRESS}}', contract_address = null) {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {
            if (tinyThis.enabled) {

                // Result
                let transaction;
                $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });

                try {

                    // Token Mode
                    if (contract_address) {

                        // Connect to the contract
                        if (typeof contract_address === 'string') { contract_address = { value: contract_address, decimals: 18 }; }
                        if (typeof contract_address.value !== 'string') { contract_address.value = ''; }
                        if (typeof contract_address.decimals !== 'number') { contract_address.decimals = 18; }

                        /** Create token transfer value as (10 ** token_decimal) * user_supplied_value
                         * @dev BigNumber instead of BN to handle decimal user_supplied_value
                         */
                        const base = new BigNumber(10);
                        const valueToTransfer = base.pow(contract_address.decimals)
                            .times(String(send_token_amount));

                        // Transaction
                        transaction = await tinyThis.executeContract(contract_address.value, {
                            type: "function",
                            name: "transfer",
                            stateMutability: "nonpayable",
                            payable: false,
                            constant: false,
                            outputs: [{ type: 'uint8' }],
                            inputs: [{
                                name: "_to",
                                type: "address"
                            }, {
                                name: "_value",
                                type: "uint256"
                            }]
                        }, [
                            { type: 'string', value: to_address },
                            { type: 'uint256', value: valueToTransfer.toString() }
                        ]);

                    }

                    // Normal Mode
                    else {

                        to_address = to_address.toLowerCase();
                        const send_account = await tinyThis.requestAccounts();
                        const nonce = await tinyThis.provider.getTransactionCount(send_account, "latest");
                        const currentGasPrice = await tinyThis.getGasPrice();

                        // TX
                        const tx = {
                            from: send_account,
                            to: to_address,
                            value: ethers.utils.parseEther(String(send_token_amount)),
                            nonce: nonce,
                            gasLimit: ethers.utils.hexlify(100000),
                            gasPrice: ethers.utils.hexlify(parseInt(currentGasPrice)),
                        };

                        // Transaction
                        transaction = await tinyThis.provider.getSigner().sendTransaction(tx);

                    }

                    // Complete
                    $.LoadingOverlay("hide");
                    console.log(transaction);

                } catch (err) { $.LoadingOverlay("hide"); return reject(err); }
                return resolve(transaction);

            } else { resolve(null); }
        });
    }

    // Sign
    sign() {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {
            if (tinyThis.enabled) {

                let data;
                try {

                    const address = await tinyThis.requestAccounts();
                    const msg = ethers.utils.toUtf8Bytes(storyCfg.web3.welcome);
                    const signature = await tinyThis.provider.send('personal_sign', [ethers.utils.hexlify(msg), address]);
                    localStorage.setItem('web3_sign', signature);
                    data = signature;

                    $.LoadingOverlay("hide");

                } catch (err) { $.LoadingOverlay("hide"); return reject(err); }
                return resolve(data);

            } else { return resolve(null); }
        });
    }

    // Get Gas Price
    async getGasPrice() {
        if (this.enabled) {
            const value = await this.provider.getGasPrice();
            return value;
        } else { return null; }
    }

    // Request Account
    async requestAccounts(network) {

        // Custom Network
        if (typeof network === 'string' && this.networks[network]) {
            await this.provider.send("wallet_addEthereumChain", [this.networks[network]]);
        } else if (typeof this.network === 'string' && this.networks[this.network]) {
            await this.provider.send("wallet_addEthereumChain", [this.networks[this.network]]);
        }

        // Request
        await this.provider.send("eth_requestAccounts", []);

        // Address
        this.address = await this.provider.getSigner().getAddress();
        this.address = this.address.toLowerCase();
        this.connectionUpdate();

        return this.address;

    }

    // Request Account
    async checkConnection() {
        if (this.enabled) {

            // Request
            this.accounts = await this.provider.send("eth_accounts", []);

            // Address
            if (this.existAccounts()) {

                this.address = await this.provider.getSigner().getAddress();
                this.address = this.address.toLowerCase();
                this.connectionUpdate();

                return this.address;

            } else { return false; }

        } else { return null; }
    }

};