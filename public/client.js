var sock, // Socket object used by socket.io
    canvas, // Reference to HTML canvas
    width, // Canvas width
    height, // Canvas height
    id, // Client ID as assigned by socket.io
    room, // Room ID
    roomName, // Room name
    mouse, // Mouse position as fraction of of canvas size (i.e. (0.5,0.5) is center of canvas)
    color, // Current pen color
    size, // Current pen size
    tool, // Current drawing tool
    backgroundURL, // The URL for the current background
    actionBuffer, // Contains mouse events to be sent to server every BUFFER_INTERVAL
    BUFFER_INTERVAL = 10, // (ms) Amount of time to wait between outgoing action buffer updates
    clientData, // Contains data about connected clients
    mouseDown = false, // Is the mouse down?
    isConnected = false; // Are we able to draw on the canvas?
    
/* 

==== CONNECTION SCHEMA ====

...When the page loads and document.ready fires...
1. Socket object attempts to connect to server
2. connect() is called, which calls handshake() to authenticate with server
3. Server accepts connection and handshakeAccepted() is called
4. Server sends all drawing data on canvas, calling multiBufferIn(). At this point canvas is ready to be displayed.
5. Server sends all chat data, calling multiChatIn()
--After connection,
1. Every BUFFER_INTERVAL we call sendActionBuffer() to send actionBuffer to server
2. Whenever we send a chat we call sendChatMessage() to send chat message to server
...If the connection is lost...
1. If the socket disconnects (e.g. due to dropped connection), disconnect() is called
2. If the room expires (if it's idle for EXPIRE_TIME), roomExpired() is called

==== BUFFER FORMAT ====

This is an example of a buffer object that is sent through the server:

{
    id: 'q750w-3Fe891',
    tool: 'pen',
    color: 'rgb(0,0,0)',
    size: '3',
    buffers: [
        {
            old: {x: 0.06, y: 0.65},
            new: {x: 0.07, y: 0.64},
            mouseDown: true
        },
        {
            new: {x: 0.08, y: 0.63},
            mouseDown: true
        }
    ]
}

*/

$(function() {
    room = location.pathname.slice(1);
    $('.join-button').click(tryToJoin);
    ajax('room-info',{room: room},function(d) {
        d = JSON.parse(d);
        roomName = d.name;
        $('.auth-modal').show();
        $('.canvas-name').html(d.name);
        if(d.password) {
            $('.auth-modal-password').show();
        } else {
            $('.auth-modal-password').hide();
        }
    });
});

// Set up socket listeners
function ready() {
	sock = io.connect(SERVER+':'+PORT);
	sock.on('connect', connect).on('disconnect', disconnect);
	sock.on('handshake-accepted', handshakeAccepted).on('handshake-failed', handshakeFailed);
	sock.on('action-buffer-in', actionBufferIn);
    sock.on('multi-buffer-in', multiBufferIn);
    sock.on('multi-chat-in', multiChatIn);
    sock.on('clear-in', clearIn);
    sock.on('chat-in', chatIn);
    sock.on('client-list-in', clientListIn);
    sock.on('room-expired', roomExpired);
    sock.on('background-in', backgroundIn)
    $('.status').html('Connecting...');
};

// Called when nickname/password submitted

function tryToJoin() {
    ajax('auth-room',{room:room, password: $('.password').val()},function(d) {
        if(JSON.parse(d)) {
            $('.auth-modal').hide();
            $('.canvas-modal').show();
            ready();
        } else {
            $('.join-button').css('opacity','0.5').html('Incorrect');
            setTimeout(function() {
                 $('.join-button').css('opacity','1').html('Join!');
            },2000);
        }
    });
}

// Called when connected to server
function connect() {
	handshake({room: room, password: $('.password').val(), nickname: $('.nickname').val() });
    $('.status').html('Authenticating...');
}

// Called when room has been idle longer than EXPIRE_TIME
function roomExpired() {
    $('.status').html('Session expired');
    $('.canvas-modal').html('Your session has expired! Refresh the page to start a new one.').fadeIn(200);
    $('.chat-button').hide();
    isConnected = false;
    window.location.hash = '';
}

// Called when client has been disconnected for any reason
function disconnect() {
    $('.status').html('Disconnected');
    isConnected = false;
    $('.chat-button').hide();
}

// Attempts to authenticate with the server
function handshake(obj) {
	sock.emit('handshake',obj);
}

// Called when the server accepts the handshake
function handshakeAccepted(data) {
	id = data.id;
	room = data.room;
    $('.canvas-modal').html('Disabling external intertial dampeners');
    $('.status').html('Loading...');
}

// Called if the server rejects the handshake
function handshakeFailed(reason) {
	$('.status').html('Handshake failed because: ' + reason);
    $('.canvas-modal').html('Unable to connect.')
}

$(function() {
	// Canvas setup
	canvas = $("canvas.canvas").get(0);
	ctx = canvas.getContext('2d');
    ctx.lineJoin = "round";
    // Set global variables for canvas size
	width = $(canvas).width();
	height = $(canvas).height();
    // Set up handlers for mouse/touch events
	$(canvas).on('mousemove',function(e) {
		var newMouse = {
			x: (e.pageX - $(e.target).offset().left) / $(e.target).width(),
			y: (e.pageY - $(e.target).offset().top) / $(e.target).height()
		};
		mouseTo(newMouse);
	}).on('mouseup touchend touchleave',function() {
		mouseDown = false;
	}).on('mousedown',function() {
		mouseDown = true;
	}).on('touchmove',function(e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        var newMouse = {
    		x: (touch.pageX - $(e.target).offset().left) / $(e.target).width(),
			y: (touch.pageY - $(e.target).offset().top) / $(e.target).height()
		};
		mouseTo(newMouse); 
        mouseDown = true;
	}).on('touchend',function() {
        mouseDown = false;
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        var newMouse = {
        	x: (touch.pageX - e.target.offsetLeft) / $(e.target).width(),
			y: (touch.pageY - e.target.offsetTop) / $(e.target).height()
		};
        mouseTo(newMouse);
	});
	// Client data setup
	clientData = {};
    // Buffer setup
    actionBuffer = [];
    setInterval(sendActionBuffer,BUFFER_INTERVAL);
    // Defaults setup
    setTimeout(function() {
        // Grab saved tool preferences
        color = localStorage.color || "#000";
        size = localStorage.size || 1;
        tool = localStorage.tool || 'pen';
        switch(tool) {
            case 'pen':
                $('.pen-button').click();
                break;
            case 'eraser':
                $('.eraser-button').click();
                break;
        }
        // We call setColor() with the value of color we just grabbed so it gets sent to the server
        setColor(color);
        $('.size-button[val='+size+']').click();
        $('.choose-color').css('background',color);
    },10);
});

// Called when the pointer has moved
function mouseTo(newMouse) {
    if(mouseDown) pushMouseUpdate(mouse,newMouse,mouseDown);
	mouse = newMouse;
}

// Adds a mouse update to the action buffer and draws it locally
function pushMouseUpdate(old,update,down) {
    //Draw locally
    var data = {old:old,update:update,down:down};
    drawBuffer(canvas,{
        id: 'me',
        tool: tool,
        color: color,
        size: size,
        buffer: [data]
    });
    // If there's already something in the actionBuffer, we don't need to send
    // data.old because drawBuffer() can use the last item as data.old
    if(actionBuffer.length > 0) {
        // We're not actually doing this
        // delete data.old;
    }
    actionBuffer.push(data);
}

// Sends any actions in the buffer to the server
function sendActionBuffer() {
    if(actionBuffer.length == 0) return;
    sock.emit(
        'action-buffer-out',
        {
            id: id,
            tool: tool,
            color: color,
            size: size,
            buffer: actionBuffer
        }
    );
    actionBuffer = [];
}

// Called when new actions are received from the server
function actionBufferIn(args) {
    if(args.id == id) return;
    drawBuffer(canvas,args);
}

// Called as soon as a connection is established.
// buffers is an array containing all the drawing data already on the canvas
function multiBufferIn(buffers) {
    isConnected = true;
    $('.canvas-modal').fadeOut(200);
    $('.chat-button').show();
    $('.status').html('Connected to '+roomName);
    for(var i=0; i< buffers.length; i++) {
        actionBufferIn(buffers[i]);
    }
}

// Clears the canvas
function clear() {
    if(!isConnected) return;
    if(confirm("Are you sure you want to clear the canvas?")) {
       sock.emit('clear-out',{});
    }
}

function clearIn() {
   canvas.getContext('2d').clearRect(0,0,width,height);
}


function usePen() {
    tool = 'pen';
    localStorage.tool = 'pen';
}

function useEraser() {
    tool = 'eraser';
    localStorage.tool = 'eraser';
}

// Sets pen size
function setSize(s) {
    size = s;
    localStorage.size = s;
}

// Sets pen color
function setColor(c) {
    color = c;
    localStorage.color = c;
    sock.emit('update-color',c);
}

// Draws an array of mouse update objects (a buffer) to the canvas
function drawBuffer(canvas,args) {
    var data,
        i,
        ctx = canvas.getContext('2d'),
        old;
    
    for(i=0;i<args.buffer.length;i++) {
        data = args.buffer[i];
        if(data.down) {
            old = data.old;
            if(!old) {
                if(args.buffer[i-1]) {
                    // No old data was sent, because the old mouse position is
                    // the updated position from the last element in buffer.
                    old = args.buffer[i-1].update
                } else {
                    // This shouldn't happen
                }
            }
            switch(args.tool) {
                case 'pen':
                    ctx.lineWidth = args.size;
                    ctx.strokeStyle = args.color;
                    break;
                case 'eraser':
                    ctx.lineWidth = 5 * args.size;
                    ctx.strokeStyle = '#FFF';
            }
            ctx.beginPath();
            ctx.moveTo(old.x * width,old.y * height);
            ctx.lineTo(data.update.x * width,data.update.y * height);
            ctx.stroke();
            ctx.closePath();
        }
    }
}

// Sends a chat message to the server
function sendChatMessage(m) {
    sock.emit('chat-out',{sender:id,message:m.slice(0,10000)});
}

// Called when someone sends a chat message
function chatIn(e) {
    // We hide, then show .chat-pane to prevent glitching
    $('.chat-pane').hide();
    var item = $("<div class='chat-item'></div>");
    $(item).html('<b>'+e.nickname+': </b>'+e.message);
    $('.chat-pane-inner').append(item);
    setTimeout(function() {
        // Fix chat scroll
        $('.chat-pane-inner').get(0).scrollTop = $('.chat-pane-inner').get(0).scrollHeight;
    },1);
    if(!chatOpen) {
        chatUnread++;
        flashChat();
    }
    $('.chat-pane').show();
}

// Called when connection is established to fill chat logs
function multiChatIn(chats) {
    for(var i=0;i<chats.length;i++) {
        chatIn(chats[i]);
    }
}

// Called when client list is updated
function clientListIn(list) {
    var items = [],
        item;
    for(item in list) {
        items.push(list[item]);
    }
    $('.client-list').html('');
    items.forEach(function(li) {
       var listItem = $("<div class='client-list-item'></div>");
       $(listItem).html(li.nickname).css('border-left-color',li.color || '#000');
       $('.client-list').append(listItem);
    });
}

// Makes an ajax request
function ajax(method,data,callback) {
    data.method = method;
    $.post('/ajax',data,function(d,r,o) {
        if(callback) callback(o.responseText);
    });
}

// Chooses the URL for a background
function askForBackground() {
    if(!isConnected) return;
    if(!backgroundURL || backgroundURL.charAt(0) == '#') {
        var url = prompt('Enter the URL for your background:');
        var img = new Image();
        img.onload = function() {
            pushBackground("url('"+url+"')");  
        };
        img.onerror = function() {
            alert("That doesn't seem to be a valid URL!");  
        };
        img.src = url;
    } else {
        // Ask to clear the background
        if(confirm('Are you sure you want to reset the background?')) {
            pushBackground('#FFF');
        }
    }
}

// Pushes a new background to the server
function pushBackground(url) {
    sock.emit('background-out',{url:url});
}

// Called when a new background is pushed from the server
function backgroundIn(d) {
    console.log('bkgIn',d);
    if(!d || !d.url) return;
    backgroundURL = d.url;
    $('.canvas').css('background',backgroundURL);
    if(backgroundURL.charAt(0) == '#') {
        $('.background-button').removeClass('button-pushed');
    } else {
        $('.background-button').addClass('button-pushed');
    }
}

