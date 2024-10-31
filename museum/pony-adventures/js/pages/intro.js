// Start



chrome.storage.local.get(function(config) {
    if (config.registred == true) {
        $("#introgeral").css({ 'display': 'none' })
        $("#customstart").css({ 'display': 'block' })
            //document.location.href = "index.html"
            //return
    }
})

// Part 1

dialogo1({
    "next": "#introgo",
    "id": "#introtexto",
    "text": chrome.i18n.getMessage("dialgwelcome1"),
    "changeNext": true,
    "newNext": chrome.i18n.getMessage("dialgclickwelcome1")
}, function() {

    // Part 2

    dialogo1({
        "next": "#introgo",
        "id": "#introtexto",
        "text": chrome.i18n.getMessage("dialgwelcome2"),
        "changeNext": true,
        "newNext": chrome.i18n.getMessage("dialgclickwelcome2")
    }, function() {

        // Part 3

        dialogo1({
            "next": "#introgo",
            "id": "#introtexto",
            "text": chrome.i18n.getMessage("dialgwelcome3"),
            "changeNext": true,
            "newNext": chrome.i18n.getMessage("dialgclickwelcome3")
        }, function() {

            // Part 4

            dialogo1({
                "next": "#introgo",
                "id": "#introtexto",
                "text": chrome.i18n.getMessage("dialgwelcome4"),
                "changeNext": true,
                "newNext": chrome.i18n.getMessage("dialgclickwelcome4")
            }, function() {

                $("#introgeral").css({ 'display': 'none' })
                $("#customstart").fadeIn()
                $('html,body').animate({
                        scrollTop: $("#customstart").offset().top
                    },
                    'slow');

            })

        })

    })

})























// Sistema Troca Pony

function changeponyopen(idclick, auto) {

    // Base

    if (idclick == "visualbase") {

        changeclickset({ "select": basenumber, "max": "2", "type": "base", "auto": auto }, [

            {
                "opimage": "url(../../images/oc-principal/base1/principal/orelha/normal.png), url(../../images/oc-principal/base1/principal/base.png)",
                "value": "base1",
                "text": chrome.i18n.getMessage("defaultName")
            },

            {
                "opimage": "url(../../images/oc-principal/base1/principal/orelha/batpony.png), url(../../images/oc-principal/base1/principal/base.png)",
                "applyImage1": "url(../../images/oc-principal/base1/principal/base.png)",
                "value": "set2",
                "text": chrome.i18n.getMessage("defaultName")
            }

        ])

    }

    // Focinho

    if (idclick == "visualfocinho") {

        changeclickset({ "select": focinhonumber, "max": "1", "type": "focinho", "auto": auto }, [

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/boca/normal.png), url(../../images/oc-principal/" + basenumber + "/principal/focinho/f1.png)",
                "value": "f1",
                "text": chrome.i18n.getMessage("defaultName")
            }

        ])

    }

    // Crina

    if (idclick == "visualcrina") {

        changeclickset({ "select": crinanumber, "max": "5", "type": "crina", "auto": auto }, [

            { "separe": true, "text": chrome.i18n.getMessage("separeponyeditorcolor") },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/crina/f1.png)",
                "value": "f1",
                "text": chrome.i18n.getMessage("rainbowstyle"),
                "multicolor": false,
                "shadow": false,
                "crinasp": true
            },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/crina/f2.png)",
                "value": "f2",
                "text": chrome.i18n.getMessage("twilightstyle"),
                "multicolor": false,
                "shadow": false,
                "crinasp": true
            },

            { "separe": true, "text": chrome.i18n.getMessage("separeponyeditormulticolor") },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/crina/f1.png)",
                "value": "f1multi",
                "text": chrome.i18n.getMessage("rainbowstyle"),
                "multicolor": true,
                "shadow": false,
                "crinasp": true
            }

        ])

    }

    // Cauda

    if (idclick == "visualcauda") {

        changeclickset({ "select": caudanumber, "max": "5", "type": "cauda", "auto": auto }, [

            { "separe": true, "text": chrome.i18n.getMessage("separeponyeditorcolor") },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/cauda/f1.png)",
                "value": "f1",
                "text": chrome.i18n.getMessage("rainbowstyle"),
                "multicolor": false
            },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/cauda/f2.png)",
                "value": "f2",
                "text": chrome.i18n.getMessage("twilightstyle"),
                "multicolor": false
            },

            { "separe": true, "text": chrome.i18n.getMessage("separeponyeditormulticolor") },

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/cauda/f1.png)",
                "value": "f1multi",
                "text": chrome.i18n.getMessage("rainbowstyle"),
                "multicolor": true,
                "crinasp": true
            }

        ])

    }

    // Olho

    if (idclick == "visualolho") {

        changeclickset({ "select": olhonumber, "max": "1", "type": "olho", "auto": auto }, [

            {
                "opimage": "url(../../images/oc-principal/" + basenumber + "/principal/olho/f1/reflexo.png), url(../../images/oc-principal/" + basenumber + "/principal/olho/f1/olho-normal.png), url(../../images/oc-principal/" + basenumber + "/principal/olho/f1/base.png)",
                "value": "f1",
                "text": chrome.i18n.getMessage("defaultName")
            }

        ])

    }

}








// Editor

//Cor de Pele
$("[name='pelerange']").change(function() { changecolor({ "data": "pelerange", "this": this }); })
    //Cor de Crina 1
$("[name='crinarange1']").change(function() { changecolor({ "data": "crinarange1", "this": this }); })
    //Cor de Cauda 1
$("[name='caudarange1']").change(function() { changecolor({ "data": "caudarange1", "this": this }); })
    //Cor de Crina 2
$("[name='crinarange2']").change(function() { changecolor({ "data": "crinarange2", "this": this }); })
    //Cor de Cauda 2
$("[name='caudarange2']").change(function() { changecolor({ "data": "caudarange2", "this": this }); })
    //Cor de Crina 3
$("[name='crinarange3']").change(function() { changecolor({ "data": "crinarange3", "this": this }); })
    //Cor de Cauda 3
$("[name='caudarange3']").change(function() { changecolor({ "data": "caudarange3", "this": this }); })
    //Cor do Olho 1
$("[name='olhorange1']").change(function() { changecolor({ "data": "olhorange1", "this": this }); })
    //Cor do Olho 2
$("[name='olhorange2']").change(function() { changecolor({ "data": "olhorange2", "this": this }); })



// Trocar Classe

$("#ponyclass").change(function() { changeclass(this); })



// Fechar Pony

$("#closepony").click(function() { closeponypx(); })

// Save Pony

$("#savepony").click(function() { saveponypx(true); })





// Sistema Troca

// Base
$("#visualbase").click(function() { changeponyopen("visualbase"); })
    // Focinho
$("#visualfocinho").click(function() { changeponyopen("visualfocinho"); })
    // Crina
$("#visualcrina").click(function() { changeponyopen("visualcrina"); })
    // Cauda
$("#visualcauda").click(function() { changeponyopen("visualcauda"); })
    // Olho
$("#visualolho").click(function() { changeponyopen("visualolho"); })





$("#confirmpony").click(function() {
    saveponyeditor({
        "vamp": true,
        "basenumber": true,
        "focinhonumber": true,
        "crinanumber": true,
        "caudanumber": true,
        "olhonumber": true,
        "multicolorcrina": true,
        "multicolorcauda": true,

        "pelerange": true,
        "crinarange1": true,
        "caudarange1": true,
        "crinarange2": true,
        "caudarange2": true,
        "crinarange3": true,
        "caudarange3": true,
        "olhorange1": true,
        "olhorange2": true,

        "ponyname": true,
        "ponyclass": true,
        "ponygem": true,
        "crinasp": true,

        "register": true,
        "finalresult": true,
        "confirm": chrome.i18n.getMessage("confirmponyeditor")
    }, function() {
        document.location.href = "index.html"
    })
})







// Start Auto

//resetextension();

getponycolor({
    "autoConfig": true,
    "startVisual": true,
    "olhorange2": true,
    "olhorange1": true,
    "crinarange1": true,
    "caudarange1": true,
    "crinarange2": true,
    "caudarange2": true,
    "crinarange3": true,
    "caudarange3": true,
    "pelerange": true,
    "ponyname": true,
    "ponyclass": true,
    "ponygem": true,

    "vamp": true,
    "basenumber": true,
    "focinhonumber": true,
    "crinanumber": true,
    "caudanumber": true,
    "olhonumber": true,
    "multicolorcrina": true,
    "multicolorcauda": true
});