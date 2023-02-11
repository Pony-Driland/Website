$(function() {
    $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
    const newURL = $('#newURL').attr('href');
    if (typeof newURL === 'string' && newURL.length > 0 && newURL.indexOf('http://') < 0 && newURL.indexOf('https://') < 0 && newURL.startsWith('/')) {
        window.location.href = newURL;
    }
});