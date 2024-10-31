// SMS

function appsms(){

chrome.storage.local.set({smscount: 0})

// Gerador
$("#tela").append($("<div>", {id: "topnamepx"}));

function smspagegenerator(text, url){
if (typeof url != 'undefined'){
$("#topnamepx").text(infosubh4).append(
$("<span>", {class: "glyphicon glyphicon-paperclip", id: "anexo"}).click(function(){window.open("/pages/"+url, "_blank")}));
}
else{$("#topnamepx").text(infosubh4)}
configpagegen({"max": "1"},[
{
"type": "display",
"textTop": infosubh6,
"textBottom": text
}
])
}






// SMS LIST

if(smartpagenumber == 1){
submenuname = 0
smspagegenerator("Alguma coisa super legal pra ser adicionada aqui apenas para realizar alguns pequenos testes marotos que veio na cabeça heh.\nTestando várias coisas legais para valer\n\nPorque sim",
"welcome.html")
}

else if(smartpagenumber == 2){
submenuname = 0
smspagegenerator("Alguma coisa super legal de diferente pra ser adicionada aqui apenas para realizar alguns pequenos testes marotos que veio na cabeça heh.\nTestando várias coisas legais para valer\n\nPorque sim")
}





else{
	
$("#topnamepx").text(chrome.i18n.getMessage("message"));


// Selecionar SMS

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "maik1",
"textTop": "Maikon Fleeps",
"textBottom": "Sobre o dia de hoje como é lindo",
"sub1":1
}])

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "maik2",
"textTop": "Maikon Fleeps",
"textBottom": "Sobre o dia de hoje como é lindo de novo",
"sub1":2
}])





}}