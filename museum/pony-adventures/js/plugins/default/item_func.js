// Click Item

function openitemclick(data) {

    // Base
    function startclickitem(datasec) {
        statusgenerator("custom", {
            "type": datasec.type,
            "valueType": datasec.valueType,
            "value": datasec.value,
            "update": datasec.update,
            "test": false,
            "checkproblem": false,
            "cancelupdateproblem": false,
            "pagetype": true
        })
    }

    console.log(data.type);

    // Comida e Bebida
    if (data.type == "foodlist") {

        if (data.envalue == true) { startclickitem({ "type": "nmfome", "valueType": "add", "value": data.value, "update": false }) }
        if (data.envalbad == true) { startclickitem({ "type": "nmsdbad", "valueType": "add", "value": data.valbad, "update": false }) }
        if (data.envalhp == true) { startclickitem({ "type": "nmsdgood", "valueType": "add", "value": data.valhp, "update": false }) }
        if (data.envalsede == true) { startclickitem({ "type": "nmsede", "valueType": "add", "value": data.valsede, "update": false }) }
        if (data.envalhigi == true) { startclickitem({ "type": "nmhigiene", "valueType": "add", "value": data.valhigi, "update": false }) }
        if (data.envalene == true) { startclickitem({ "type": "nmenergia", "valueType": "add", "value": data.valene, "update": false }) }
        startclickitem({ "type": "nmsdgood", "valueType": "add", "value": 0, "update": true });

    }


    // Arma
    else if (data.type == "weaponlist") {
        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ weaponset: data.value }, function() { ponystartpagehs(); }) }
    }





    // Roupa
    else if (data.type == "customroupa") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customroupa: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customrosto") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customrosto: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customcabeca") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customcabeca: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customacessorio") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customacessorio: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customcauda") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customcauda: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customcascofr") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customcascofr: data.value }, function() { ponystartpagehs(); }) }

    } else if (data.type == "customcascoat") {

        var confirmactionst = confirm(chrome.i18n.getMessage("iteminsertwarn"))
        if (confirmactionst == true) { chrome.storage.local.set({ customcascoat: data.value }, function() { ponystartpagehs(); }) }

    }







    // Remover Item
    if (data.remove == true) {
        objectgen({
            "type": "editor",
            "editor": "edit",
            "objectList": data.type,
            "object": data.name,
            "value": 1,
            "valueAjust": true,
            "valueType": "remove",
            "old": "auto",
            "finalresulten": true
        }, function(objectlist) {
            if ((objectlist[data.name] < 1) || (objectlist[data.name] == null) || (objectlist[data.name] == "undefined")) {
                $("#ivtitem" + data.name).off("click").remove();
            } else {
                $("#ivtitem" + data.name + " .title").text($("#ivtitem" + data.name + " .title").text().split(" (")[0] + " (" + objectlist[data.name] + ")")
            }

        })
    }

}
















// Gerador de Lista

function openitemlist(data) {
    chrome.storage.local.get(function(config) {

        // Base


        function generatoritem(setdata, autosetdata) {

            if (setdata.quant > 0) {

                if ((setdata.remove == true) || (setdata.show_quant == true)) {
                    var quantikpe = " (" + setdata.quant + ")";
                } else {
                    var quantikpe = " ";
                }

                $("#inventory").append($("<div>", { class: "ivitem", id: "ivtitem" + autosetdata.name }).append(
                    $("<figure>", { class: autosetdata.raryClass, title: autosetdata.info }).append(
                        $("<img>", { alt: "imgivtitem", src: chrome.extension.getURL("images/inventory/" + autosetdata.type + "/" + autosetdata.image), class: "image" }),
                        $("<div>", { class: "title" }).text(autosetdata.nick + quantikpe), $("<div>", { class: "rarity" }).text(autosetdata.rary), $("<div>", { class: "type" }).text(autosetdata.type_name)
                    )).on("click", function() {
                    openitemclick({
                        "type": autosetdata.type,
                        "remove": setdata.remove,
                        "name": autosetdata.name,
                        "envalue": setdata.envalue,
                        "value": setdata.value,
                        "enantivalue": setdata.enantivalue,
                        "antivalue": setdata.antivalue,
                        "envalhp": setdata.envalhp,
                        "valhp": setdata.valhp,
                        "envalbad": setdata.envalbad,
                        "valbad": setdata.valbad,
                        "envalsede": setdata.envalsede,
                        "valsede": setdata.valsede,
                        "envalhigi": setdata.envalhigi,
                        "valhigi": setdata.valhigi,
                        "envalene": setdata.envalene,
                        "valene": setdata.valene
                    })
                }))
            }
        }

        $("#inventory *").off("click");
        $("#inventory").empty();







        //Lista de Tipos de Itens






        // Comida

        if (data.type == "foodlist") {
            objectgen({ "type": "load", "objectList": data.type }, function(itemlistpx) {



                // Item Test 1	
                generatoritem({
                    "quant": itemlistpx.test1,
                    "envalue": true,
                    "value": 1
                }, item_list.test1)



                // Item Test 2	
                generatoritem({
                    "quant": itemlistpx.test2,
                    "envalue": true,
                    "remove": true,

                    "value": 1
                }, item_list.test2)


            });
        }











        // Customização
        else if (data.type == "equiplist") {
            objectgen({ "type": "load", "objectList": data.type }, function(itemlistpx) {

                // Item Test	
                generatoritem({
                    "quant": itemlistpx.test,
                    "show_quant": true,

                    "value": "Coisa"
                }, item_list.teste)

            });
        }





        // Diversos
        else if (data.type == "keylist") {
            objectgen({ "type": "load", "objectList": data.type }, function(itemlistpx) {

                // Item Test	
                generatoritem({
                    "quant": itemlistpx.test,
                    "show_quant": true,
                }, item_list.test)

            });
        }








    })
}