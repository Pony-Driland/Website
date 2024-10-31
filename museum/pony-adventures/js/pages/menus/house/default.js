function ponystartpagehs() {
    chrome.storage.local.get(function(config) {
        if (config.status == null) { config.status = "principal" }
        getponycolor({ "loadChar": true, "ponyface": config.status, "finalResult": true }, function(config) { $("#ponymyname").text(config.ponyname); });
    })
}

ponystartpagehs();

// Ativar Gerador

openitemlist({ "type": "foodlist" });

$("[id='inventoryclickop']").click(function() { openitemlist({ "type": $(this).attr("typetb") }); });




$("#banhogo").click(function() {
    getdateexport({
        "auto": true,
        "format": false,
        "variable": false,
        "edit": true,
        "mode": "add",
        "minute": 10
    }, function(banhoclock) {

        $("#container").css("pointer-events", "none").fadeTo("slow", "0")
        clicllockclose = true
        chrome.storage.local.set({ banhotimed: true, banhoclock: banhoclock });

        modalgenerator({
            "id": "banho",
            "title": chrome.i18n.getMessage("banhotitle"),
            "text": chrome.i18n.getMessage("banhoinip1") + " 10 " + chrome.i18n.getMessage("banhoinip2"),
            "close": chrome.i18n.getMessage("close")
        })

        chromebackground({ "text": "entrarbanheiro", "response": "entrarbanheiro2", "type": "send" }, function() {})

    })
})