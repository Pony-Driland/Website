// Start Web3
var puddyWeb3 = new PuddyWeb3('matic');

// Accounts Changed
puddyWeb3.on('accountsChanged', function (data) {

    // Get Address
    const address = puddyWeb3.getAddress();
    console.log('Web3 Connected', address, data);

});

// Network Changed
puddyWeb3.on('networkChanged', function (networkId) {
    console.log('Web3 Network Connected', networkId);
});

puddyWeb3.on('network', function (newNetwork, oldNetwork) {
    console.log('Web3 Network Connected', newNetwork, oldNetwork);
});

// Connection Update
puddyWeb3.on('connectionUpdate', function (trigger) {

    // Get Address
    const address = puddyWeb3.getAddress();

    // Console
    console.log('Web3 Account (' + trigger + ')', address);

    // Update CSS and remove modal
    $('#crypto_connection').modal('hide');
    $('body').addClass('web3-connected');

    // Change Title
    if (address) {

        $('#login').data('bs-tooltip-data', address);

        const tooltip = $('#login').data('bs-tooltip');
        if (tooltip) {
            tooltip.setContent({ '.tooltip-inner': address });
        }

    }

});

// Login
storyCfg.web3.login = function () {

    // Login Mode
    if (!puddyWeb3.existAccounts()) {
        tinyLib.modal({

            id: 'crypto_connection',
            title: 'Login Protocol (Features under development)',
            body: $('<center>').append(

                $('<button>', { class: 'btn btn-info m-4' }).text('Metamask').click(function () {

                    $('#crypto_connection').modal('hide');
                    puddyWeb3.alertIsEnabled();
                    if (puddyWeb3.isEnabled()) {
                        puddyWeb3.sign().then(() => {
                            $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                            window.location.reload();
                        }).catch(err => { alert(err.message); console.error(err); });
                    }

                })

            )

        });
    }

    // Panel
    else {

        // Prepare Items
        const modalTitle = 'Choose what kind of data you want to interact within the blockchain. Please make sure you are in the correct domain.';
        const modalWarn = $('<strong>', { class: 'ms-1' }).text('We only work on the domain ' + storyCfg.domain + '!');
        const items = [];
        const itemsData = {};
        let clickType = null;
        let clickType2 = null;

        // NSFW Filter
        itemsData.nsfwFilter = $('<button>', { class: 'btn btn-secondary m-2' }).text('NSFW Filters').click(function () {

            const filters = [];
            const nsfwList = [];
            for (const fic in storyData.data) {
                for (const item in storyData.data[fic]) {
                    if (storyData.data[fic][item].nsfw) {
                        for (const nsfwItem in storyData.data[fic][item].nsfw) {
                            if (nsfwList.indexOf(storyData.data[fic][item].nsfw[nsfwItem]) < 0) {

                                // Add Item
                                const NSFWITEM = storyData.data[fic][item].nsfw[nsfwItem];
                                nsfwList.push(NSFWITEM);

                                // Add NSFW Item
                                if (storyCfg.nsfw[NSFWITEM]) {

                                    // Action
                                    filters.push($('<button>', { class: 'btn btn-secondary m-2' }).data('nsfw_crypto_data', { id: NSFWITEM, data: storyCfg.nsfw[NSFWITEM] }).text(storyCfg.nsfw[NSFWITEM].name).click(async function () {

                                        $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                                        await puddyWeb3.requestAccounts();
                                        $.LoadingOverlay("hide");
                                        if (clickType === 'save') {

                                            let setValue = 0;
                                            const nsfwID = $(this).data('nsfw_crypto_data').id;
                                            if (typeof nsfwID === 'string' && nsfwID.length > 0) {

                                                const value = localStorage.getItem('NSFW' + nsfwID);
                                                if (value === 'true') {
                                                    setValue = 1;
                                                }


                                                storyCfg.web3.contract.changeNsfwFilter(nsfwID, setValue).then((data) => {
                                                    alert(`Blockchain Storage (BETA) - You set the NSFW Filter ${nsfwID} to ${setValue}!\n\nHash: ${data.hash}`);
                                                }).catch(err => { alert(err.message); console.error(err); });

                                            }

                                        } else if (clickType === 'load') {

                                            const nsfwID = $(this).data('nsfw_crypto_data').id;

                                            storyCfg.web3.contract.getNsfwFilter(puddyWeb3.getAddress(), nsfwID).then((data) => {
                                                console.log(puddyWeb3.parseToSimpleInt(data));
                                            }).catch(err => { alert(err.message); console.error(err); });

                                        }

                                        $('#crypto_connection3').modal('hide');
                                        return;

                                    }));

                                }

                            }
                        }
                    }
                }
            }

            $('#crypto_connection2').modal('hide');
            tinyLib.modal({

                id: 'crypto_connection3',
                title: 'Blockchain Storage (BETA) - ' + clickType2,
                dialog: 'modal-lg',
                body: $('<center>').append(
                    $('<div>').text('Choose which filter you want to interact with.'), filters
                )

            });

        });

        items.push(itemsData.nsfwFilter);

        // Volume
        itemsData.volume = $('<button>', { class: 'btn btn-secondary m-2' }).text('Volume').click(async function () {

            $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
            await puddyWeb3.requestAccounts();
            $.LoadingOverlay("hide");
            if (clickType === 'save') {

                const volume = Number(localStorage.getItem('storyVolume'));

                if (typeof volume === 'number' && !isNaN(volume) && isFinite(volume) && volume >= 0 && volume <= 100) {

                    storyCfg.web3.contract.setVolume(volume).then((data) => {
                        alert(`Blockchain Storage (BETA) - You set the volume to ${volume}!\n\nHash: ${data.hash}`);
                    }).catch(err => { alert(err.message); console.error(err); });

                }

            } else if (clickType === 'load') {

                storyCfg.web3.contract.getVolume(puddyWeb3.getAddress()).then((data) => {
                    console.log(puddyWeb3.parseToSimpleInt(data));
                }).catch(err => { alert(err.message); console.error(err); });

            }

            $('#crypto_connection2').modal('hide');
            return;

        });

        items.push(itemsData.volume);

        // Chapter Selected
        if (storyData.chapter.selected > 0) {

            // Bookmark
            itemsData.bookmark = $('<button>', { class: 'btn btn-secondary m-2' }).text('Bookmark - Chapter ' + storyData.chapter.selected).click(async function () {

                $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                await puddyWeb3.requestAccounts();
                $.LoadingOverlay("hide");


                if (
                    typeof storyData.chapter.selected === 'number' &&
                    !isNaN(storyData.chapter.selected) && isFinite(storyData.chapter.selected) &&
                    storyData.chapter.selected > 0
                ) {

                    if (clickType === 'save') {

                        const setValue = Number(localStorage.getItem('bookmark' + String(storyData.chapter.selected)));
                        if (
                            typeof setValue === 'number' &&
                            !isNaN(setValue) && isFinite(setValue) &&
                            setValue >= 0
                        ) {

                            storyCfg.web3.contract.insertBookmark(
                                storyData.chapter.selected, setValue
                            ).then((data) => {
                                alert(`Blockchain Storage (BETA) - You set the Bookmark from chapter ${storyData.chapter.selected} to ${setValue}!\n\nHash: ${data.hash}`);
                            }).catch(err => { alert(err.message); console.error(err); });

                        }

                    } else if (clickType === 'load') {

                        storyCfg.web3.contract.getBookmark(puddyWeb3.getAddress(), storyData.chapter.selected).then((data) => {
                            console.log(puddyWeb3.parseToSimpleInt(data));
                        }).catch(err => { alert(err.message); console.error(err); });

                    }

                }

                $('#crypto_connection2').modal('hide');
                return;

            });

            items.push(itemsData.bookmark);

        }

        // The Modal
        tinyLib.modal({

            id: 'crypto_connection',
            title: 'Blockchain Storage (BETA)',
            dialog: 'modal-lg',
            body: $('<center>').append(

                $('<div>').text('This is your cloud storage. Choose what you want to do. All your data is saved within the blockchain publicly. Any other user will be able to see your data saved.'),

                // Load
                $('<button>', { class: 'btn btn-secondary m-4' }).text('Load').click(function () {

                    clickType = 'load';
                    clickType2 = 'Load';
                    $('#crypto_connection').modal('hide');
                    tinyLib.modal({

                        id: 'crypto_connection2',
                        title: 'Blockchain Storage (BETA) - ' + clickType2,
                        dialog: 'modal-lg',
                        body: $('<center>').append(
                            $('<div>').text(modalTitle).append(modalWarn), items
                        )

                    });

                }),

                // Save
                $('<button>', { class: 'btn btn-primary m-4' }).text('Save').click(function () {

                    clickType = 'save';
                    clickType2 = 'Save';
                    $('#crypto_connection').modal('hide');
                    tinyLib.modal({

                        id: 'crypto_connection2',
                        title: 'Blockchain Storage (BETA) - ' + clickType2,
                        dialog: 'modal-lg',
                        body: $('<center>').append(
                            $('<div>').text(modalTitle).append(modalWarn), items
                        )

                    });

                })

            )

        });

    }

    return false;

};

// Connection Update
puddyWeb3.on('signerUpdated', function (signer) {

    storyCfg.web3.contract = new ethers.Contract(
        storyCfg.web3.contractAddress,
        storyCfg.web3.abi.base,
        signer
    );

});

puddyWeb3.waitAddress().then(() => {
    puddyWeb3.requestAccounts(false);
});