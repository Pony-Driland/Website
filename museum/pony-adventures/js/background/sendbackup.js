chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "entrarbanheiro") {
        sendResponse({ type: "entrarbanheiro2" })
        chromebackground({ "text": "clicllockclose1", "response": "clicllockclose2", "type": "send" }, function() {})
    };
});