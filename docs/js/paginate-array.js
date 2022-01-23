(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
var paginateArray = require("paginate-array");
global.window.paginateArray = paginateArray;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"paginate-array":2}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = function (collection) {
  var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var numItems = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10;

  if (!Array.isArray(collection)) {
    throw "Expect array and got " + (typeof collection === "undefined" ? "undefined" : _typeof(collection));
  }
  var currentPage = parseInt(page);
  var perPage = parseInt(numItems);
  var offset = (page - 1) * perPage;
  var paginatedItems = collection.slice(offset, offset + perPage);

  return {
    currentPage: currentPage,
    perPage: perPage,
    total: collection.length,
    totalPages: Math.ceil(collection.length / perPage),
    data: paginatedItems
  };
};

module.exports = exports["default"];
},{}]},{},[1]);
