// BETA MODULE!

var PuddyWeb3 = class {

    // Constructor Base
    constructor(network, provider) {

        // Base
        const tinyThis = this;

        // Networks
        this.networks = {

            matic: {
                chainId: "0x89",
                rpcUrls: ["https://rpc-mainnet.matic.network/"],
                chainName: "Matic Mainnet",
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
                this.provider = new ethers.providers.Web3Provider(window.ethereum);

                this.checkConnection();

            } else {
                this.enabled = false;
            }
        } else { this.enabled = false; }

        // Complete
        return this;

    }

    // Account Changed
    async accountsChanged(data) {

        // Address
        this.address = await this.provider.getSigner().getAddress();
        this.address = this.address.toLowerCase();
        localStorage.setItem('web3_address', this.address);

        console.log('Web3 Connected', this.address, data);
        return;

    }

    // Account Changed
    networkChanged(networkId) {

        // Network
        this.networkId = networkId;
        localStorage.setItem('web3_network_id', this.networkId);
        console.log('Web3 Network Connected', networkId);
        return;

    }

    // Connection Detected
    connectionUpdate() {
        console.log('Web3 Account', this.address);
        return;
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

    // Send Payment
    sendTransaction(send_token_amount, contract_address = null, to_address = '{{WALLETADDRESS}}') {
        const tinyThis = this;
        return new Promise(async function (resolve, reject) {
            if (tinyThis.enabled) {

                // Result
                let transaction;

                try {

                    // Loading
                    $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                    to_address = to_address.toLowerCase();
                    const send_account = await tinyThis.requestAccounts();
                    const nonce = await tinyThis.provider.getTransactionCount(send_account, "latest");
                    const currentGasPrice = await tinyThis.getGasPrice();

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

                        /* Create token transfer ABI encoded data
                         * `transfer()` method signature at https://eips.ethereum.org/EIPS/eip-20
                         * ABI encoding ruleset at https://solidity.readthedocs.io/en/develop/abi-spec.html
                         */
                        const abi = [{
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
                        }];

                        const iface = new ethers.utils.AbiCoder(abi);
                        const rawData = iface.encode(['string', 'uint256'], [to_address, valueToTransfer.toString()]);

                        // construct the transaction data
                        const tx = {
                            nonce: nonce,
                            gasLimit: ethers.utils.hexlify(100000),
                            gasPrice: ethers.utils.hexlify(parseInt(currentGasPrice)),
                            to: contract_address.value,
                            value: ethers.constants.HexZero,
                            data: rawData,
                        };

                        // Transaction
                        transaction = await tinyThis.provider.getSigner().sendTransaction(tx);

                    }

                    // Normal Mode
                    else {

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

        // Request
        await this.provider.send("eth_accounts", []);

        // Address
        this.address = await this.provider.getSigner().getAddress();
        this.address = this.address.toLowerCase();
        this.connectionUpdate();

        return this.address;

    }

};