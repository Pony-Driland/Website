// Dialogo 1

function dialogo1(data, next, start) {
    $(data.next).off("click");
    if (data.newStart == true) { start(); }
    $(data.id).text(data.text);
    if (data.changeImage == true) { $(data.srcImage).attr("src", data.image); }
    if (data.changeNext == true) { $(data.next).val(data.newNext); }
    $(data.next).click(function() { next(); })
}