// Base64
var Base64 = require('js-base64');
global.window.Base64 = Base64;

// QrCode
var QRCode = require('qrcode');
global.window.QRCode = QRCode;

// Clone
var clone = require('clone');
global.window.clone = clone;

// Momentjs
var moment = require('moment');
global.window.moment = moment;

// Buffer
// var buffer = require('buffer');
// global.window.buffer = buffer;

// Events
var EventEmitter = require('events')
global.window.EventEmitter = EventEmitter;

// Json repair
var Jsonrepair = require('jsonrepair');
global.window.Jsonrepair = Jsonrepair;
global.window.jsonrepair = Jsonrepair.jsonrepair;

// Marked.js
var marked = require('marked');
global.window.marked = marked;

// Md5
var md5 = require("md5");
global.window.md5 = md5;

// Object Hash
var objHash = require("object-hash");
global.window.objHash = objHash;

// Paginate Array
var paginateArray = require("paginate-array");
global.window.paginateArray = paginateArray;

// FileSaver.js
var FileSaver = require("file-saver");
global.window.FileSaver = FileSaver;
global.window.saveAs = FileSaver.saveAs;

// Jquery
var jQuery = require("jquery");
global.window.jQuery = jQuery;
global.window.$ = jQuery;
require('gasparesganga-jquery-loading-overlay');

// Bootstrap
var bootstrap = require("bootstrap");
global.window.bootstrap = bootstrap;

// Json editor
const JSONEditor = require('@json-editor/json-editor');
global.window.JSONEditor = JSONEditor.JSONEditor;
global.window.JSONEditor.defaults.options.theme = 'bootstrap5';
global.window.JSONEditor.defaults.options.iconlib = "fontawesome5";