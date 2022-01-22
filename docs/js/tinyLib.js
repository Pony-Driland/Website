// Prepare Tiny Lib
var tinyLib = {};

(function() {
    var hidden = "windowHidden";

    // Standards:
    if (hidden in document)
        document.addEventListener("visibilitychange", onchange);
    else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", onchange);
    else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", onchange);
    else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", onchange);
    // IE 9 and lower:
    else if ("onfocusin" in document)
        document.onfocusin = document.onfocusout = onchange;
    // All others:
    else
        window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

    function onchange(evt) {
        $('body').removeClass('windowHidden').removeClass('windowVisible');
        var v = "windowVisible",
            h = "windowHidden",
            evtMap = {
                focus: v,
                focusin: v,
                pageshow: v,
                blur: h,
                focusout: h,
                pagehide: h
            };

        evt = evt || window.event;
        if (evt.type in evtMap)
            $('body').addClass(evtMap[evt.type]);
        else
            $('body').addClass(this[hidden] ? "windowHidden" : "windowVisible");
    }

    // set the initial state (but only if browser supports the Page Visibility API)
    if (document[hidden] !== undefined)
        onchange({ type: document[hidden] ? "blur" : "focus" });
})();

// Alert
tinyLib.alert = function(where, alertType, icon, text) {
    $(where)
        .empty()
        .append($("<div>", {
            class: "alert alert-" + alertType + " alert-dismissible fade show"
        }).append(
            $("<button>", { class: "close", "data-dismiss": "alert", type: "button" }).append(
                $("<span>", { "aria-hidden": true, class: "text-secondary" }).text("×")
            ),
            $("<i>", { class: icon }), " ", text));
};

// Modal
tinyLib.modal = function(data) {

    if (typeof data.dialog !== "string") { data.dialog = ''; }

    const modal = $("<div>", { class: "modal fade", id: data.id, tabindex: -1, role: "dialog", }).on('hidden.bs.modal', function(e) {
        $(this).remove();
        if (typeof data.hidden === "function") {
            data.hidden();
        }
    }).append(
        $("<div>", { class: "modal-dialog " + data.dialog, role: "document" }).append(
            $("<div>", { class: "modal-content" }).append(

                $("<div>", { class: "modal-header" }).append(
                    $("<h5>", { class: "modal-title" }).text(data.title),
                    $("<button>", { type: "button", class: "close", "data-dismiss": "modal" }).append(
                        $("<span>").text("×")
                    )
                ),

                $("<div>", { class: "modal-body" }).append(data.body),
                $("<div>", { class: "modal-footer" }).append(data.footer)

            )
        )
    );

    $("body").prepend(modal);
    modal.modal();

};

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
tinyLib.formatBytes = function(bytes, decimals = 2) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];

};

// Alert
alert = function(text, title = 'Browser Warning!') {
    return tinyLib.modal({
        title: title,
        body: $('<div>', { class: 'text-break' }).css('white-space', 'pre-wrap').text(text),
        dialog: 'modal-lg'
    });
};

// This is a functions that scrolls to #{blah}link
tinyLib.goToByScroll = function(id, speed = 'slow') {
    $('html,body').animate({
        scrollTop: id.offset().top
    }, speed);
};