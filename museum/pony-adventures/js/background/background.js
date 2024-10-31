// Rel�gio

// Gerar Hora
var clocktime = new Date();

// Fun��o
function startclock() {

    // Sistema
    function updateclockst(autostart) {

        // Setar Hora Save
        function setconfigclock() {
            if (clocktime.getSeconds() > 0) { clocktime.setSeconds(0) }
            getdateexport({
                "auto": false,
                "clock": clocktime,
                "variable": false
            }, function(clockseting) { chrome.storage.local.set({ clock: clockseting }); })
        };

        // Hor�rio Novo
        clocktime = new Date();

        // Status Update
        if ((clocktime.getMinutes() == 0) && (clocktime.getSeconds() == 0)) { statusgenerator("autoremove"); }









        // Detector Hor�rio
        if ((clocktime.getSeconds() == 0) || (autostart == true)) {
            chrome.storage.local.get(function(config) {
                var clocktimeold = new Date(config.clock)

                // Detectar Fraude
                if (clocktime < clocktimeold) {

                    var penaoldhour = clocktimeold.getHours()
                    var penaoldminute = clocktimeold.getMinutes()

                    var penaoldyear = clocktime.getFullYear() - clocktimeold.getFullYear()

                    if (clocktime.getFullYear() < clocktimeold.getFullYear()) {
                        var penaolddate = clocktime.getDate()
                        var penaoldmonth = clocktime.getMonth()
                    } else {
                        if (clocktime.getDate() < clocktimeold.getDate()) { var penaolddate = clocktimeold.getDate() } else { var penaolddate = 0 }
                        if (clocktime.getMonth() < clocktimeold.getMonth()) { var penaoldmonth = clocktimeold.getMonth() } else { var penaoldmonth = 0 }
                    }

                    config.penalidade = true

                    getdateexport({
                        "auto": true,
                        "variable": false,

                        // Editor SET

                        "edit": true,
                        "mode": "add",

                        "date": penaolddate,
                        "month": penaoldmonth,
                        "year": penaoldyear,

                        "hour": penaoldhour,
                        "minute": penaoldminute
                    }, function(penalidaderesult) { chrome.storage.local.set({ penalidade: true, penalidadetime: penalidaderesult }, function() { alert(chrome.i18n.getMessage("penaenter")) }); })

                }

                // Penalidade Ativa
                if (config.penalidade == true) {
                    var penaliclock = new Date(config.penalidadetime);
                    if (clocktime > penaliclock) { chrome.storage.local.set({ penalidade: false, penalidadetime: null }); }

                    chrome.notifications.create("penalivre", {
                        type: "basic",
                        iconUrl: chrome.extension.getURL("icons/icon_128.png"),
                        title: chrome.i18n.getMessage("penafreetitle"),
                        message: chrome.i18n.getMessage("penafreemessage"),
                        contextMessage: chrome.i18n.getMessage("penanoti")
                    })

                }

                // Hospital
                else if (config.hospital == true) {
                    var hospitalclock = new Date(config.hospitaltime);
                    if (clocktime > hospitalclock) {
                        statusgenerator("heal", { "checkproblem": false, "pagetype": false });
                        chrome.storage.local.set({ hospital: false, hospitaltime: null });

                        chrome.notifications.create("hospitallivre", {
                            type: "basic",
                            iconUrl: chrome.extension.getURL("icons/icon_128.png"),
                            title: chrome.i18n.getMessage("hospfreetitle"),
                            message: chrome.i18n.getMessage("hospfreemessage"),
                            contextMessage: chrome.i18n.getMessage("hospnoti")
                        })

                    }
                }








                // Banho
                else if (config.banhotimed == true) {
                    var banhoclock = new Date(config.banhoclock);
                    if (clocktime > banhoclock) {
                        statusgenerator("custom", { "type": "nmhigiene", "valueType": "add", "value": 100, "update": true, "checkproblem": true, "pagetype": false })

                        chrome.storage.local.set({ banhotimed: false, banhoclock: null });

                        chrome.notifications.create("banholivre", {
                            type: "basic",
                            iconUrl: chrome.extension.getURL("icons/icon_128.png"),
                            title: chrome.i18n.getMessage("banhofstitle"),
                            message: chrome.i18n.getMessage("banhofsmsg"),
                            contextMessage: chrome.i18n.getMessage("banhofsnoti")
                        })
                    }

                }









                // Sem Penalidade
                else {
                    if (autostart == true) {

                        afkgethour({ "new": "auto", "old": "auto" }, function(afkhours) {

                            if (config.nmfome == 0) { sethpauto = sethpauto + 4 }
                            if (config.nmsede == 0) { sethpauto = sethpauto + 4 }
                            var hpdetectafk = sethpauto * afkhours

                            if ((config.nmfome == 0) || (config.nmsede == 0)) { statusgenerator("custom", { "type": "nmsdgood", "valueType": "remove", "value": hpdetectafk, "update": false }); }

                            sethpauto = 0

                            var fomedetectafk = setfomeauto * afkhours
                            var sededetectafk = setsedeauto * afkhours
                            var energiadetectafk = setenergiaauto * afkhours
                            var higienedetectafk = sethigieneauto * afkhours

                            statusgenerator("custom", { "type": "nmfome", "valueType": "remove", "value": fomedetectafk, "update": false });
                            statusgenerator("custom", { "type": "nmsede", "valueType": "remove", "value": sededetectafk, "update": false });
                            statusgenerator("custom", { "type": "nmenergia", "valueType": "add", "value": energiadetectafk, "update": false });
                            statusgenerator("custom", { "type": "nmhigiene", "valueType": "remove", "value": higienedetectafk, "update": false, "checkproblem": true, "cancelupdateproblem": true });

                        })

                        setconfigclock();
                    } else { setconfigclock(); } // Setar novo OLD Date
                }

            })
        }






        // Start System Clock
    };
    setInterval(function() { updateclockst(); }, 1000);
    updateclockst(true);
};
startclock();