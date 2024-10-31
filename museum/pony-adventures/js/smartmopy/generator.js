// Marcador Clock System 

function startclock() {

    var clockpointer = false

    function clock() {

        if (clockpointer == true) {
            $("#clockpointer").css({ "opacity": "0" })
            clockpointer = false
        } else if (clockpointer == false) {
            $("#clockpointer").css({ "opacity": "1" })
            clockpointer = true
        }

        var datecompletepx = new Date();
        var hourcompletepx = datecompletepx.getHours();
        var minutecompletepx = datecompletepx.getMinutes();

        if (minutecompletepx < 10) { minutecompletepx = "0" + minutecompletepx }
        if (hourcompletepx < 10) { hourcompletepx = "0" + hourcompletepx }

        $("#hour").text(hourcompletepx);
        $("#minute").text(minutecompletepx);

    }

    clock();
    setInterval(function() { clock(); }, 1000)

}

$("html").ready(function() { startclock(); });


// Variaveis

var smartpage
var smartpagenumber = 0
var submenuname
var infosubh4
var infosubh6

// Reset Menu

function resetmenupage() { $("#tela").empty(); }

function backpagexps() {
    resetmenupage();
    smartpagenumber = submenuname;
    openappmenu(smartpage);
}



// Gerador de Configurações

function configpagegen(data, databox, finalresult) {

    function submenunext(number, name) {
        resetmenupage();
        smartpagenumber = number
        if (typeof name != 'undefined') { submenuname = name }
        openappmenu(smartpage);
    }

    for (var i = 0; i < data.max; i++) {


        if (databox[i].type == "option") {
            $("#tela").append(

                $("<label>", { id: "label" + databox[i].id, class: "mnoption" }).append($("<input>", { id: databox[i].id, type: "checkbox" }),
                    $("<h4>").text(databox[i].textTop),
                    $("<h6>").text(databox[i].textBottom)
                ).click(function() { finalresult($(this).attr("id")); })

            )
        } else if (databox[i].type == "submenu") {
            $("#tela").append(

                $("<label>", { sub1: databox[i].sub1, sub2: databox[i].sub2, class: "mnsubmenu", id: "msgclickapp_" + databox[i].id }).append(
                    $("<h4>").text(databox[i].textTop),
                    $("<h6>").text(databox[i].textBottom)
                ).click(function() {

                    var idthispksubmenu = $(this).attr("id");

                    infosubh6 = $("#" + idthispksubmenu + " h6").text();
                    infosubh4 = $("#" + idthispksubmenu + " h4").text();

                    submenunext($(this).attr("sub1"), $(this).attr("sub2"));

                }))
        } else if (databox[i].type == "display") {
            $("#tela").append(

                $("<label>", { class: "mndisplay" }).append(
                    $("<h4>").text(databox[i].textTop),
                    $("<h6>").text(databox[i].textBottom)
                )

            )
        }

        if ((i > -1) && (i < data.max - 1)) { $("#tela").append($("<hr>")) }

    }
}



// App List Generator

function fademenuall(removeback) {
    $("#tela").removeClass(removeback);
}

function fademenucss() {
    $("link[id^='boxstyle_']").prop("disabled", true).remove();
    infosubh4 = ""
    infosubh6 = ""
}

function geradorapplist(data, databox) {

    function generatorbadge(badgedate, badgenumber) {
        if (badgenumber > 0) { $(badgedate).append($("<span>", { class: "badge" }).text(badgenumber)); }
    }

    for (var i = 0; i < data.max; i++) {
        appremove1 = false
        appremove2 = false
        appremove3 = false
        appremove4 = false
        if ((databox[i].text1 == "REMOVE")) { appremove1 = true }
        if ((databox[i].text2 == "REMOVE")) { appremove2 = true }
        if ((databox[i].text3 == "REMOVE")) { appremove3 = true }
        if ((databox[i].text4 == "REMOVE")) { appremove4 = true }

        $("#appmenu").append($("<tr>", { id: "32appgenkxpe32" }))
        $("#32appgenkxpe32").append(

            $("<td>", { class: "appidname1" }).append($("<figure>", { id: "app" + databox[i].appName1 })
                .prepend($("<img>", { src: databox[i].image1 }), $("<span>").text(databox[i].text1)).click(function() { openappmenu($(this).attr("id")); })),
            $("<td>", { class: "appidname2" }).append($("<figure>", { id: "app" + databox[i].appName2 })
                .prepend($("<img>", { src: databox[i].image2 }), $("<span>").text(databox[i].text2)).click(function() { openappmenu($(this).attr("id")); })),
            $("<td>", { class: "appidname3" }).append($("<figure>", { id: "app" + databox[i].appName3 })
                .prepend($("<img>", { src: databox[i].image3 }), $("<span>").text(databox[i].text3)).click(function() { openappmenu($(this).attr("id")); })),
            $("<td>", { class: "appidname4" }).append($("<figure>", { id: "app" + databox[i].appName4 })
                .prepend($("<img>", { src: databox[i].image4 }), $("<span>").text(databox[i].text4)).click(function() { openappmenu($(this).attr("id")); }))
        ).removeAttr("id");

        if (appremove1 == true) { $(".appidname1").off("click").css({ "opacity": "0", "pointer-events": "none" }); }
        if (appremove2 == true) { $(".appidname2").off("click").css({ "opacity": "0", "pointer-events": "none" }); }
        if (appremove3 == true) { $(".appidname3").off("click").css({ "opacity": "0", "pointer-events": "none" }); }
        if (appremove4 == true) { $(".appidname4").off("click").css({ "opacity": "0", "pointer-events": "none" }); }

        if (databox[i].notiad1 == true) {
            generatorbadge("#app" + databox[i].appName1, databox[i].not1)
        }
        if (databox[i].notiad2 == true) {
            generatorbadge("#app" + databox[i].appName2, databox[i].not2)
        }
        if (databox[i].notiad3 == true) {
            generatorbadge("#app" + databox[i].appName3, databox[i].not3)
        }
        if (databox[i].notiad4 == true) {
            generatorbadge("#app" + databox[i].appName4, databox[i].not4)
        }

    }
}




// Config Top

function configtop(finaltrue, finalresult) {
    chrome.storage.local.get(function(config) {

        if (config.notist == false) {
            $("#icosmartnoti").removeClass("glyphicon glyphicon-bell");
        } else {
            $("#icosmartnoti").addClass("glyphicon glyphicon-bell");
        }
        if (config.soundst == false) {
            $("#icosmartvolume").removeClass("glyphicon glyphicon-volume-up");
            $("#icosmartvolume").addClass("glyphicon glyphicon-volume-off");
        } else {
            $("#icosmartvolume").removeClass("glyphicon glyphicon-volume-off");
            $("#icosmartvolume").addClass("glyphicon glyphicon-volume-up");
        }
        if (finaltrue == true) { finalresult(config); }

    })
}


// Botões

function backmenuall() {
    if (smartpage == "menu") {} else {
        fademenucss();
        smartpagenumber = 0
        menustart(true);
    }
}

function backmenu() {
    if (smartpagenumber == 0) { backmenuall();
        fademenucss(); } else { backpagexps(); }
}



// Start System

function startsmartsystem() {
    $("#backpage").click(function() { backmenu(); });
    $("#enterhome").click(function() { window.open("/pages/index.html", "_blank") });
    $("#backmenu").click(function() { backmenuall(); });
    menustart();
}

// Menu GEK

function menugekingx(backmenu) {
    if (backmenu == true) { fademenuall(smartpage);
        fademenucss(); }
    smartpage = "menu"
}