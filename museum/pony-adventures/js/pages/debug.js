function reloadsystemst() {

    objectgen({ "type": "load", "objectList": "quest" }, function(itemlistpx) {
        $("#quest").empty().text(JSON.stringify(itemlistpx));
    });

    objectgen({ "type": "load", "objectList": "foodlist" }, function(itemlistpx) {
        $("#foodlist").empty().text(JSON.stringify(itemlistpx));
    });

    objectgen({ "type": "load", "objectList": "equiplist" }, function(itemlistpx) {
        $("#equiplist").empty().text(JSON.stringify(itemlistpx));
    });

    objectgen({ "type": "load", "objectList": "weaponlist" }, function(itemlistpx) {
        $("#weaponlist").empty().text(JSON.stringify(itemlistpx));
    });

    objectgen({ "type": "load", "objectList": "keylist" }, function(itemlistpx) {
        $("#keylist").empty().text(JSON.stringify(itemlistpx));
    });

    actvgen({ "view": true }, function(itemlistpx) {
        $("#achievement").empty().text(JSON.stringify(itemlistpx));
    });


    chrome.storage.local.get(function(config) {
        $("#bank").text(config.bank);

        $("#weaponset").text(config.weaponset);
        $("#customroupa").text(config.customroupa);
        $("#customrosto").text(config.customrosto);
        $("#customcabeca").text(config.customcabeca);
        $("#customacessorio").text(config.customacessorio);
        $("#customcauda").text(config.customcauda);
        $("#customcascofr").text(config.customcascofr);
        $("#customcascoat").text(config.customcascoat);
    });

}

reloadsystemst();






$("[id^='add_'], [id^='remove_'], [id^='edit_']").click(function() {

    var selectitem_sek = $(this).attr("id").replace("add_", "").replace("remove_", "").replace("edit_", "");
    objectgen({


        "type": "editor",
        "editor": $(this).attr("id").split("_")[0],
        "objectList": selectitem_sek,

        "object": $("#value_" + selectitem_sek).val(),
        "value": Number($("#number_" + selectitem_sek).val()),
        "valueAjust": true,
        "valueType": $("#set_" + selectitem_sek).val(),
        "old": "auto",
        "finalresulten": true



    }, function(itemlistpx) {
        reloadsystemst();
    });

});















$("#sadd_achievement, #sremove_achievement, #sedit_achievement").click(function() {

    var selectitem_sek = $(this).attr("id").replace("sadd_", "").replace("sremove_", "").replace("sedit_", "");
    actvgen({
        // Configuração

        "id": $("#value_" + selectitem_sek).val(),
        "value": $("#check_" + selectitem_sek).is(":checked"),
        "editor": $(this).attr("id").split("_")[0].substring(1),

        // Notificação

        "notification": false,
        "finalresult": true
    }, function(itemlistpx) {
        reloadsystemst();
    })

});






$("#send_money").click(function() {

    if ((isNaN($("#value_money").val()) == false) && ($("#value_money").val() > -1)) {
        var money_set = Number($("#value_money").val());
    } else {
        var money_set = 0;
    }
    if ($("#type_money").val() == "money") {
        var bank_type = false;
    } else if ($("#type_money").val() == "bank") {
        var bank_type = true;
    }
    moneygen({ "value": money_set, "valueType": $("#set_money").val(), "test": false, "bank": bank_type, "backgroundmode": false, "finalresulten": true }, function(bank) {

        if ($("#type_money").val() == "bank") { $("#bank").text(bank); }

    });

});