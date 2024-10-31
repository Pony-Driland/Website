// Reset Extension

function resetextension(finalresulttrue, finalresult) {
    var toRemove = [];

    function deletealllocal() {
        chrome.storage.local.get(function(Items) {
            $.each(Items, function(index, value) {

                toRemove.push(index);
            });




            chrome.storage.local.remove(toRemove, function(Items) {


                chrome.storage.local.get(function(Items) {
                    $.each(Items, function(index, value) {

                    });
                });

                if (finalresulttrue == true) { finalresult(); }

            });
        });
    }

    function deleteallsync() {
        chrome.storage.local.get(function(Items) {
            $.each(Items, function(index, value) {

                toRemove.push(index);
            });




            chrome.storage.local.remove(toRemove, function(Items) {


                chrome.storage.local.get(function(Items) {
                    $.each(Items, function(index, value) {

                    });
                });

                deletealllocal();

            });
        });
    }

    deleteallsync();
}