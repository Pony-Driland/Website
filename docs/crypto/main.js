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

// Connection Update
puddyWeb3.on('connectionUpdate', function () {

    // Get Address
    const address = puddyWeb3.getAddress();

    // Console
    console.log('Web3 Account', address);

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
                        puddyWeb3.sign();
                    }

                })

            )

        });
    }

    // Panel
    else {

        // Prepare Items
        const modalTitle = 'Choose what kind of data you want to interact within the blockchain. Please make sure you are in the correct domain. We only work on the domain ' + storyCfg.domain + '!';
        const items = [];
        const itemsData = {};

        // NSFW Filter
        itemsData.nsfwFilter = $('<button>', { class: 'btn btn-secondary m-4' }).text('NSFW Filters');
        items.push(itemsData.nsfwFilter);

        // Volume
        itemsData.volume = $('<button>', { class: 'btn btn-secondary m-4' }).text('Volume');
        items.push(itemsData.volume);

        // Chapter Selected
        if (storyData.chapter.selected > 0) {

            // Bookmark
            itemsData.bookmark = $('<button>', { class: 'btn btn-secondary m-4' }).text('Bookmark - Chapter ' + storyData.chapter.selected);
            items.push(itemsData.bookmark);

        }

        // The Modal
        tinyLib.modal({

            id: 'crypto_connection',
            title: 'Blockchain Storage',
            body: $('<center>').append(

                $('<div>').text('This is your cloud storage. Choose what you want to do. All your data is saved within the blockchain publicly. Any other user will be able to see your data saved.'),

                // Load
                $('<button>', { class: 'btn btn-secondary m-4' }).text('Load').click(function () {

                    $('#crypto_connection').modal('hide');
                    tinyLib.modal({

                        id: 'crypto_connection2',
                        title: 'Blockchain Storage',
                        body: $('<center>').append(
                            $('<div>').text(modalTitle),
                            items
                        )

                    });

                }),

                // Save
                $('<button>', { class: 'btn btn-primary m-4' }).text('Save').click(function () {

                    $('#crypto_connection').modal('hide');
                    tinyLib.modal({

                        id: 'crypto_connection2',
                        title: 'Blockchain Storage',
                        body: $('<center>').append(
                            $('<div>').text(modalTitle),
                            items
                        )

                    });

                })

            )

        });

    }

    return false;

};

// puddyWeb3.executeContract();