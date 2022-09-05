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
    console.log('Web3 Account', this.address);

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