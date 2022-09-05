var puddyWeb3 = new PuddyWeb3('matic');

puddyWeb3.on('accountsChanged', function () {

});

puddyWeb3.on('networkChanged', function () {

});

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