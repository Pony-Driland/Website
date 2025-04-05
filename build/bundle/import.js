// Socket.io
import { io } from 'socket.io-client';

// Tippy JS
import tippy from 'tippy.js';

// For Promise
import forPromise from 'for-promise';
import { countObj, objType } from 'for-promise/utils/lib.mjs';

// Photoswipe
import PhotoSwipeLightbox from 'photoswipe';

// Pizzicato
import Pizzicato from 'pizzicato';

// Web3
import BigNumber from 'bignumber.js';
import * as ethers from 'ethers/lib.esm/index.js';

// import WalletConnectQR from '@walletconnect/qrcode-modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import WalletConnect from '@walletconnect/client';

// jsstore
import * as JsStore from "jsstore";

// Imports
global.window.JsStore = JsStore;
global.window.tippy = tippy;
global.window.io = io;
global.window.forPromise = forPromise;
global.window.objType = objType;
global.window.countObj = countObj;
global.window.Pizzicato = Pizzicato;
global.window.PhotoSwipeLightbox = PhotoSwipeLightbox;
// global.window.WalletConnectQR = WalletConnectQR;
global.window.BigNumber = BigNumber;
global.window.ethers = ethers;
global.window.WalletConnect = WalletConnect;
global.window.WalletConnectProvider = WalletConnectProvider;