$(() => {

    // Run Website
    const confirmVore = function(finalAction) {

        // Delete Warning
        $('#vore-warning').remove();

        // Continue
        finalAction();

    };

    // Vore Checker
    const allowedVore = localStorage.getItem('allowedVore');
    if (!allowedVore) {

        /* $('#app').after(
            $('<div>', { id: 'vore-warning', class: 'container m-5 text-center border p-5' }).append(

                // Warning
                $('<h3>').text('WARNING!'),
                $('<h4>', { class: 'alert-danger container p-3' }).text('Heads up! This website will contain questionable content and vore.'),
                $('<p>').text('This type of content may be uncomfortable for some viewers, so please be sure what you are consuming before proceeding to this website.'),
                $('<p>').text('By clicking on the button below, you agree that all content viewed on this website is at your own risk and responsibility.'),

                $('<button>', { class: 'btn btn-danger' }).text('Continue~').click(function() {
                    localStorage.setItem('allowedVore', true);
                    confirmVore(() => { $('#app').fadeIn(); });
                })

            )
        ); */

    }

    // Confirmed
    else { confirmVore(() => { $('#app').css('display', ''); });; }

});