// Web3
import BigNumber from 'bignumber.js';
import * as ethers from 'ethers/lib.esm/index.js';

// import WalletConnectQR from '@walletconnect/qrcode-modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import WalletConnect from '@walletconnect/client';

// global.window.WalletConnectQR = WalletConnectQR;
global.window.BigNumber = BigNumber;
global.window.ethers = ethers;
global.window.WalletConnect = WalletConnect;
global.window.WalletConnectProvider = WalletConnectProvider;