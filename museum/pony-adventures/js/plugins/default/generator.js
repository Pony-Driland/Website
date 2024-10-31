// Load Page

$("body").prepend($("<div>", { id: "modalgenerator" }))

chrome.storage.local.get(function(config) {

    if (config.nmfome == null) { config.nmfome = 100 }
    if (config.nmsede == null) { config.nmsede = 100 }
    if (config.nmenergia == null) { config.nmenergia = 100 }
    if (config.nmhigiene == null) { config.nmhigiene = 100 }

    if (config.nmsdgood == null) { config.nmsdgood = 100 }
    if (config.nmsdbad == null) { config.nmsdbad = 0 }

    if (config.money == null) { config.money = 0 }
    if (config.bannerfile == null) { config.bannerfile = "default" }

    $("body").append($("<div>", { id: "moreinfo", class: "nopeselect" }).append(

            $("<span>").text("© " + chrome.i18n.getMessage("appName") + " - 2016 "),
            $("<a>", { href: "https://jackiedreasond.tumblr.com", target: "_blank" }).text("Jackie Apkon"),
            $("<span>").text(" | " + chrome.i18n.getMessage("artmadeby") + " "),
            $("<a>", { href: "http://wandrevieira1994.deviantart.com/", target: "_blank" }).text("wandrevieira1994"),
            $("<span>").text(" | " + chrome.i18n.getMessage("translationmadeby") + " "),
            $("<a>", { href: chrome.i18n.getMessage("translationcrediturl"), target: "_blank" }).text(chrome.i18n.getMessage("translationcreditname"))

        ),

        $("<div>", { id: "scrollup", class: "glyphicon glyphicon-arrow-up" }).click(
            function() { $("html, body").animate({ scrollTop: 0 }, "slow"); }).affix({ offset: { top: 575 } })

    ).prepend($("<div>", { id: "banner", style: "background-image: url(" + chrome.extension.getURL("images/default_page/banner/" + config.bannerfile + ".png") + ");" }).append(

            $("<div>", { class: "logoname nopeselect" }).append(
                $("<div>", { class: "logoname1" }).text(chrome.i18n.getMessage("appNamepart1")),
                $("<div>", { class: "logoname2" }).text(chrome.i18n.getMessage("appNamepart2"))
            ),

            $("<div>", { class: "statuscharacterx" }).append(
                $("<div>", { class: "moneyfocus afsetpxr" }).text(" " + chrome.i18n.getMessage("moneyCounts")).prepend($("<span>", { id: "moneycount" }).text(config.money)),

                $("<div>", { class: "statusfocus nopeselect afsetpxr" }).append(
                    $("<span>", { id: "stfome" }).append($("<img>", { src: chrome.extension.getURL("images/default_page/status/fome.png"), height: "18", width: "18" }).on('dragstart', function(event) { event.preventDefault(); }),
                        $("<span>", { id: "nmfome" }).text(config.nmfome + "%")),

                    $("<span>", { id: "stsede" }).append($("<img>", { src: chrome.extension.getURL("images/default_page/status/sede.png"), height: "18", width: "18" }).on('dragstart', function(event) { event.preventDefault(); }),
                        $("<span>", { id: "nmsede" }).text(config.nmsede + "%")),

                    $("<span>", { id: "stenergia" }).append($("<img>", { src: chrome.extension.getURL("images/default_page/status/energia.png"), height: "18", width: "18" }).on('dragstart', function(event) { event.preventDefault(); }),
                        $("<span>", { id: "nmenergia" }).text(config.nmenergia + "%")),

                    $("<span>", { id: "sthigiene" }).append($("<img>", { src: chrome.extension.getURL("images/default_page/status/higiene.png"), height: "18", width: "18" }).on('dragstart', function(event) { event.preventDefault(); }),
                        $("<span>", { id: "nmhigiene" }).text(config.nmhigiene + "%")),

                    $("<div>", { id: "nmsaude", class: "progress" }).append(
                        $("<div>", { id: "nmsdgood", class: "progress-bar progress-bar-success", role: "progressbar", style: "width:" + config.nmsdgood + "%" }),
                        $("<div>", { id: "nmsdbad", class: "progress-bar progress-bar-danger", role: "progressbar", style: "width:" + config.nmsdbad + "%" })
                    )
                )
            ).affix({ offset: { top: 275 } })

        ),

        $("<ul>", { id: "menu", class: "nopeselect" }).append(

            $("<li>").append($("<a>").text(chrome.i18n.getMessage("menuhome"))).click(function() { document.location.href = "/pages/index.html" }),
            $("<li>").append($("<a>").text(chrome.i18n.getMessage("menuyourhome"))).click(function() { document.location.href = "/pages/menu/house.html" }),
            $("<li>").append($("<a>").text(chrome.i18n.getMessage("menumap"))).click(function() { document.location.href = "/pages/menu/map.html" }),
            $("<li>").append($("<a>").text(chrome.i18n.getMessage("menuquest"))).click(function() { document.location.href = "/pages/menu/quest.html" })

        ))

})