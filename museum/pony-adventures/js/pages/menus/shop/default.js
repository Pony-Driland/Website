var click_list = {};
var multibuy = false;

function open_shop(data) {

    $("#shopuser").append($("<img>", { alt: "image", src: chrome.extension.getURL("images/shop/") + data.image + ".png" }));
    $("#shopname").text(data.name);
    $("#shopinfo").text(data.info);
    setTimeout(function() { document.title = data.title; }, 10);

    for (i = 0; i < data.shop.length; i++) {

        click_list[data.shop[i].item.name] = 0;
        $("#shopitems").append($("<div>", { class: "ivitem", id: "ivtitem" + data.shop[i].item.name, price: data.shop[i].price, type: data.shop[i].item.type }).append(
            $("<figure>", { rarity: data.shop[i].item.raryClass, title: data.shop[i].item.info }).append(
                $("<img>", { alt: "imgivtitem", src: chrome.extension.getURL("images/inventory/" + data.shop[i].item.type + "/" + data.shop[i].item.image), class: "image" }),
                $("<div>", { class: "title" }).text(data.shop[i].item.nick), $("<div>", { class: "rarity " }).text(data.shop[i].item.rary), $("<div>", { class: "type" }).text(data.shop[i].item.type_name),
                $("<p>").text("ƃ" + data.shop[i].price)
            )).click(function() {
            var thishere = this;
            chrome.storage.local.get(function(config) {

                if (config.money > Number($(thishere).attr("price"))) {

                    if (multibuy == true) {
                        var buy_quant = 10;
                    } else {
                        var buy_quant = 1;
                    }

                    click_list[$(thishere).attr("id").replace("ivtitem", "")] = click_list[$(thishere).attr("id").replace("ivtitem", "")] + buy_quant;
                    $("#" + $(thishere).attr("id") + " .title").text($("#" + $(thishere).attr("id") + " .title").text().split(" (")[0] + " (" + click_list[$(thishere).attr("id").replace("ivtitem", "")] + ")");

                    moneygen({ "value": Number($(thishere).attr("price")) * buy_quant, "valueType": "remove", "test": false, "bank": false, "backgroundmode": false });


                    objectgen({ "type": "load", "objectList": $(thishere).attr("type") }, function(itemlistpx) {

                        var itemgenerator_name = $(thishere).attr("id").replace("ivtitem", "");
                        if (
                            (itemlistpx[itemgenerator_name] == undefined) ||
                            (itemlistpx[itemgenerator_name] == null)
                        ) { var editortype = "add"; } else {
                            var editortype = "edit";
                        }

                        if (multibuy == true) {
                            var buy_quant = 10;
                        } else {
                            var buy_quant = 1;
                        }

                        multibuy = false;

                        objectgen({
                            "type": "editor",
                            "editor": editortype,
                            "objectList": $(thishere).attr("type"),

                            "object": $(thishere).attr("id").replace("ivtitem", ""),
                            "value": buy_quant,
                            "valueAjust": true,
                            "valueType": "add",
                            "old": "auto"
                        });
                    });

                } else {
                    $(thishere).addClass("error");
                    setTimeout(function() { $(thishere).removeClass("error"); }, 1000);
                }

            });
        }).contextmenu(function() {
            multibuy = true;
            $("#" + $(this).attr("id")).trigger("click");
            return false;
        }));

    }

}

if (location_GET.open == "test") {

    open_shop({
        "image": "",
        "title": "Test Shop",
        "name": "Yay Maikon",
        "info": "Local de vendas especializdas sobre coisas relacionadas ao nosso humilde yay.",

        "shop": [

            {
                "item": item_list.test1,
                "price": 35
            },

            {
                "item": item_list.test2,
                "price": 35
            }

        ]
    });

}