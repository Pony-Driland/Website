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

// jsstore
import * as JsStore from "jsstore";

// Validate color
import validateColor from "validate-color";

// Circle Loader
import { Loader } from 'circle-loader';

// Tiny AI
import { setTinyGoogleAi, TinyAiInstance } from 'tiny-ai-api';
import { 
    objType, 
    countObj, 
    shuffleArray, 
    ruleOfThree, 
    toTitleCase, 
    formatDayTimer, 
    addAiMarkerShortcut, 
    installWindowHiddenScript, 
    TinyDomReadyManager, 
    fetchJson, 
    readJsonBlob, 
    TinyNotifications,
    readBase64Blob,
    TinyHtml,
    TinyAfterScrollWatcher,
    TinyTextRangeEditor,
    TinyLocalStorage,
} from 'tiny-essentials';
import TinyDices from 'tiny-dices';

const startModules = new TinyDomReadyManager();
startModules.onReady(() => installWindowHiddenScript());
startModules.init();

global.window.tinyNotification = new TinyNotifications({ audio: '/audio/notification.ogg', defaultIcon: '/img/icon/192.png' });

// Imports
addAiMarkerShortcut();
global.window.circleLoader = Loader;
global.window.tinyLs = new TinyLocalStorage('pony-driland');
global.window.TinyTextRangeEditor = TinyTextRangeEditor;
global.window.TinyDomReadyManager = TinyDomReadyManager;
global.window.TinyAfterScrollWatcher = TinyAfterScrollWatcher;
global.window.TinyHtml = TinyHtml;
global.window.readBase64Blob = readBase64Blob;
global.window.readJsonBlob = readJsonBlob;
global.window.fetchJson = fetchJson;
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