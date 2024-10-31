//Analisador

chrome.storage.local.get(function(config) {
    var chromeurl = chrome.extension.getURL('')
    if ($(location).attr('href') == chromeurl + 'pages/welcome.html') {} else if (config.registred == null) { document.location.href = "welcome.html" }
    if (config.passworden == true) { window.close(); } else if (config.penalidade == true) {
        var penalidadedate = new Date(config.penalidadetime);
        alert(chrome.i18n.getMessage("penawarn") + ":\n" + penalidadedate)
        window.close();
    } else if (config.hospital == true) {
        var hospitaldate = new Date(config.hospitaltime);
        alert(chrome.i18n.getMessage("hospitalwarn") + ":\n" + hospitaldate)
        window.close();
    } else if (config.banhotimed == true) {
        var banhodate = new Date(config.banhoclock);
        alert(chrome.i18n.getMessage("banhowarn") + ":\n" + banhodate)
        window.close();
    }
})






// Setar Idioma

function localizeHtmlPage() {
    $("[langchrome]").each(function() {
        var setlangchrome = $(this).attr("langchrome")

        if ($(this).is('input')) { $(this).val(chrome.i18n.getMessage(setlangchrome)) } else if ($(this).is('title')) {

            var titlepst = $(this).text()

            if ($(this).attr("titlepst") == "left") {
                document.title = titlepst + chrome.i18n.getMessage(setlangchrome)
            } else if ($(this).attr("titlepst") == "right") {

                var titlepst = $(this).text()

                document.title = chrome.i18n.getMessage(setlangchrome) + titlepst
            }

            if ($(this).attr("titlepst") == "leftEX") {
                document.title = chrome.i18n.getMessage("appName") + " - " + chrome.i18n.getMessage(setlangchrome)
            } else if ($(this).attr("titlepst") == "rightEX") {
                document.title = chrome.i18n.getMessage(setlangchrome) + " - " + chrome.i18n.getMessage("appName")
            } else {
                document.title = chrome.i18n.getMessage(setlangchrome)
            }

        } else { $(this).text(chrome.i18n.getMessage(setlangchrome)) }

        $(this).removeAttr("langchvalue").removeAttr("langchrome")
    })
}

$("html").ready(function() { localizeHtmlPage(); })









// Modal Alert

function modalgenerator(data, finalresult) {

    if (data.multioption == true) {
        $("#modalgenerator").empty().append($("<div>", { class: "modal fade", id: data.id }).append($("<div>", { class: "modal-dialog" })
            .append($("<div>", { class: "modal-content" }).append(

                $("<div>", { class: "modal-header" }).append(
                    $("<button>", { type: "button", class: "close", "data-dismiss": "modal" }).text("×"),
                    $("<h4>", { class: "modal-title" }).text(data.title)
                ),

                $("<div>", { class: "modal-body" }).append($("<p>").text(data.text)),

                $("<div>", { class: "modal-footer" }).append(
                    $("<button>", { type: "button", class: "btn btn-default", "data-dismiss": "modal" }).text(data.close_2).click(function() {
                        finalresult();
                        $("#" + data.id).modal('toggle');
                    }),
                    $("<button>", { type: "button", class: "btn btn-default", "data-dismiss": "modal" }).text(data.close)
                )
            ))))
    } else {
        $("#modalgenerator").empty().append($("<div>", { class: "modal fade", id: data.id }).append($("<div>", { class: "modal-dialog" })
            .append($("<div>", { class: "modal-content" }).append(

                $("<div>", { class: "modal-header" }).append(
                    $("<button>", { type: "button", class: "close", "data-dismiss": "modal" }).text("×"),
                    $("<h4>", { class: "modal-title" }).text(data.title)
                ),

                $("<div>", { class: "modal-body" }).append($("<p>").text(data.text)),

                $("<div>", { class: "modal-footer" }).append(
                    $("<button>", { type: "button", class: "btn btn-default", "data-dismiss": "modal" }).text(data.close)
                )
            ))))
    }

    $("#" + data.id).modal();

}