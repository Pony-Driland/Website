// Aplicativos

function openappmenu(app){

$("#tela").addClass(app);
var appcssconvertts = app.replace("app", "");
var appcssconvertts2 = app.replace("app", "boxstyle_");
$("head").append($("<link>", {id: appcssconvertts2, type: "text/css", rel: "stylesheet", 
href: chrome.extension.getURL("css/smartmopy/apps/"+appcssconvertts+".css")}));
smartpage = app
resetmenupage();

if(app == "appconfig"){appconfig();}
else if(app == "appsms"){appsms();}
else if(app == "apphelp"){apphelp();}

}