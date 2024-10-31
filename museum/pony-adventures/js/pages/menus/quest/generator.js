function questgenerator(data) {

    if (data.type == "history") {
        var questtypesec = "#questhist"
    } else if (data.type == "economy") {
        var questtypesec = "#questeco"
    } else if (data.type == "social") {
        var questtypesec = "#questsoci"
    } else if (data.type == "special") {
        var questtypesec = "#questespe"
    } else { return }



    $(questtypesec + " ol").append($("<li>").text(data.title).click(function() {

        $("#questmenu ul li ol li").removeClass("active");
        $(this).addClass("active");

        $("#quesitem").fadeOut("fast", function() {
            $("#quesitem").empty().append(

                $("<strong>", { class: "qsttitle" }).text(data.title),
                $("<br>"),
                $("<strong>", { class: "qstdif" }).text(chrome.i18n.getMessage("dificuldade") + ": " + data.dific),
                $("<br>"), $("<br>"),
                $("<p>", { class: "qsttext" }).text(data.text),
                $("<br>"), $("<hr>"), $("<br>"),
                $("<strong>", { class: "qstdica" }).text(chrome.i18n.getMessage("dica") + ": "),
                $("<p>", { class: "qsttedi" }).text(data.dica)

            )

            $("#quesitem").fadeIn("fast");

        })
    }));

}