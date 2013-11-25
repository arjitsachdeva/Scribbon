var chatOpen = false, // Is chat open?
    chatUnread = 0, // How many unread chats?
    chatInterval; // Reference to flashChat's setInterval for flashing

$(function() {        
    // Tools setup
    $('.choose-color').ColorPicker({
        color: color,
		onChange: function(c) {
			var rgb = hsvToRgb(c.h,c.s,c.b),
                color = 'rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
			$('.choose-color').css('background',color);
            setColor(color);
		}
	});
    
    // Button event handlers
    $('.button').each(function() {
        if($(this).attr('img')) {
            var img = document.createElement('img');
            img.src = $(this).attr('img');
            $(img).css('opacity',0.6);
            $(this).append(img);
        }
    });
            
    // Buttonsets contain buttons, only one can be selected at a time
    $('.buttonset').each(function() {
        var current;
        $(this).find('.button').click(function() {
            setCurrent(this);
        });
        function setCurrent(button) {
            if(button == current) return;
            $(this).val($(button).val());
            $(button).addClass('button-selected');
            $(current).removeClass('button-selected');
            current = button;
        }
        setCurrent($(this).find('.button').get(0));
    });
    
    // Button click handlers
    $('.clear-button').click(clear);
    $('.pen-button').click(usePen);
    $('.eraser-button').click(useEraser);
    $('.size-button').click(function() {
        setSize($(this).attr('val'));
    });
    $('.save-button').click(saveImage);
    $('.background-button').click(backgroundClick);
    // Make it pretty on iPad
    if(is_iPad()) {
        $('.toolbox').css('padding-top',10).css('margin-left',10);
        $(document).on('touchmove',function(e) {
            e.preventDefault();
        });
    }
    
    // Chat controls 
    $('.chat-button').click(function() {
        if(chatOpen) {
            closeChat();
        } else {
            openChat();
        }
    });
    
    $('.chat-pane textarea').keydown(function(e) {
        if(e.keyCode == 13 && $(this).val().trim().length > 0) {
            // Fire away!
            e.preventDefault();
            sendChatMessage($(this).val().trim());
            $(this).val('');
        }
    });
});

// Handler to open chat box
function openChat() {
    $('.chat-button').html('Chat').css('background','#618dbd');
    clearInterval(chatInterval);
    chatInterval = null;
    chatUnread = 0;
    $('.chat-pane').animate({
        right: 0
    },400);
    chatOpen = true;
}

// Handler to close chat box
function closeChat() {
    $('.chat-pane').animate({
        right: -400
    },400);
    chatOpen = false;
}

// Flashes chat button to inform of new messages
function flashChat() {
    var i=0;
    chatInterval = chatInterval || setInterval(function() {
        $('.chat-button').html('Chat ('+chatUnread+')');
        $('.chat-button').css('background',(i % 2 == 0)? '#e06464' : '#f74f4f');
        i++;
    },500);
}

function saveImage() {
	var img=$('.canvas').get(0).toDataURL();


         stWidget.addEntry({
                 "service":"sharethis",
                 "element":document.getElementById('facebook'),
                 "url":"http://scribbon.com",
                 "title":"This is for you!",
                 "type":"large",
                 "text":"" ,
                 "image":img,
                 
         });


	$.fn.prettyPhoto(); 	$.prettyPhoto.open(img,'Title','Description'); return false
//    window.open($('.canvas').get(0).toDataURL(),'_blank');
}

function backgroundClick() {
    askForBackground();
}
