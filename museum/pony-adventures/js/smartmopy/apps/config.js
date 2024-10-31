// Configurações

function appconfig(){

function closepagessoklock(passworden){if(passworden == true){
chromebackground({"text": "lockclose1", "response": "lockclose2", "type": "send"})
}}

function savesmartconfig(idconfigpx){
var idconfigpx2 = idconfigpx.replace("label", "");
if(idconfigpx2 == "notification"){chrome.storage.local.set({notist: $("#notification").prop("checked")});}
else if(idconfigpx2 == "sound"){chrome.storage.local.set({soundst: $("#sound").prop("checked")});}
else if(idconfigpx2 == "smartsound"){chrome.storage.local.set({smartsound: $("#smartsound").prop("checked")});}
}

if(smartpagenumber == 1){

submenuname = 0
$("#tela").append($("<span>", {class: "appblock"}).append(

$("<div>", {class: "privacytext", id: "passwordtable"}).text(chrome.i18n.getMessage("appconfigsub11")).append(

$("<input>", {type: "password", id: "passwordinsert"}),
$("<div>", {class: "privacytext confirmpass"}).text(chrome.i18n.getMessage("appconfigsub12")),
$("<input>", {type: "password", id: "passwordconfirm"}),
$("<label>", {class: "privacytext", id: "passwordcomplete"}).text(chrome.i18n.getMessage("ativar")).append($("<input>", {type: "checkbox"})),
$("<br>"),
$("<input>", {type: "submit", value: chrome.i18n.getMessage("confirm")}).click(function(){if(($("#passwordinsert").val() == $("#passwordconfirm").val()) && ($("#passwordinsert").val().length > 0)){
$("#passwordinsert, #passwordconfirm").removeClass("failpassword");
chrome.storage.local.set({password: $("#passwordinsert").val(), passworden: $("#passwordcomplete input").prop("checked")},
function(){backpagexps(); chrome.storage.local.get(function(config){ closepagessoklock(config.passworden);});});
}
else{$("#passwordinsert, #passwordconfirm").addClass("failpassword");}}))))

chrome.storage.local.get({password: "", passworden: false},function(config){
$("#passwordinsert, #passwordconfirm").val(config.password);
$("#passwordcomplete input").prop("checked", config.passworden);
})

}

else{

configpagegen({"max": "6"},[
{
"type": "option",
"id": "notification",
"textTop": chrome.i18n.getMessage("appconfig11"),
"textBottom": chrome.i18n.getMessage("appconfig12")
},

{
"type": "option",
"id": "sound",
"textTop": chrome.i18n.getMessage("appconfig21"),
"textBottom": chrome.i18n.getMessage("appconfig22")
},

{
"type": "option",
"id": "smartsound",
"textTop": chrome.i18n.getMessage("appconfig31"),
"textBottom": chrome.i18n.getMessage("appconfig32")
},

{
"type": "submenu",
"textTop": chrome.i18n.getMessage("appconfig61"),
"textBottom": chrome.i18n.getMessage("appconfig62"),
"sub1":1
},

{
"type": "display",
"textTop": chrome.i18n.getMessage("appconfig41"),
"textBottom": chrome.i18n.getMessage("appconfig42")
},

{
"type": "display",
"textTop": chrome.i18n.getMessage("appconfig51"),
"textBottom": chrome.i18n.getMessage("appconfig52")
}
],function(idconfigpx){savesmartconfig(idconfigpx); configtop();})



chrome.storage.local.get({notist: true, soundst: true, smartsound: true},function(config){
$("#notification").prop("checked", config.notist);
$("#sound").prop("checked", config.soundst);
$("#smartsound").prop("checked", config.smartsound);
})

}

}