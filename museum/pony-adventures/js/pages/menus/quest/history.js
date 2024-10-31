objectgen({ "type": "load", "objectList": "quest" },
    function(quest) {

        if (quest.none == 0) {

            questgenerator({
                "type": "history",
                "title": "Fazendo o que se deve",
                "dific": "Fácil",
                "text": "Coisa super interessante para fazer!",
                "dica": "Sem dicas!"
            })

            questgenerator({
                "type": "history",
                "title": "test 1",
                "dific": "Normal",
                "text": "Coisa super interessante para fazer222!",
                "dica": "Sem dicas!"
            })

        }

    });