var clicllockclose = false

// Tranca PIN

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "lockclose1") {
        sendResponse({ type: "lockclose2" })
        window.close();
    };
});

// Tranca PIN

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "clicllockclose1") {
        sendResponse({ type: "clicllockclose2" })
        if (clicllockclose == false) { window.close(); }
    };
});

// ATUALIZAÇÃO

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "updatestatus1") {
        sendResponse({ type: "updatestatus2" })
        updatecharstatus({ "all": true });
    };
});

//MONEY

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "moneyupdatest1") {
        sendResponse({ type: "moneyupdatest2" })
        updatecharstatus({ "money": true, "bank": true });
    };
});