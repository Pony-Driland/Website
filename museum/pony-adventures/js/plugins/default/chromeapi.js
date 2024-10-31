// Game System





// Object Editor

function objectgen(data, finalresult) {
    chrome.storage.local.get(function(config) {

        if (config[data.objectList] == null) { config[data.objectList] = '"none": 0' }

        if ((data.objectList == "quest") || (data.objectList == "foodlist") || (data.objectList == "costumelist") || (data.objectList == "equiplist") || (data.objectList == "weaponlist") || (data.objectList == "furniturelist") || (data.objectList == "keylist")) {

            var objecteditorlist = JSON.parse("{" + config[data.objectList] + "}")

            if (data.type == "editor") {

                if (data.old == "auto") {
                    var questreplace1 = new RegExp(',"' + data.object + '": ' + objecteditorlist[data.object] + '', "g")
                    var questreplace2 = new RegExp('"' + data.object + '": ' + objecteditorlist[data.object] + ',', "g")
                } else {
                    var questreplace1 = new RegExp(',"' + data.object + '": ' + data.old + '', "g")
                    var questreplace2 = new RegExp('"' + data.object + '": ' + data.old + ',', "g")
                }

                if (objecteditorlist[data.object] == null) { objecteditorlist[data.object] = 0 }

                if (data.valueType == "add") { var addvalueobject = objecteditorlist[data.object] + data.value } else if (data.valueType == "remove") { var addvalueobject = objecteditorlist[data.object] - data.value } else if (data.valueType == "multiplication") { var addvalueobject = objecteditorlist[data.object] * data.value } else if (data.valueType == "division") { var addvalueobject = objecteditorlist[data.object] / data.value } else if (data.valueType == "modulus") { var addvalueobject = objecteditorlist[data.object] % data.value } else if (data.valueType == "multiplicationX") { var addvalueobject = data.value * objecteditorlist[data.object] } else if (data.valueType == "divisionX") { var addvalueobject = data.value / objecteditorlist[data.object] } else if (data.valueType == "modulusX") { var addvalueobject = data.value % objecteditorlist[data.object] } else { var addvalueobject = data.value }

                if (data.valueAjust == true) { if (addvalueobject < 0) { var addvalueobject = 0 } }

                if (config[data.objectList] == "none") {} else if (data.editor == "add") {
                    var questvirg = config[data.objectList].split(data.object)
                    if (questvirg.length > 1) { var questresulteditor = config[data.objectList] } else { var questresulteditor = config[data.objectList] + ',"' + data.object + '": ' + addvalueobject + '' }
                } else if (data.editor == "edit") {
                    var questresulteditor = config[data.objectList]
                        .replace(questreplace2, '"' + data.object + '": ' + addvalueobject + ',')
                        .replace(questreplace1, ',"' + data.object + '": ' + addvalueobject + '')
                } else if (data.editor == "remove") {
                    var questresulteditor = config[data.objectList]
                        .replace(questreplace2, "")
                        .replace(questreplace1, "")
                }

                if (data.test == true) { alert(questresulteditor); } else if (data.objectList == "quest") { chrome.storage.local.set({ quest: questresulteditor }); } else if (data.objectList == "foodlist") { chrome.storage.local.set({ foodlist: questresulteditor }); } else if (data.objectList == "costumelist") { chrome.storage.local.set({ costumelist: questresulteditor }); } else if (data.objectList == "equiplist") { chrome.storage.local.set({ equiplist: questresulteditor }); } else if (data.objectList == "weaponlist") { chrome.storage.local.set({ weaponlist: questresulteditor }); } else if (data.objectList == "furniturelist") { chrome.storage.local.set({ furniturelist: questresulteditor }); } else if (data.objectList == "keylist") { chrome.storage.local.set({ keylist: questresulteditor }); }

                var questresultjson = JSON.parse("{" + questresulteditor + "}");
                if (data.finalresulten == true) {
                    finalresult(questresultjson, config);
                }

            } else if (data.type == "load") {
                finalresult(objecteditorlist, config);
            }

        }
    })
}









// Update Status

function updatecharstatus(data) {
    chrome.storage.local.get(function(config) {

        if ((data.fome == true) || (data.all == true)) { if (config.nmfome == null) { config.nmfome = 100 } }
        if ((data.sede == true) || (data.all == true)) { if (config.nmsede == null) { config.nmsede = 100 } }
        if ((data.energia == true) || (data.all == true)) { if (config.nmenergia == null) { config.nmenergia = 100 } }
        if ((data.higiene == true) || (data.all == true)) { if (config.nmhigiene == null) { config.nmhigiene = 100 } }

        if ((data.status == true) || (data.all == true)) {
            if (config.nmsdgood == null) { config.nmsdgood = 100 }
            if (config.nmsdbad == null) { config.nmsdbad = 0 }
        }

        if ((data.fome == true) || (data.all == true)) { $("#nmfome").text(config.nmfome + "%"); }
        if ((data.sede == true) || (data.all == true)) { $("#nmsede").text(config.nmsede + "%"); }
        if ((data.energia == true) || (data.all == true)) { $("#nmenergia").text(config.nmenergia + "%"); }
        if ((data.higiene == true) || (data.all == true)) { $("#nmhigiene").text(config.nmhigiene + "%"); }

        if ((data.status == true) || (data.all == true)) {
            $("#nmsdgood").css({ "width": config.nmsdgood + "%" });
            $("#nmsdbad").css({ "width": config.nmsdbad + "%" });
        }

        if ((data.money == true) || (data.all == true)) { $("#moneycount").text(config.money); }
        if ((data.bank == true) || (data.all == true)) { $("#bankcount").text(config.bank); }

    })
}








// Achievement Generator

function actvgen(data, finalresult) {
    chrome.storage.local.get(function(config) {

        function createacht() {
            chrome.notifications.create("achievement", {
                type: "basic",
                iconUrl: chrome.extension.getURL("images/achievement/" + data.image),
                title: data.title,
                message: data.message,
                contextMessage: chrome.i18n.getMessage("appName") + " - " + chrome.i18n.getMessage("achievement") + " " + chrome.i18n.getMessage("unlocked")
            })
        }

        if (config.achievement == null) { config.achievement = '"none": false' }

        var objecteditorlist = JSON.parse("{" + config.achievement + "}")

        if (data.view != true) {

            var questreplace1 = new RegExp(',"' + data.id + '": ' + objecteditorlist[data.id] + '', "g")
            var questreplace2 = new RegExp('"' + data.id + '": ' + objecteditorlist[data.id] + ',', "g")

            if (objecteditorlist[data.id] == null) { objecteditorlist[data.id] = false }
            var addvalueobject = data.value

            if (config.achievement == "none") {} else if (data.editor == "add") {
                var questvirg = config.achievement.split(data.id)
                if (questvirg.length > 1) { var questresulteditor = config.achievement } else { var questresulteditor = config.achievement + ',"' + data.id + '": ' + addvalueobject + '' }
                createacht();
            } else if (data.editor == "edit") {
                var questresulteditor = config.achievement
                    .replace(questreplace2, '"' + data.id + '": ' + addvalueobject + ',')
                    .replace(questreplace1, ',"' + data.id + '": ' + addvalueobject + '')
                if (data.notification == true) { createacht(); }
            } else if (data.editor == "remove") {
                var questresulteditor = config.achievement
                    .replace(questreplace2, "")
                    .replace(questreplace1, "")
                if (data.notification == true) { createacht(); }
            }

            if (data.test == true) { alert(questresulteditor); } else { chrome.storage.local.set({ achievement: questresulteditor }); }

            if (data.finalresult == true) {
                var objecteditorlist2 = JSON.parse("{" + questresulteditor + "}")
                finalresult(objecteditorlist2, config);
            }

        } else {
            finalresult(objecteditorlist, config);
        }

    })
}















// Exportar Relógio

function getdateexport(data, finalresult) {
    if (data.auto == false) { var clocksystem = data.clock } else { var clocksystem = new Date(); }
    clocksystem.setSeconds(0);

    if (data.edit == true) {

        if (data.date == null) { data.date = 0 }
        if (data.month == null) { data.month = 0 }
        if (data.year == null) { data.year = 0 }
        if (data.hour == null) { data.hour = 0 }
        if (data.minute == null) { data.minute = 0 }

        if (data.mode == "normal") {
            clocksystem.setDate(data.date);
            clocksystem.setMonth(data.month);
            clocksystem.setFullYear(data.year);
            clocksystem.setHours(data.hour);
            clocksystem.setMinutes(data.minute);
        } else if (data.mode == "add") {
            clocksystem.setDate(clocksystem.getDate() + data.date);
            clocksystem.setMonth(clocksystem.getMonth() + data.month);
            clocksystem.setFullYear(clocksystem.getFullYear() + data.year);
            clocksystem.setHours(clocksystem.getHours() + data.hour);
            clocksystem.setMinutes(clocksystem.getMinutes() + data.minute);
        } else if (data.mode == "remove") {
            clocksystem.setDate(clocksystem.getDate() - data.date);
            clocksystem.setMonth(clocksystem.getMonth() - data.month);
            clocksystem.setFullYear(clocksystem.getFullYear() - data.year);
            clocksystem.setHours(clocksystem.getHours() - data.hour);
            clocksystem.setMinutes(clocksystem.getMinutes() - data.minute);
        } else if (data.mode == "multiplication") {
            clocksystem.setDate(clocksystem.getDate() * data.date);
            clocksystem.setMonth(clocksystem.getMonth() * data.month);
            clocksystem.setFullYear(clocksystem.getFullYear() * data.year);
            clocksystem.setHours(clocksystem.getHours() * data.hour);
            clocksystem.setMinutes(clocksystem.getMinutes() * data.minute);
        } else if (data.mode == "division") {
            clocksystem.setDate(clocksystem.getDate() / data.date);
            clocksystem.setMonth(clocksystem.getMonth() / data.month);
            clocksystem.setFullYear(clocksystem.getFullYear() / data.year);
            clocksystem.setHours(clocksystem.getHours() / data.hour);
            clocksystem.setMinutes(clocksystem.getMinutes() / data.minute);
        } else if (data.mode == "modulus") {
            clocksystem.setDate(clocksystem.getDate() % data.date);
            clocksystem.setMonth(clocksystem.getMonth() % data.month);
            clocksystem.setFullYear(clocksystem.getFullYear() % data.year);
            clocksystem.setHours(clocksystem.getHours() % data.hour);
            clocksystem.setMinutes(clocksystem.getMinutes() % data.minute);
        }
    }

    function addZero(i) { if (i < 10) { i = "0" + i; }; return i; }

    var monthstx = new Array();
    monthstx[0] = "January";
    monthstx[1] = "February";
    monthstx[2] = "March";
    monthstx[3] = "April";
    monthstx[4] = "May";
    monthstx[5] = "June";
    monthstx[6] = "July";
    monthstx[7] = "August";
    monthstx[8] = "September";
    monthstx[9] = "October";
    monthstx[10] = "November";
    monthstx[11] = "December";

    if (data.format == "var") {
        finalresult(clocksystem.getFullYear(), clocksystem.getMonth(), clocksystem.getDate(), clocksystem.getHours(), clocksystem.getMinutes(), clocksystem.getSeconds(), 0);
    } else if (data.format == "UTC") {

        var utcclocksystem = Date.UTC(clocksystem.getFullYear(), clocksystem.getMonth(), clocksystem.getDate(), clocksystem.getHours(), clocksystem.getMinutes(), clocksystem.getSeconds(), 0)

        finalresult(utcclocksystem);

    } else {
        var setdatestmt = monthstx[clocksystem.getMonth()];

        var clockseting = setdatestmt +
            " " + clocksystem.getDate() +
            ", " + clocksystem.getFullYear() +
            " " + addZero(clocksystem.getHours()) +
            ":" + addZero(clocksystem.getMinutes()) +
            ":" + addZero(clocksystem.getSeconds())

        if (data.test == true) { alert(clockseting); } else if (data.variable == true) { newoldclock = clockseting } else { finalresult(clockseting); }
    }

}






// Obter AFK hour

function afkgethour(data, finalresult) {
    chrome.storage.local.get(function(config) {

        if (data.new == "auto") { var stmydatenew = new Date(); } else { var stmydatenew = data.new }

        if (data.old == "auto") { var stmydateold = new Date(config.clock) } else { var stmydateold = data.old }

        getdateexport({
            "auto": false,
            "clock": stmydatenew,
            "format": "UTC",
        }, function(utcvalue1) {
            getdateexport({
                "auto": false,
                "clock": stmydateold,
                "format": "UTC",
            }, function(utcvalue2) {
                var hourgeneratorclockst = utcvalue1 - utcvalue2;
                var hourgeneratorclockst = hourgeneratorclockst / 1000;
                var hourgeneratorclockst = hourgeneratorclockst / 60;
                var hourgeneratorclockst = hourgeneratorclockst / 60;
                var horgnstring = hourgeneratorclockst.toString()
                if (horgnstring.indexOf(".") > -1) { var horgnstring = horgnstring.substring(0, horgnstring.lastIndexOf(".")) }
                var hourgeneratorclockst = Number(horgnstring)

                if (data.test == true) { alert(hourgeneratorclockst); } else if (data.variable == true) { afksthour = hourgeneratorclockst } else { finalresult(hourgeneratorclockst); }

            })
        })

    })
}






// Atualizar Status

function updatestatus(pagetype) {
    chrome.storage.local.get(function(config) {

        if (pagetype == "money") {
            chromebackground({ "text": "moneyupdatest1", "response": "moneyupdatest2", "type": "send" }, function() {})
        } else {

            if ((config.nmsdgood < 1) || (config.nmsdbad > 99)) {
                getdateexport({
                    "auto": true,
                    "format": false,
                    "variable": false,
                    "edit": true,
                    "mode": "add",
                    "minute": 30
                }, function(hospitaltimeclock) {
                    chrome.storage.local.set({ hospital: true, hospitaltime: hospitaltimeclock }, function() {
                        if (pagetype == true) { window.close(); }
                    })
                })
            } else {
                chrome.storage.local.set({ hospital: false }, function() {
                    if (pagetype == true) { updatecharstatus({ "all": true }); }
                })
            }
            chromebackground({ "text": "updatestatus1", "response": "updatestatus2", "type": "send" }, function() {})

        }

    })
}






// Money Generator

function moneygen(data, finalresult) {
    chrome.storage.local.get(function(config) {

        if (config.money == null) { config.money = 0 }
        if (config.bank == null) { config.bank = 0 }

        if (data.bank == true) { var moneytype = "bank" } else { var moneytype = "money" }

        if (data.valueType == "add") { var addvalueobject = config[moneytype] + data.value } else if (data.valueType == "remove") { var addvalueobject = config[moneytype] - data.value } else if (data.valueType == "multiplication") { var addvalueobject = config[moneytype] * data.value } else if (data.valueType == "division") { var addvalueobject = config[moneytype] / data.value } else if (data.valueType == "modulus") { var addvalueobject = config[moneytype] % data.value } else if (data.valueType == "multiplicationX") { var addvalueobject = data.value * config[moneytype] } else if (data.valueType == "divisionX") { var addvalueobject = data.value / config[moneytype] } else if (data.valueType == "modulusX") { var addvalueobject = data.value % config[moneytype] } else { var addvalueobject = data.value }

        if (addvalueobject < 0) { var addvalueobject = 0 }

        if (data.test == true) { alert(addvalueobject) } else if (data.bank == true) {
            chrome.storage.local.set({ bank: addvalueobject }, function() {
                if (data.finalresulten == true) { finalresult(addvalueobject); }
                if (data.backgroundmode == true) { updatestatus("money"); } else { updatecharstatus({ "bank": true }); }
                chromebackground({ "text": "moneyupdatest1", "response": "moneyupdatest2", "type": "send" }, function() {})
            })
        } else {
            chrome.storage.local.set({ money: addvalueobject }, function() {
                if (data.finalresulten == true) { finalresult(addvalueobject); }
                if (data.backgroundmode == true) { updatestatus("money"); } else { updatecharstatus({ "money": true }); }
                chromebackground({ "text": "moneyupdatest1", "response": "moneyupdatest2", "type": "send" }, function() {})
            })
        }

    })
}










// Status Generator

var setfomeauto = 8
var setsedeauto = 2
var setenergiaauto = 6
var sethigieneauto = 12
var sethpauto = 0

function statusgenerator(dataset, datemanual) {
    chrome.storage.local.get(function(config) {

        function statusremvx(data) {

            if ((data.type == "nmfome") || (data.type == "nmsede") || (data.type == "nmenergia") || (data.type == "nmhigiene") || (data.type == "nmsdgood") || (data.type == "nmsdbad")) {
                if (config[data.type] == null) { config[data.type] = 100 }

                if (data.valueType == "add") { var addvalueobject = config[data.type] + data.value } else if (data.valueType == "remove") { var addvalueobject = config[data.type] - data.value } else if (data.valueType == "multiplication") { var addvalueobject = config[data.type] * data.value } else if (data.valueType == "division") { var addvalueobject = config[data.type] / data.value } else if (data.valueType == "modulus") { var addvalueobject = config[data.type] % data.value } else if (data.valueType == "multiplicationX") { var addvalueobject = data.value * config[data.type] } else if (data.valueType == "divisionX") { var addvalueobject = data.value / config[data.type] } else if (data.valueType == "modulusX") { var addvalueobject = data.value % config[data.type] } else { var addvalueobject = data.value }

                if (addvalueobject < 0) { var addvalueobject = 0 } else if (addvalueobject > 100) { var addvalueobject = 100 }

                if (data.type == "nmsdbad") {
                    config.nmsdbad = addvalueobject
                    var antigoodpxs = 100 - config.nmsdbad
                    if (config.nmsdgood > antigoodpxs) {
                        chrome.storage.local.set({ nmsdgood: antigoodpxs })
                        config.nmsdgood = antigoodpxs
                    }
                } else if (data.type == "nmsdgood") {
                    var antigoodpxs = 100 - config.nmsdbad
                    if (config.nmsdgood > antigoodpxs) {
                        var addvalueobject = antigoodpxs
                        config.nmsdgood = antigoodpxs
                    }
                }

                if (data.test == true) { alert(addvalueobject) } else if (data.type == "nmfome") { chrome.storage.local.set({ nmfome: addvalueobject }) } else if (data.type == "nmsede") { chrome.storage.local.set({ nmsede: addvalueobject }) } else if (data.type == "nmenergia") { chrome.storage.local.set({ nmenergia: addvalueobject }) } else if (data.type == "nmhigiene") { chrome.storage.local.set({ nmhigiene: addvalueobject }) } else if (data.type == "nmsdgood") { chrome.storage.local.set({ nmsdgood: addvalueobject }) } else if (data.type == "nmsdbad") { chrome.storage.local.set({ nmsdbad: addvalueobject }) }

                if (data.update == true) { updatestatus(data.pagetype); }
            }

        }

        function checkproblemstatus(datacheck) {
            var removesaudegood = 0
            if (config.nmfome == 0) { var removesaudegood = 4 + removesaudegood }
            if (config.nmsede == 0) { var removesaudegood = 4 + removesaudegood }
            if (datacheck.special == true) { updatestatus(datacheck.pagetype) } else {
                if (datacheck.cancelupdate == true) { var checkupdatestxs = false } else { var checkupdatestxs = true }
                statusremvx({ "type": "nmsdgood", "valueType": "remove", "value": removesaudegood, "update": checkupdatestxs, "pagetype": datacheck.pagetype, "test": false });
            }
        }

        if (dataset == "autoremove") {
            statusremvx({ "type": "nmfome", "valueType": "remove", "value": setfomeauto, "update": false, "test": false });
            statusremvx({ "type": "nmsede", "valueType": "remove", "value": setsedeauto, "update": false, "test": false });
            statusremvx({ "type": "nmenergia", "valueType": "remove", "value": setenergiaauto, "update": false, "test": false });
            statusremvx({ "type": "nmhigiene", "valueType": "remove", "value": sethigieneauto, "update": false, "test": false });

            checkproblemstatus({ "cancelupdate": false, "pagetype": false });
        } else if (dataset == "custom") {
            statusremvx({ "type": datemanual.type, "valueType": datemanual.valueType, "value": datemanual.value, "update": datemanual.update, "test": datemanual.test, "pagetype": datemanual.pagetype });
            if (datemanual.checkproblem == true) { checkproblemstatus({ "cancelupdate": datemanual.cancelupdateproblem, "pagetype": datemanual.pagetype }); }
        } else if (dataset == "heal") {
            statusremvx({ "type": "nmfome", "valueType": "edit", "value": 100, "update": false, "test": false });
            statusremvx({ "type": "nmsede", "valueType": "edit", "value": 100, "update": false, "test": false });
            statusremvx({ "type": "nmenergia", "valueType": "edit", "value": 100, "update": false, "test": false });
            statusremvx({ "type": "nmhigiene", "valueType": "edit", "value": 100, "update": false, "test": false });
            statusremvx({ "type": "nmsdbad", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmsdgood", "valueType": "edit", "value": 100, "update": false, "test": false });
            if (datemanual.checkproblem == true) { checkproblemstatus({ "cancelupdate": datemanual.cancelupdateproblem, "pagetype": datemanual.pagetype, "special": true }); }
        } else if (dataset == "kill") {
            statusremvx({ "type": "nmfome", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmsede", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmenergia", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmhigiene", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmsdbad", "valueType": "edit", "value": 0, "update": false, "test": false });
            statusremvx({ "type": "nmsdgood", "valueType": "edit", "value": 0, "update": false, "test": false });
            if (datemanual.checkproblem == true) { checkproblemstatus({ "cancelupdate": datemanual.cancelupdateproblem, "pagetype": datemanual.pagetype, "special": true }); }
        }


    })
}


// Ambiente Tóxico

function ambientetoxic(data) {
    chrome.storage.local.get(function(config) {

        var segundotoxic = 1000 * data.time
        var toxicenablex = data.enable

        var vltype = data.valueType
        var valueset = data.value

        function sendtoxic() {
            if (toxicenablex == true) {

                statusgenerator("custom", {
                    "type": "nmsdbad",
                    "valueType": vltype,
                    "value": valueset,
                    "update": true,
                    "test": false
                })

            }
        }

        if (data.add == true) {
            setInterval(function() { sendtoxic(); }, segundotoxic);
            sendtoxic();
        }
    })
}