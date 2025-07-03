// Socket.io
import { io } from 'socket.io-client';

// Tippy JS
import tippy from 'tippy.js';

// For Promise
import forPromise from 'for-promise';

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

// Validate color
import validateColor from "validate-color";

// Tiny AI
import { setTinyGoogleAi, TinyAiInstance } from 'tiny-ai-api';
import { objType, countObj, shuffleArray, ruleOfThree, toTitleCase, formatDayTimer, addAiMarkerShortcut } from 'tiny-essentials';
import TinyDices from 'tiny-dices';

// Imports
addAiMarkerShortcut();
global.window.TinyDices = TinyDices;
global.window.setTinyGoogleAi = setTinyGoogleAi;
global.window.TinyAiInstance = TinyAiInstance;
global.window.validateColor = validateColor;
global.window.JsStore = JsStore;
global.window.tippy = tippy;
global.window.io = io;
global.window.forPromise = forPromise;
global.window.ruleOfThree = ruleOfThree;
global.window.toTitleCase = toTitleCase;
global.window.formatDayTimer = formatDayTimer;
global.window.objType = objType;
global.window.countObj = countObj;
global.window.shuffleArray = shuffleArray;
global.window.Pizzicato = Pizzicato;
global.window.PhotoSwipeLightbox = PhotoSwipeLightbox;
// global.window.WalletConnectQR = WalletConnectQR;
global.window.BigNumber = BigNumber;
global.window.ethers = ethers;
global.window.WalletConnect = WalletConnect;
global.window.WalletConnectProvider = WalletConnectProvider;