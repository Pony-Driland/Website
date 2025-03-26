// Photoswipe
import PhotoSwipeLightbox from 'photoswipe';

// Pizzicato
import Pizzicato from 'pizzicato';

// Web3
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers/lib.esm/index.js';

// import WalletConnectQR from '@walletconnect/qrcode-modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import WalletConnect from '@walletconnect/client';

// Imports
global.window.Pizzicato = Pizzicato;
global.window.PhotoSwipeLightbox = PhotoSwipeLightbox;
// global.window.WalletConnectQR = WalletConnectQR;
global.window.BigNumber = BigNumber;
global.window.ethers = ethers;
global.window.WalletConnect = WalletConnect;
global.window.WalletConnectProvider = WalletConnectProvider;