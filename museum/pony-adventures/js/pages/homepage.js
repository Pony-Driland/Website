$("#yay").click(function() {
    chrome.windows.create({ url: "chrome://bookmarks/", type: "normal", state: "normal" });
});