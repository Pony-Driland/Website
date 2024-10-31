// Variaveis

var crinasp
var vamp

var basenumber
var focinhonumber
var crinanumber
var caudanumber
var olhonumber
var multicolorcrina
var multicolorcauda







// Change Color

function colorcharchange(data) {
    $("#" + data.base).remove();

    if (data.this == "on") {
        if ($(data.white).prop("checked") == true) {
            $(data.grayscale).val(100).prop("disabled", true);
            $(data.huerotate).prop("disabled", true);
            $(data.brightness).attr("max", "500");
            $(data.saturate).val(100).prop("disabled", true);
        } else if ($(data.white).prop("checked") == false) {
            $(data.grayscale).val(0).prop("disabled", false);
            $(data.huerotate).prop("disabled", false);
            $(data.brightness).val(100).attr("max", "100");
            $(data.saturate).val(100).prop("disabled", false);
        }
    }

    function setsaturemax(set) {
        $(set.id).attr("max", set.max)
    }

    if (($(data.huerotate).val() > -1) && ($(data.huerotate).val() < 64)) { setsaturemax({ "max": 100, "id": data.saturate }) } else if (($(data.huerotate).val() > 88) && ($(data.huerotate).val() < 165)) { setsaturemax({ "max": 493, "id": data.saturate }) } else if (($(data.huerotate).val() > 215) && ($(data.huerotate).val() < 335)) { setsaturemax({ "max": 110, "id": data.saturate }) } else if (($(data.huerotate).val() > 334) && ($(data.huerotate).val() < 361)) { setsaturemax({ "max": 100, "id": data.saturate }) } else { $(data.saturate).attr("max", 800) }

    if (data.Tgrayscale == true) { var grayscale = "grayscale(" + $(data.grayscale).val() + "%) "; } else { var grayscale = "" }
    if (data.Tbrightness == true) { var brightness = "brightness(" + $(data.brightness).val() + "%) "; } else { var brightness = "" }
    if (data.Thuerotate == true) { var huerotate = "hue-rotate(" + $(data.huerotate).val() + "deg) "; } else { var huerotate = "" }
    if (data.Tsaturate == true) { var saturate = "saturate(" + $(data.saturate).val() + "%)"; } else { var saturate = "" }

    $("head").append($("<style>", { id: data.base }).text(data.id + "{-webkit-filter:" + grayscale + brightness + huerotate + saturate + " !important;}"))
}


function changecolor(setcolor) {

    //Cor de Pele

    if (setcolor.data == "pelerange") {
        colorcharchange({
            "id": ".baseglobalcolor",
            "grayscale": "#pelerange1",
            "brightness": "#pelerange2",
            "huerotate": "#pelerange3",
            "saturate": "#pelerange4",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#pelebranca",
            "base": "charpelecolor",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Crina 1
    else if (setcolor.data == "crinarange1") {
        colorcharchange({
            "id": ".ocpcrina1",
            "grayscale": "#crinarange11",
            "brightness": "#crinarange12",
            "huerotate": "#crinarange13",
            "saturate": "#crinarange14",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#crinabranca1",
            "base": "charcrinacolor1",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Crina 2
    else if (setcolor.data == "crinarange2") {
        colorcharchange({
            "id": ".ocpcrina2",
            "grayscale": "#crinarange21",
            "brightness": "#crinarange22",
            "huerotate": "#crinarange23",
            "saturate": "#crinarange24",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#crinabranca2",
            "base": "charcrinacolor2",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Crina 3
    else if (setcolor.data == "crinarange3") {
        colorcharchange({
            "id": ".ocpcrina3",
            "grayscale": "#crinarange31",
            "brightness": "#crinarange32",
            "huerotate": "#crinarange33",
            "saturate": "#crinarange34",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#crinabranca3",
            "base": "charcrinacolor3",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Cauda 1
    else if (setcolor.data == "caudarange1") {
        colorcharchange({
            "id": ".ocpcauda1",
            "grayscale": "#caudarange11",
            "brightness": "#caudarange12",
            "huerotate": "#caudarange13",
            "saturate": "#caudarange14",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#caudabranca1",
            "base": "charcaudacolor1",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Cauda 2
    else if (setcolor.data == "caudarange2") {
        colorcharchange({
            "id": ".ocpcauda2",
            "grayscale": "#caudarange21",
            "brightness": "#caudarange22",
            "huerotate": "#caudarange23",
            "saturate": "#caudarange24",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#caudabranca2",
            "base": "charcaudacolor2",
            "this": $(setcolor.this).val()
        })
    }

    //Cor de Cauda 3
    else if (setcolor.data == "caudarange3") {
        colorcharchange({
            "id": ".ocpcauda3",
            "grayscale": "#caudarange31",
            "brightness": "#caudarange32",
            "huerotate": "#caudarange33",
            "saturate": "#caudarange34",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#caudabranca3",
            "base": "charcaudacolor3",
            "this": $(setcolor.this).val()
        })
    }

    //Cor do Olho 1
    else if (setcolor.data == "olhorange1") {
        colorcharchange({
            "id": ".ocpolho1",
            "grayscale": "#olhorange11",
            "brightness": "#olhorange12",
            "huerotate": "#olhorange13",
            "saturate": "#olhorange14",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#olhobranca1",
            "base": "charolhocolor1",
            "this": $(setcolor.this).val()
        })
    }

    //Cor do Olho 2
    else if (setcolor.data == "olhorange2") {
        colorcharchange({
            "id": ".ocpolho2",
            "grayscale": "#olhorange21",
            "brightness": "#olhorange22",
            "huerotate": "#olhorange23",
            "saturate": "#olhorange24",
            "Tgrayscale": true,
            "Tbrightness": true,
            "Thuerotate": true,
            "Tsaturate": true,
            "white": "#olhobranca2",
            "base": "charolhocolor2",
            "this": $(setcolor.this).val()
        })
    }

}





// Trocar Classe

function changeclass(thishere) {

    if (vamp == true) { var vampimg = "batpony.png" } else { var vampimg = "normal.png" }

    function classselect(data) {
        $("#extrabody").remove();
        if (data.add == true) {
            $("head").append($("<style>", { id: "extrabody" }).text("." + data.id + "{background-image:url(" + data.img + ");}"));
        }
    }

    if ($(thishere).val() == "terr") { classselect({ "add": false }) } else if ($(thishere).val() == "pegs") { classselect({ "add": true, "id": "ocasa", "img": "../../images/oc-principal/" + basenumber + "/principal/class/asa-" + vampimg }) } else if (($(thishere).val() == "unic") && (crinasp == "true")) { classselect({ "add": true, "id": "occhifre", "img": "../../images/oc-principal/" + basenumber + "/principal/class/chifre-f2.png" }) } else if ($(thishere).val() == "unic") { classselect({ "add": true, "id": "occhifre", "img": "../../images/oc-principal/" + basenumber + "/principal/class/chifre-f1.png" }) }

}









// Selecionar

function selectoptioncustom(valueIMG) {
    $("#customselected [value='" + valueIMG + "']").prop("checked", true);
    $("#customimagep").css({ 'background-image': $("#customselected [value='" + valueIMG + "']").attr("optionimage") });
}



// Botão Escolher

var clickesck = false
var typeop

function changeclickset(data, databox) {
    if (clickesck == false) {
        typeop = data.type


        if (data.type == "base") {
            $("#itemponyname").text(chrome.i18n.getMessage("base"));
        } else if (data.type == "focinho") {
            $("#itemponyname").text(chrome.i18n.getMessage("focinho"));
        } else if (data.type == "crina") {
            $("#itemponyname").text(chrome.i18n.getMessage("crina"));
        } else if (data.type == "cauda") {
            $("#itemponyname").text(chrome.i18n.getMessage("cauda"));
        } else if (data.type == "olho") {
            $("#itemponyname").text(chrome.i18n.getMessage("olho"));
        }



        for (var i = 0; i < data.max; i++) {

            if (databox[i].separe == true) {
                $("#customselected").append(
                    $("<hr>"), $("<div>").text(databox[i].text)
                )
            } else {
                $("#customselected").append($("<label>").append(
                    $("<input>", { type: "radio", name: "selectcustom", optionimage: databox[i].opimage, value: databox[i].value, multicolor: databox[i].multicolor, shadow: databox[i].shadow, crinasp: databox[i].crinasp })
                    .click(function() { selectoptioncustom($(this).val()) }),
                    $("<span>").text(databox[i].text)
                ))
            }

        }

        selectoptioncustom(data.select);

        if (data.auto == true) {} else {
            $("#chagetablet").fadeIn("fast");
        }
        clickesck = true
    }
}




//Visual Click

//Close Pony

function closeponypx() {
    $("#chagetablet").fadeOut("fast");
    clickesck = false
    $("#customlistp [customselect='true']").off("click");
    $("#customselected").empty();
}


// Save Pony

function saveponypx(scrollingenable) {

    function setmulticolorpt(data) {

        if (data.remove == true) {
            $("[removepxbottom='" + data.type + "']").attr("removept", "bottom");
            $("[removepxcenter='" + data.type + "']").attr("removept", "center").css({ "display": "" });
            $("[removepxtop='" + data.type + "']").attr("removept", "top").css({ "display": "" });
        } else if (data.remove == false) {
            $("[removepxbottom='" + data.type + "']").removeAttr("removept");
            $("[removepxcenter='" + data.type + "']").removeAttr("removept").css({ "display": "none" });
            $("[removepxtop='" + data.type + "']").removeAttr("removept").css({ "display": "none" });
        }

    }

    $("[id*='custom" + typeop + "dskpex']").remove();

    if (vamp == true) { var vampimg = "batpony.png" } else { var vampimg = "normal.png" }

    // Base

    if (typeop == "base") {
        basenumber = $("input:radio[name='selectcustom']:checked").val()

        $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
            .text(".ocpbase{background-image: url(../../images/oc-principal/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/principal/base.png) ;} .ocpboca{background-image: url(../../images/oc-principal/base1/principal/boca/" + vampimg + ");} .ocporelha{background-image: url(../../images/oc-principal/base1/principal/orelha/" + vampimg + ");}"))

        $("#chagetablet").fadeOut("fast");
        clickesck = false
        $("#customlistp [customselect='true']").off("click");
        $("#customselected").empty();

        changeponyopen("visualfocinho", true);
        saveponypx();
        changeponyopen("visualfocinho", true);
        saveponypx();
        changeponyopen("visualcrina", true);
        saveponypx();
        changeponyopen("visualcauda", true);
        saveponypx();
        changeponyopen("visualolho", true);
        saveponypx();

    }

    // Focinho
    else if (typeop == "focinho") {
        focinhonumber = $("input:radio[name='selectcustom']:checked").val()

        $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
            .text(".ocpfocinho{background-image: url(../../images/oc-principal/" + basenumber + "/principal/focinho/" + $("input:radio[name='selectcustom']:checked").attr("value") + ".png);}"))
    }

    // Crina
    else if (typeop == "crina") {
        crinanumber = $("input:radio[name='selectcustom']:checked").val()
        multicolorcrina = $("input:radio[name='selectcustom']:checked").attr("multicolor")
        crinasp = $("input:radio[name='selectcustom']:checked").attr("crinasp")

        if ($("input:radio[name='selectcustom']:checked").attr("shadow") == "true") {
            var shadowoptionpx = ", url(url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/shadow.png)"
        } else if ($("input:radio[name='selectcustom']:checked").attr("shadow") == "false") {
            var shadowoptionpx = " "
        }

        if ($("input:radio[name='selectcustom']:checked").attr("multicolor") == "false") {

            setmulticolorpt({ "type": "crina", "remove": false });

            $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
                .text(".ocpcrina1{background-image: url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + ".png" + shadowoptionpx + ");}"))

        } else if ($("input:radio[name='selectcustom']:checked").attr("multicolor") == "true") {

            setmulticolorpt({ "type": "crina", "remove": true });

            $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
                .text(".ocpcrina1{background-image: url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part1.png" + shadowoptionpx + ");} .ocpcrina2{background-image: url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part2.png);} .ocpcrina3{background-image: url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/lineart.png), url(../../images/oc-principal/" + basenumber + "/principal/crina/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part3.png);}"))

        }

        changeclass("#ponyclass");

    }

    // Cauda
    else if (typeop == "cauda") {
        caudanumber = $("input:radio[name='selectcustom']:checked").val()
        multicolorcauda = $("input:radio[name='selectcustom']:checked").attr("multicolor")

        if ($("input:radio[name='selectcustom']:checked").attr("multicolor") == "false") {

            setmulticolorpt({ "type": "cauda", "remove": false });

            $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
                .text(".ocpcauda1{background-image: url(../../images/oc-principal/" + basenumber + "/principal/cauda/" + $("input:radio[name='selectcustom']:checked").attr("value") + ".png);}"))

        } else if ($("input:radio[name='selectcustom']:checked").attr("multicolor") == "true") {

            setmulticolorpt({ "type": "cauda", "remove": true });

            $("head").append($("<style>", { id: "custom" + typeop + "dskpex" })
                .text(".ocpcauda1{background-image: url(../../images/oc-principal/" + basenumber + "/principal/cauda/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part1.png) ;} .ocpcauda2{background-image: url(../../images/oc-principal/" + basenumber + "/principal/cauda/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part2.png) ;} .ocpcauda3{background-image: url(../../images/oc-principal/" + basenumber + "/principal/cauda/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/lineart.png), url(../../images/oc-principal/" + basenumber + "/principal/cauda/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/part3.png);}"))

        }

    }

    // Olho
    else if (typeop == "olho") {
        olhonumber = $("input:radio[name='selectcustom']:checked").val()

        $("head").append(
            $("<style>", { id: "custom" + typeop + "dskpex1" })
            .text(".ocpolho1{background-image: url(../../images/oc-principal/" + basenumber + "/principal/olho/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/base.png);}"),
            $("<style>", { id: "custom" + typeop + "dskpex2" })
            .text(".ocpolho2{background-image: url(../../images/oc-principal/" + basenumber + "/principal/olho/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/olho-" + vampimg + ");}"),
            $("<style>", { id: "custom" + typeop + "dskpex3" })
            .text(".ocpolho3{background-image: url(../../images/oc-principal/" + basenumber + "/principal/olho/" + $("input:radio[name='selectcustom']:checked").attr("value") + "/reflexo.png);}")
        )
    }


    if (typeop == "base") {} else {
        $("#chagetablet").fadeOut("fast");
        clickesck = false
        $("#customlistp [customselect='true']").off("click");
        $("#customselected").empty();
    }

    if (scrollingenable == true) {
        $('html,body').animate({
                scrollTop: $("#customstart").offset().top
            },
            'slow');
    }

}









// Get Colors Config

function getponycolor(command, finalresult) {
    chrome.storage.local.get(function(config) {

        function setcoloring(data, bwdata, databox) {
            for (var i = 0; i < 5; i++) {
                var irs = i + 1
                if (irs == 1) {
                    if (databox.blackwhite == true) { $("#" + data + irs).val(databox.grayscale).prop("disabled", true) } else { $("#" + data + irs).val(databox.grayscale).prop("disabled", false) }
                } else if (irs == 2) {
                    if (databox.blackwhite == true) { $("#" + data + irs).attr("max", 500).val(databox.brightness) } else {
                        $("#" + data + irs).val(databox.brightness)
                    }
                } else if (irs == 3) {
                    if (databox.blackwhite == true) { $("#" + data + irs).val(databox.huerotate).prop("disabled", true) } else { $("#" + data + irs).val(databox.huerotate).prop("disabled", false) }
                } else if (irs == 4) {
                    if (databox.blackwhite == true) { $("#" + data + irs).val(databox.saturate).prop("disabled", true) } else { $("#" + data + irs).val(databox.saturate).prop("disabled", false) }
                } else if (irs == 5) { $("#" + bwdata).prop("checked", databox.blackwhite) }
            }
        }

        function autocolorstart(data) {
            for (var i = 1; i < 4; i++) {
                changecolor({ "data": data.type, "this": "#" + data.id + i });
            }
        }

        if (config.vamp == null) { config.vamp = false }
        if (config.basenumber == null) { config.basenumber = "base1" }
        if (config.focinhonumber == null) { config.focinhonumber = "f1" }
        if (config.crinanumber == null) { config.crinanumber = "f1" }
        if (config.caudanumber == null) { config.caudanumber = "f1" }
        if (config.olhonumber == null) { config.olhonumber = "f1" }
        if (config.multicolorcrina == null) { config.multicolorcrina = false }
        if (config.multicolorcauda == null) { config.multicolorcauda = false }

        if (config.ponyname == null) { config.ponyname = "" }
        if (config.ponyclass == null) { config.ponyclass = "terr" }
        if (config.ponygem == null) { config.ponygem = "masc" }

        if (config.pelerange == null) { config.pelerange = '{"grayscale": "100", "brightness": "100", "huerotate": "0", "saturate": "100", "blackwhite": false}' }
        if (config.crinarange1 == null) { config.crinarange1 = '{"grayscale": "0", "brightness": "100", "huerotate": "250", "saturate": "100", "blackwhite": false}' }
        if (config.caudarange1 == null) { config.caudarange1 = '{"grayscale": "0", "brightness": "100", "huerotate": "250", "saturate": "100", "blackwhite": false}' }
        if (config.crinarange2 == null) { config.crinarange2 = '{"grayscale": "30", "brightness": "100", "huerotate": "220", "saturate": "100", "blackwhite": false}' }
        if (config.caudarange2 == null) { config.caudarange2 = '{"grayscale": "30", "brightness": "100", "huerotate": "220", "saturate": "100", "blackwhite": false}' }
        if (config.crinarange3 == null) { config.crinarange3 = '{"grayscale": "50", "brightness": "100", "huerotate": "200", "saturate": "100", "blackwhite": false}' }
        if (config.caudarange3 == null) { config.caudarange3 = '{"grayscale": "50", "brightness": "100", "huerotate": "200", "saturate": "100", "blackwhite": false}' }
        if (config.olhorange1 == null) { config.olhorange1 = '{"grayscale": "100", "brightness": "500", "huerotate": "290", "saturate": "100", "blackwhite": true}' }
        if (config.olhorange2 == null) { config.olhorange2 = '{"grayscale": "0", "brightness": "100", "huerotate": "290", "saturate": "55", "blackwhite": false}' }

        if ((command.vamp == true) || (command.loadChar == true)) { vamp = config.vamp }
        if ((command.basenumber == true) || (command.loadChar == true)) { basenumber = config.basenumber }
        if ((command.focinhonumber == true) || (command.loadChar == true)) { focinhonumber = config.focinhonumber }
        if ((command.crinanumber == true) || (command.loadChar == true)) { crinanumber = config.crinanumber }
        if ((command.caudanumber == true) || (command.loadChar == true)) { caudanumber = config.caudanumber }
        if ((command.olhonumber == true) || (command.loadChar == true)) { olhonumber = config.olhonumber }
        if ((command.multicolorcrina == true) || (command.loadChar == true)) { multicolorcrina = config.multicolorcrina }
        if ((command.multicolorcauda == true) || (command.loadChar == true)) { multicolorcauda = config.multicolorcauda }

        if ((command.pelerange == true) || (command.loadChar == true)) { var pelerange = JSON.parse(config.pelerange) }
        if ((command.crinarange1 == true) || (command.loadChar == true)) { var crinarange1 = JSON.parse(config.crinarange1) }
        if ((command.caudarange1 == true) || (command.loadChar == true)) { var caudarange1 = JSON.parse(config.caudarange1) }
        if ((command.crinarange2 == true) || (command.loadChar == true)) { var crinarange2 = JSON.parse(config.crinarange2) }
        if ((command.caudarange2 == true) || (command.loadChar == true)) { var caudarange2 = JSON.parse(config.caudarange2) }
        if ((command.crinarange3 == true) || (command.loadChar == true)) { var crinarange3 = JSON.parse(config.crinarange3) }
        if ((command.caudarange3 == true) || (command.loadChar == true)) { var caudarange3 = JSON.parse(config.caudarange3) }
        if ((command.olhorange1 == true) || (command.loadChar == true)) { var olhorange1 = JSON.parse(config.olhorange1) }
        if ((command.olhorange2 == true) || (command.loadChar == true)) { var olhorange2 = JSON.parse(config.olhorange2) }

        if (command.autoConfig == true) {

            if (command.pelerange == true) { setcoloring("pelerange", "pelebranca", pelerange); }
            if (command.crinarange1 == true) { setcoloring("crinarange1", "crinabranca1", crinarange1); }
            if (command.caudarange1 == true) { setcoloring("caudarange1", "caudabranca1", caudarange1); }
            if (command.crinarange2 == true) { setcoloring("crinarange2", "crinabranca2", crinarange2); }
            if (command.caudarange2 == true) { setcoloring("caudarange2", "caudabranca2", caudarange2); }
            if (command.crinarange3 == true) { setcoloring("crinarange3", "crinabranca3", crinarange3); }
            if (command.caudarange3 == true) { setcoloring("caudarange3", "caudabranca3", caudarange3); }
            if (command.olhorange1 == true) { setcoloring("olhorange1", "olhobranca1", olhorange1); }
            if (command.olhorange2 == true) { setcoloring("olhorange2", "olhobranca2", olhorange2); }

            if (command.pelerange == true) { autocolorstart({ "type": "pelerange", "id": "pelerange" }); }
            if (command.crinarange1 == true) { autocolorstart({ "type": "crinarange1", "id": "crinarange1" }); }
            if (command.caudarange1 == true) { autocolorstart({ "type": "caudarange1", "id": "caudarange1" }); }
            if (command.crinarange2 == true) { autocolorstart({ "type": "crinarange2", "id": "crinarange2" }); }
            if (command.caudarange2 == true) { autocolorstart({ "type": "caudarange2", "id": "caudarange2" }); }
            if (command.crinarange3 == true) { autocolorstart({ "type": "crinarange3", "id": "crinarange3" }); }
            if (command.caudarange3 == true) { autocolorstart({ "type": "caudarange3", "id": "caudarange3" }); }
            if (command.olhorange1 == true) { autocolorstart({ "type": "olhorange1", "id": "olhorange11" }); }
            if (command.olhorange2 == true) { autocolorstart({ "type": "olhorange2", "id": "olhorange12" }); }

            if (command.ponyname == true) { $("#ponyname").val(config.ponyname); }
            if (command.ponyclass == true) { $("#ponyclass").val(config.ponyclass); }
            if (command.ponygem == true) { $("#ponygem").val(config.ponygem); }

            if (command.startVisual == true) {
                changeponyopen("visualbase", true);
                saveponypx();
            }

        }

        if (command.loadChar == true) {

            $("#ponystyle, #ponycrina, #ponycauda, #ponyclass, #ponycolor").prop("disabled", true).remove();

            if (vamp == false) { var vampyselect = "normal.png" } else if (vamp == true) { var vampyselect = "batpony.png" }

            if (config.crinasp == "true") { var crinaspsect = "f2" } else if (config.crinasp == "false") { var crinaspsect = "f1" }
            if (config.ponyclass == "pegs") {
                var classselect = "asa"
            } else if (config.ponyclass == "unic") {
                var classselect = "chifre"
            }

            $("head").append($("<style>", { id: "ponystyle" }).text(

                ".ocpbase{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/base.png) ;} .ocpboca{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/boca/" + vampyselect + ");} .ocporelha{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/orelha/" + vampyselect + ");}" +
                ".ocpfocinho{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/focinho/" + focinhonumber + ".png);}" +
                ".ocpolho1{background-image: url(../../images/oc-principal/base1/" + command.ponyface + "/olho/" + olhonumber + "/base.png);}" +
                ".ocpolho2{background-image: url(../../images/oc-principal/base1/" + command.ponyface + "/olho/" + olhonumber + "/olho-" + vampyselect + ");}" +
                ".ocpolho3{background-image: url(../../images/oc-principal/base1/" + command.ponyface + "/olho/" + olhonumber + "/reflexo.png);}"

            ))


            if (multicolorcrina == "true") {
                $("head").append($("<style>", { id: "ponycrina" }).text(
                    ".ocpcrina1{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/crina/" + crinanumber + "/part1.png);}" +
                    ".ocpcrina2{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/crina/" + crinanumber + "/part2.png);}" +
                    ".ocpcrina3{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/crina/" + crinanumber + "/lineart.png),url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/crina/" + crinanumber + "/part3.png);}"
                ))
            } else if (multicolorcrina == "false") {
                $("head").append($("<style>", { id: "ponycrina" }).text(
                    ".ocpcrina1{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/crina/" + crinanumber + ".png);}"
                ))
            }


            if (multicolorcauda == "true") {
                $("head").append($("<style>", { id: "ponycauda" }).text(
                    ".ocpcauda1{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/cauda/" + caudanumber + "/part1.png);}" +
                    ".ocpcauda2{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/cauda/" + caudanumber + "/part2.png);}" +
                    ".ocpcauda3{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/cauda/" + caudanumber + "/lineart.png),url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/cauda/" + caudanumber + "/part3.png);}"
                ))
            } else if (multicolorcauda == "false") {
                $("head").append($("<style>", { id: "ponycauda" }).text(
                    ".ocpcauda1{background-image: url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/cauda/" + caudanumber + ".png);}"
                ))
            }


            if (config.ponyclass == "pegs") {
                $("head").append($("<style>", { id: "ponyclass" }).text(
                    ".ocasa{background-image:url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/class/" + classselect + "-" + vampyselect + ");}"
                ))
            } else if (config.ponyclass == "unic") {
                $("head").append($("<style>", { id: "ponyclass" }).text(
                    ".occhifre{background-image:url(../../images/oc-principal/" + basenumber + "/" + command.ponyface + "/class/" + classselect + "-" + crinaspsect + ".png);}"
                ))
            }

            $("head").append($("<style>", { id: "ponycolor" }).text(
                ".baseglobalcolor{-webkit-filter:grayscale(" + pelerange.grayscale + "%) brightness(" + pelerange.brightness + "%) hue-rotate(" + pelerange.huerotate + "deg) saturate(" + pelerange.saturate + "%) !important;}" +
                ".ocpcrina1{-webkit-filter:grayscale(" + crinarange1.grayscale + "%) brightness(" + crinarange1.brightness + "%) hue-rotate(" + crinarange1.huerotate + "deg) saturate(" + crinarange1.saturate + "%) !important;}" +
                ".ocpcauda1{-webkit-filter:grayscale(" + caudarange1.grayscale + "%) brightness(" + caudarange1.brightness + "%) hue-rotate(" + caudarange1.huerotate + "deg) saturate(" + caudarange1.saturate + "%) !important;}" +
                ".ocpcrina2{-webkit-filter:grayscale(" + crinarange2.grayscale + "%) brightness(" + crinarange2.brightness + "%) hue-rotate(" + crinarange2.huerotate + "deg) saturate(" + crinarange2.saturate + "%) !important;}" +
                ".ocpcauda2{-webkit-filter:grayscale(" + caudarange2.grayscale + "%) brightness(" + caudarange2.brightness + "%) hue-rotate(" + caudarange2.huerotate + "deg) saturate(" + caudarange2.saturate + "%) !important;}" +
                ".ocpcrina3{-webkit-filter:grayscale(" + crinarange3.grayscale + "%) brightness(" + crinarange3.brightness + "%) hue-rotate(" + crinarange3.huerotate + "deg) saturate(" + crinarange3.saturate + "%) !important;}" +
                ".ocpcauda3{-webkit-filter:grayscale(" + caudarange3.grayscale + "%) brightness(" + caudarange3.brightness + "%) hue-rotate(" + caudarange3.huerotate + "deg) saturate(" + caudarange3.saturate + "%) !important;}" +
                ".ocpolho1{-webkit-filter:grayscale(" + olhorange1.grayscale + "%) brightness(" + olhorange1.brightness + "%) hue-rotate(" + olhorange1.huerotate + "deg) saturate(" + olhorange1.saturate + "%) !important;}" +
                ".ocpolho2{-webkit-filter:grayscale(" + olhorange2.grayscale + "%) brightness(" + olhorange2.brightness + "%) hue-rotate(" + olhorange2.huerotate + "deg) saturate(" + olhorange2.saturate + "%) !important;}"
            ))

        }

        if (command.finalResult == true) { finalresult(config, pelerange, crinarange1, caudarange1, crinarange2, caudarange2, crinarange3, caudarange3, olhorange1, olhorange2); }

    })
}







function saveponyeditor(data, finalresult) {

    var confirmsavepxsa = confirm(data.confirm);

    if (confirmsavepxsa == true) {
        if (($("#ponyname").val() == "") || ($("#ponyname").val() == "")) { alert(chrome.i18n.getMessage("ponynameempty")) } else {

            if (data.test == true) {

                if (data.vamp) { alert("vamp: " + vamp) }
                if (data.basenumber) { alert("basenumber: " + basenumber) }
                if (data.focinhonumber) { alert("focinhonumber: " + focinhonumber) }
                if (data.crinanumber) { alert("crinanumber: " + crinanumber) }
                if (data.caudanumber) { alert("caudanumber: " + caudanumber) }
                if (data.olhonumber) { alert("olhonumber: " + olhonumber) }
                if (data.multicolorcrina) { alert("multicolorcrina: " + multicolorcrina) }
                if (data.multicolorcauda) { alert("multicolorcauda: " + multicolorcauda) }


                if (data.pelerange) { alert('pelerange: {"grayscale": "' + $("#pelerange1").val() + '", "brightness": "' + $("#pelerange2").val() + '", "huerotate": "' + $("#pelerange3").val() + '", "saturate": "' + $("#pelerange4").val() + '", "blackwhite": ' + $("#pelebranca").prop("checked") + '}') }
                if (data.crinarange1) { alert('crinarange1: {"grayscale": "' + $("#crinarange11").val() + '", "brightness": "' + $("#crinarange12").val() + '", "huerotate": "' + $("#crinarange13").val() + '", "saturate": "' + $("#crinarange14").val() + '", "blackwhite": ' + $("#crinabranca1").prop("checked") + '}') }
                if (data.caudarange1) { alert('caudarange1: {"grayscale": "' + $("#caudarange11").val() + '", "brightness": "' + $("#caudarange12").val() + '", "huerotate": "' + $("#caudarange13").val() + '", "saturate": "' + $("#caudarange14").val() + '", "blackwhite": ' + $("#caudabranca1").prop("checked") + '}') }
                if (data.crinarange2) { alert('crinarange2: {"grayscale": "' + $("#crinarange21").val() + '", "brightness": "' + $("#crinarange22").val() + '", "huerotate": "' + $("#crinarange23").val() + '", "saturate": "' + $("#crinarange24").val() + '", "blackwhite": ' + $("#crinabranca2").prop("checked") + '}') }
                if (data.caudarange2) { alert('caudarange2: {"grayscale": "' + $("#caudarange21").val() + '", "brightness": "' + $("#caudarange22").val() + '", "huerotate": "' + $("#caudarange23").val() + '", "saturate": "' + $("#caudarange24").val() + '", "blackwhite": ' + $("#caudabranca2").prop("checked") + '}') }
                if (data.crinarange3) { alert('crinarange3: {"grayscale": "' + $("#crinarange31").val() + '", "brightness": "' + $("#crinarange32").val() + '", "huerotate": "' + $("#crinarange33").val() + '", "saturate": "' + $("#crinarange34").val() + '", "blackwhite": ' + $("#crinabranca3").prop("checked") + '}') }
                if (data.caudarange3) { alert('caudarange3: {"grayscale": "' + $("#caudarange31").val() + '", "brightness": "' + $("#caudarange32").val() + '", "huerotate": "' + $("#caudarange33").val() + '", "saturate": "' + $("#caudarange34").val() + '", "blackwhite": ' + $("#caudabranca3").prop("checked") + '}') }
                if (data.olhorange1) { alert('olhorange1: {"grayscale": "' + $("#olhorange11").val() + '", "brightness": "' + $("#olhorange12").val() + '", "huerotate": "' + $("#olhorange13").val() + '", "saturate": "' + $("#olhorange14").val() + '", "blackwhite": ' + $("#olhobranca1").prop("checked") + '}') }
                if (data.olhorange2) { alert('olhorange2: {"grayscale": "' + $("#olhorange21").val() + '", "brightness": "' + $("#olhorange22").val() + '", "huerotate": "' + $("#olhorange23").val() + '", "saturate": "' + $("#olhorange24").val() + '", "blackwhite": ' + $("#olhobranca2").prop("checked") + '}') }


                if (data.ponyname) { alert("ponyname: " + $("#ponyname").val()) }
                if (data.ponyclass) { alert("ponyclass: " + $("#ponyclass").val()) }
                if (data.ponygem) { alert("ponygem: " + $("#ponygem").val()) }
                if (data.crinasp) { alert("crinasp: " + crinasp) }

            } else {

                if (data.vamp) { chrome.storage.local.set({ vamp: vamp }) }
                if (data.basenumber) { chrome.storage.local.set({ basenumber: basenumber }) }
                if (data.focinhonumber) { chrome.storage.local.set({ focinhonumber: focinhonumber }) }
                if (data.crinanumber) { chrome.storage.local.set({ crinanumber: crinanumber }) }
                if (data.caudanumber) { chrome.storage.local.set({ caudanumber: caudanumber }) }
                if (data.olhonumber) { chrome.storage.local.set({ olhonumber: olhonumber }) }
                if (data.multicolorcrina) { chrome.storage.local.set({ multicolorcrina: multicolorcrina }) }
                if (data.multicolorcauda) { chrome.storage.local.set({ multicolorcauda: multicolorcauda }) }


                if (data.pelerange) { chrome.storage.local.set({ pelerange: '{"grayscale": "' + $("#pelerange1").val() + '", "brightness": "' + $("#pelerange2").val() + '", "huerotate": "' + $("#pelerange3").val() + '", "saturate": "' + $("#pelerange4").val() + '", "blackwhite": ' + $("#pelebranca").prop("checked") + '}' }) }
                if (data.crinarange1) { chrome.storage.local.set({ crinarange1: '{"grayscale": "' + $("#crinarange11").val() + '", "brightness": "' + $("#crinarange12").val() + '", "huerotate": "' + $("#crinarange13").val() + '", "saturate": "' + $("#crinarange14").val() + '", "blackwhite": ' + $("#crinabranca1").prop("checked") + '}' }) }
                if (data.caudarange1) { chrome.storage.local.set({ caudarange1: '{"grayscale": "' + $("#caudarange11").val() + '", "brightness": "' + $("#caudarange12").val() + '", "huerotate": "' + $("#caudarange13").val() + '", "saturate": "' + $("#caudarange14").val() + '", "blackwhite": ' + $("#caudabranca1").prop("checked") + '}' }) }
                if (data.crinarange2) { chrome.storage.local.set({ crinarange2: '{"grayscale": "' + $("#crinarange21").val() + '", "brightness": "' + $("#crinarange22").val() + '", "huerotate": "' + $("#crinarange23").val() + '", "saturate": "' + $("#crinarange24").val() + '", "blackwhite": ' + $("#crinabranca2").prop("checked") + '}' }) }
                if (data.caudarange2) { chrome.storage.local.set({ caudarange2: '{"grayscale": "' + $("#caudarange21").val() + '", "brightness": "' + $("#caudarange22").val() + '", "huerotate": "' + $("#caudarange23").val() + '", "saturate": "' + $("#caudarange24").val() + '", "blackwhite": ' + $("#caudabranca2").prop("checked") + '}' }) }
                if (data.crinarange3) { chrome.storage.local.set({ crinarange3: '{"grayscale": "' + $("#crinarange31").val() + '", "brightness": "' + $("#crinarange32").val() + '", "huerotate": "' + $("#crinarange33").val() + '", "saturate": "' + $("#crinarange34").val() + '", "blackwhite": ' + $("#crinabranca3").prop("checked") + '}' }) }
                if (data.caudarange3) { chrome.storage.local.set({ caudarange3: '{"grayscale": "' + $("#caudarange31").val() + '", "brightness": "' + $("#caudarange32").val() + '", "huerotate": "' + $("#caudarange33").val() + '", "saturate": "' + $("#caudarange34").val() + '", "blackwhite": ' + $("#caudabranca3").prop("checked") + '}' }) }
                if (data.olhorange1) { chrome.storage.local.set({ olhorange1: '{"grayscale": "' + $("#olhorange11").val() + '", "brightness": "' + $("#olhorange12").val() + '", "huerotate": "' + $("#olhorange13").val() + '", "saturate": "' + $("#olhorange14").val() + '", "blackwhite": ' + $("#olhobranca1").prop("checked") + '}' }) }
                if (data.olhorange2) { chrome.storage.local.set({ olhorange2: '{"grayscale": "' + $("#olhorange21").val() + '", "brightness": "' + $("#olhorange22").val() + '", "huerotate": "' + $("#olhorange23").val() + '", "saturate": "' + $("#olhorange24").val() + '", "blackwhite": ' + $("#olhobranca2").prop("checked") + '}' }) }


                if (data.ponyname) { chrome.storage.local.set({ ponyname: $("#ponyname").val() }) }
                if (data.ponyclass) { chrome.storage.local.set({ ponyclass: $("#ponyclass").val() }) }
                if (data.ponygem) { chrome.storage.local.set({ ponygem: $("#ponygem").val() }) }
                if (data.crinasp) { chrome.storage.local.set({ crinasp: crinasp }) }


                if (data.register) { chrome.storage.local.set({ registred: true }) }

                chrome.storage.local.get(function(config) {
                    if ((config.weaponset == null) || (config.weaponset == undefined)) {
                        chrome.storage.local.set({ weaponset: "none" })
                    };
                    if ((config.customroupa == null) || (config.customroupa == undefined)) {
                        chrome.storage.local.set({ customroupa: "none" })
                    };
                    if ((config.customrosto == null) || (config.customrosto == undefined)) {
                        chrome.storage.local.set({ customrosto: "none" })
                    };
                    if ((config.customcabeca == null) || (config.customcabeca == undefined)) {
                        chrome.storage.local.set({ customcabeca: "none" })
                    };
                    if ((config.customacessorio == null) || (config.customacessorio == undefined)) {
                        chrome.storage.local.set({ customacessorio: "none" })
                    };
                    if ((config.customcauda == null) || (config.customcauda == undefined)) {
                        chrome.storage.local.set({ customcauda: "none" })
                    };
                    if ((config.customcascofr == null) || (config.customcascofr == undefined)) {
                        chrome.storage.local.set({ customcascofr: "none" })
                    };
                    if ((config.customcascoat == null) || (config.customcascoat == undefined)) {
                        chrome.storage.local.set({ customcascoat: "none" })
                    };
                    if ((config.money == null) || (config.money == undefined)) {
                        chrome.storage.local.set({ money: 100 })
                    };
                    if ((config.bank == null) || (config.bank == undefined)) {
                        chrome.storage.local.set({ bank: 0 })
                    };
                });

            }

            if (data.finalresult == true) { finalresult(); }

        }

    }

}