// SMS

function apphelp(){

// Gerador
$("#tela").append($("<div>", {id: "topnamepx"}));

function smspagegenerator(text){
$("#topnamepx").text(infosubh4);
configpagegen({"max": "1"},[
{
"type": "display",
"textTop": infosubh6,
"textBottom": text
}
])
}






// Principal

if(smartpagenumber == 1){
submenuname = 0
smspagegenerator(chrome.i18n.getMessage("apphelptextdf1"))
}

else if(smartpagenumber == 2){
submenuname = 0
smspagegenerator(chrome.i18n.getMessage("apphelptextdf2"))
}

// FAQ

else if(smartpagenumber == 3){

submenuname = 0
$("#topnamepx").text(chrome.i18n.getMessage("faq"));

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "sobre",
"textTop": chrome.i18n.getMessage("apphelptitledf3"),
"textBottom": chrome.i18n.getMessage("apphelpassdf3")+" "+chrome.i18n.getMessage("appName"),
"sub1":4
}])

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "cores",
"textTop": chrome.i18n.getMessage("apphelptitledf4"),
"textBottom": chrome.i18n.getMessage("apphelpassdf4"),
"sub1":5
}])

configpagegen({"max": "1"},[{"type": "display", 
"textTop": chrome.i18n.getMessage("apphelptitledf5"),
"textBottom": chrome.i18n.getMessage("apphelpassdf5")
}])

configpagegen({"max": "1"},[{"type": "display", 
"textTop": chrome.i18n.getMessage("apphelptitledf6"),
"textBottom": chrome.i18n.getMessage("apphelpassdf6")
}])

configpagegen({"max": "1"},[{"type": "display", 
"textTop": chrome.i18n.getMessage("apphelptitledf7"),
"textBottom": chrome.i18n.getMessage("apphelpassdf7")
}])

configpagegen({"max": "1"},[{"type": "display", 
"textTop": chrome.i18n.getMessage("apphelptitledf8"),
"textBottom": chrome.i18n.getMessage("apphelpassdf8")
}])

configpagegen({"max": "1"},[{"type": "display", 
"textTop": chrome.i18n.getMessage("apphelptitledf9"),
"textBottom": chrome.i18n.getMessage("apphelpassdf9")
}])

}

else if(smartpagenumber == 4){
submenuname = 3
smspagegenerator(chrome.i18n.getMessage("apphelptextdf3"))
}

else if(smartpagenumber == 5){
submenuname = 3
smspagegenerator(chrome.i18n.getMessage("apphelptextdf4"))
}

// Página Principal

else{
	
$("#topnamepx").text(chrome.i18n.getMessage("apphelptitle"));


// Selecionar

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "faqpage",
"textTop": chrome.i18n.getMessage("faq"),
"textBottom": "Tire dúvidas rápidas sobre o "+chrome.i18n.getMessage("appName"),
"sub1":3
}])

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "pin",
"textTop": chrome.i18n.getMessage("apphelptitledf1"),
"textBottom": chrome.i18n.getMessage("apphelpassdf1"),
"sub1":1
}])

configpagegen({"max": "1"},[{"type": "submenu", 
"id": "smart",
"textTop": chrome.i18n.getMessage("apphelptitledf2"),
"textBottom": chrome.i18n.getMessage("apphelpassdf2"),
"sub1":2
}])



}}