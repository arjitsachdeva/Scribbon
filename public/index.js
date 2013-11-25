$(function() {
    $('.go-button').click(function() {
        if(getField('canvas-name')) {
            ajax('create-room',{
                name: getField('canvas-name'),
                password: getField('canvas-password') || ''
            },function(d) {
                $('.fields').slideUp(200);
                $('.result').slideDown(200);
                $('.big-link a').html(SERVER + '/' + JSON.parse(d)).attr('href','http://'+SERVER + '/' + JSON.parse(d));
            });
        }
    });
    
    $('.responsive').each(function() {
        var color = $(this).css('color');
        var def = $(this).val();
        $(this).attr('def',def);
        $(this).focus(function() {
            if($(this).val() == def) {
                $(this).val('').css('color',color);
            }
        }).blur(function() {
            if($(this).val() == '') {
                $(this).val(def).css('color','#CCC');
            }
        }).focus().blur();
    });
});

// Gets the value of a text field

function getField(field) {
    var el;
    field = '.' + field;
    el = $(field);
    if(el.val() == el.attr('def')) {
        return null;
    }
    return el.val();
}