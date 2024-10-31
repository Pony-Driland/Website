// Comunica��o

function chromebackground(data, finalresult, finalresult2) {

    // Comunica��o Receber

    if (data.type == "have") {

        chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
            if (message.text == data.text) {
                sendResponse({ type: data.response })


                chrome.storage.local.get(function(config) { finalresult(config); })

            };
        });

    }

    // Comunica��o Enviar
    else if (data.type == "send") {

        chrome.extension.sendMessage({ text: data.text }, function(reponse) {
            if (reponse.type == data.response) {

                chrome.storage.local.get(function(config) { finalresult(config); })


            }
        });

    }

    if (data.resultcreate == true) { finalresult2(); }

}