var m = moment().tz("America/New_York"); // US Eastern Time Zone


// Templates para fazer


Template de roletas
Template para Mapa















-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -

// Ler Configurações

var yayaya = JSON.stringify(config)
alert(yayaya)

// Gerador de Modal

modalgenerator({
    "id": "yayaya",
    "title": "alguma coisa",
    "text": "Testando alguma coisa",
    "close": "Fechar"
})


// Status Generator

statusgenerator("custom", {
    "type": "nmhigiene", // nmfome | nmsede | nmenergia | nmhigiene | nmsdgood | nmsdbad 
    "valueType": "add", // add | edit | remove
    "value": 5, // 0 a 100
    "update": true, // Update
    "test": false, // Test

    "checkproblem": false, // Checar situação dos status
    "cancelupdateproblem": false, // Ativar cancelador de update do checkproblem
    "pagetype": false // Usar este sistema em uma página da extensão
})

statusgenerator("heal", { "checkproblem": true, "pagetype": true }); // Full Heal
statusgenerator("kill", { "checkproblem": true, "pagetype": true }); // Matar Personagem


// Ambiente Toxic

ambientetoxic({
    "add": true, // Primeiro Uso
    "time": 2, // Tempo Primeiro Uso

    "enable": true, // Ativar Tóxico

    // Status Editor

    "value": 100, // Mudar Red Status
    "valueType": "add" // add | remove | edit
})




// Gerador de Conquista

actvgen({
    // Configuração

    "id": "test", // Id
    "value": true, // Value
    "editor": "add", // add | remove | edit

    // Notificação

    "notification": true,
    "image": "test.png",
    "title": "Test",
    "message": "Fazendo um lindo e belo teste por aqui!",

    // Test

    "test": true,
    "finalresult": false
})


// Objeto Gerenciador

objectgen({
    "type": "editor", // Editor or Load
    "editor": "add", // Add | Remove | Edit
    "objectList": "quest", // quest | foodlist | costumelist | equiplist | weaponlist | furniturelist | keylist

    "object": "test1", // Item Name
    "value": 6, // Value Item
    "valueAjust": true, // Anti Número Negativo
    "valueType": "add", // add | remove | multiplication | division | modulus | multiplicationX | divisionX | modulusX


    "old": "auto", // Auto or Number

    "test": true // Test Mode
})


// Gerenciador de Dinheiro

moneygen({ "value": 0, "valueType": "remove", "test": false, "bank": false, "backgroundmode": false }); // Background Mode para usar o comando em Segundo Plano






// Obter Relógio Desmontado

getdateexport({
    "auto": false, // false para usar o "clock" | true irá obter sozinho o horário atual

    "clock": "", // Coloque um Date

    // Caso seja var, ignore o variable e use dentro do function os "year,month,day,hours,minutes,seconds,millisec"
    // Caso seja UTC, você irá obter sozinho o valor UTC
    "format": false,

    "variable": false, // Use true para o resultado final setar a variavel "newoldclock"

    // Editor SET

    "edit": false, // true para ativar
    "mode": "normal", // normal | add | remove | multiplication | division | modulus

    // Set Editor do Set | Remova para o valor ficar 0

    "date": 31,
    "month": 11,
    "year": 2016,

    "hour": 23,
    "minute": 59
}, function() {})






// Obter Horas AFK

afkgethour({
    "new": "", // Horário atual | Use auto para obter sozinho
    "old": "", // Horário antigo | Use auto para obter sozinho

    "test": false, // Modo Teste
    "variable": false // Obter por variavel "afksthour"
})







// Add Ajuda Page

"apphelptitledf": { "message": "" },
"apphelpassdf": { "message": "" },

"apphelptextdf": { "message": "" },













// Item Status

generatoritem({
    "image": "", // Imagem
    "name": "Test Yay", // Name
    "rary": "Normal", // Raridade --> Normal | 
    "type": "Alimento", // Alinhamento
    "info": "yay", // Descrição do Item
    "id": "testyay", // ID do item

    "remove": true, // Remover Item após o uso


    "envalue": true, // Valor do Item
    "value": 15,

    "envalsede": false, // Sede 
    "valsede": 0,

    "enantivalue": false, // Anti Valor do Item || Apenas Equipamento e Arma
    "antivalue": 0,


    "envalhp": false, // Anti Vida
    "valhp": 0,

    "envalbad": false, // Objeto Tóxico
    "valbad": 0,


    "envalhigi": false, // Higiene
    "valhigi": 0,

    "envalene": false, // Energia
    "valene": 0
})