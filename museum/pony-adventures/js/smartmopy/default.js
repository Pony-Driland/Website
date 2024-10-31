// Menu

function menustart(backmenu) {
    chrome.storage.local.get(function(config) {

        if (config.smscount == null) { config.smscount = 0; }
        if ((config.money == undefined) || (config.money == null)) {
            chrome.storage.local.set({ money: 0 });
        }
        if ((config.bank == undefined) || (config.bank == null)) {
            chrome.storage.local.set({ bank: 0 });
        }

        resetmenupage();
        $("#tela").append($("<table>", { id: "appmenu" }))

        // Lista 1

        geradorapplist({ "max": "1" }, [

            {
                // SMS
                "text1": chrome.i18n.getMessage("appsms"),
                "image1": "../../images/default_page/banner/default2.png",
                "appName1": "sms",
                "notiad1": true,
                "not1": config.smscount,
                // Configurações
                "text2": chrome.i18n.getMessage("appconfig"),
                "image2": "../../images/default_page/banner/default2.png",
                "appName2": "config",
                // Ajuda
                "text3": chrome.i18n.getMessage("apphelp"),
                "image3": "../../images/default_page/banner/default2.png",
                "appName3": "help",
                "text4": "REMOVE"
            }

        ])
        menugekingx(backmenu);
    })
}


















// Loading System

function createregisterpage() {
    $("#tela").empty().append($("<div>", { id: "welcome" }).append(
        $("<div>", { class: "privacytext" }).text(chrome.i18n.getMessage("registersmartmopy")),
        $("<div>", { class: "registerclick" }).append($("<a>").text(chrome.i18n.getMessage("continue"))
            .click(function() { window.open("/pages/welcome.html", "_blank") }))
    ))
}

function registerpindelete() {
    $(".bottom").empty().off("click").text(chrome.i18n.getMessage("resetaccountpin") + " ")
        .append($("<a>").click(function() {


            $(".bottom").empty().append($("<a>").text(chrome.i18n.getMessage("clickresetpinconfirm1")).click(function() {
                $(".bottom").empty().append($("<a>").text(chrome.i18n.getMessage("clickresetpinconfirm2")).click(function() {
                    $(".bottom").empty().append($("<a>").text(chrome.i18n.getMessage("clickresetpinconfirm3")).click(function() {
                        $(".bottom").empty().append($("<a>").text(chrome.i18n.getMessage("clickresetpinconfirm4")).click(function() {
                            var confirmemptypin = confirm(chrome.i18n.getMessage("clickresetpinconfirm5") + ":")
                            if (confirmemptypin == true) {
                                resetextension(true, function() { createregisterpage(); });
                            } else { registerpindelete(); }
                        }))
                    }))
                }))
            }))


        }).text(chrome.i18n.getMessage("clickherepin")))
}

configtop(true, function(config) {

    if (config.registred == true) {
        if (config.passworden == true) {

            $("#tela").append($("<div>", { id: "blockpage" }).append(
                $("<div>", { class: "top" }).text(chrome.i18n.getMessage("insertpin")),
                $("<div>", { class: "bottom" }).text(chrome.i18n.getMessage("resetaccountpin") + " "),
                $("<input>", { id: "passwordinsert", type: "password" }).on("keyup", function() {
                    if ($(this).val() == config.password) {
                        chrome.storage.local.set({ passworden: false })
                        resetmenupage();
                        startsmartsystem();
                    }
                })
            ))

            registerpindelete();

        } else { startsmartsystem(); }
    } else { createregisterpage(); }

});