var MODULES_PATH = './node_modules/';

// Load some libraries;
var qs = require('querystring');

// Load ajax request function from ajax.js
var handleAjaxRequest = require('./ajax.js').handler;

// Set up static server
var stc = require('node-static');
var file = new(stc.Server)('./public',{cache:0});
var server = require('http').createServer(function (request, response) {
    // When a request is received, write request content to body
    var body = '';
    request.on('data', function(chunk) {
        body += chunk;   
        if(body.length > 1024 * 1024) {
            request.connection.destroy();   
        }
    });
    // Called when the request is complete, we can now handle body
    request.on('end', function () {
        if(rooms.list[request.url.slice(1)]) {
            file.serveFile('/canvas.html',200,{},request,response);
        } else if(request.url == '/debug') {
            response.write(JSON.stringify(rooms));
            response.end();
        } else if(request.url.slice(0,5) == '/ajax') {
            // It's an ajax request
            try {
                // Hand it off to ajax.js
                body = qs.parse(body);
                response.write(JSON.stringify(handleAjaxRequest(body.method,body,rooms)));
            } catch(e) {
                response.write(JSON.stringify({
                    'error': e.toString()
                }));
            }
            response.end();
        } else {
            // Nope, just a request for a static file
            file.serve(request, response);
        }
    });
}).listen(process.env.PORT);

// Set up socket server
var io = require('socket.io').listen(server);

var rooms = {
    create: function(name,password) {
        var id = (function() {
                var tryID;
                do {
                    tryID = randomID(5);
                } while(rooms.list[tryID]);
                return tryID;
            }).call();
        var me = {
            id: id,
            buffers: [],
            chat: [],
            name: name,
            background: '#FFF',
            clients: {},
            password: password,
            getSockets: function() {
                return io.sockets.in(id);
            },
            latest: new Date().valueOf()
    	};
        rooms.list[id] = me;
        return me;
    },
    get: function(id) {
        return rooms.list[id];
    },
    list: {}
};

// Expire time (ms) should be 1 hour after last activity.
var EXPIRE_TIME = 1000 * 60 * 60;

// Remove unnecessary logs from output
io.set('log level',1);

// Socket connection handler
io.sockets.on('connection', function(sock)
{
    var roomID; // Socket's room ID
    
    // Returns a reference to the room that sock is in
    function getRoom() {
        return rooms.get(roomID);
    }
    
    // Update the list of clients (setTimeout in handshake handler)
    function pushClients() {
        sock.emit('client-list-in',getRoom().clients);
    }

    // Called when client sends authentication information
	sock.on('handshake', function(obj)
	{
		var test = testHandshake(sock,obj);
		if(test === true) {
            // Client is OK to join
			roomID = obj.room;
			sock.join(obj.room);
            // Tell client that they're connected
			sock.emit('handshake-accepted',{id: sock.id, room: roomID});
            // Send them chat logs and current canvas
            sock.emit('multi-buffer-in',getRoom().buffers);
            sock.emit('multi-chat-in',getRoom().chat);
            sock.emit('background-in',{url:getRoom().background});
            // Send them the client list and update it every five seconds
            setInterval(pushClients,5000);
            pushClients();
            // Add the client to the room's list
            getRoom().clients[sock.id] = {id: sock.id, nickname: obj.nickname};
		} else {
            // Something has gone terribly wrong!
			sock.emit('handshake-failed',test);
		}
	});
    
    // Called when a client unloads, could be a refresh or a browser close
    sock.on('disconnect', function(obj) {
        console.log('Client has unloaded');
        if(getRoom() && getRoom().clients[sock.id]) delete getRoom().clients[sock.id]; 
    });
    
    // Called when a client updates their color
    sock.on('update-color',function(color) {
        getRoom().clients[sock.id].color = color;
    });
	
    // Called when a client draws something
	sock.on('action-buffer-out', function(data) {
        getRoom().buffers.push(data);
		getRoom().getSockets().emit('action-buffer-in',data);
        getRoom().latest = new Date().valueOf();
	});
    
    // Called when a client clears the canvas
    sock.on('clear-out', function() {
        getRoom().buffers = [];
        getRoom().getSockets().emit('clear-in',{});
    });
    
    // Called when a client says something in chat
    sock.on('chat-out', function(d) {
        d.nickname = getRoom().clients[sock.id].nickname;
        getRoom().chat.push(d);
        getRoom().getSockets().emit('chat-in',d);
    });

    // Called when a client disconnects
    sock.on('disconnect', function(obj) {
        console.log('Client has disconnected');
        if(getRoom() && getRoom().clients[sock.id]) delete getRoom().clients[sock.id]; 
    });
    
    // Called when a client changes the background URL
    sock.on('background-out', function(obj) {
        getRoom().background = obj.url;
        getRoom().getSockets().emit('background-in',obj);
    })
});

// Test to see if a client has authenticated successfully
function testHandshake(sock,obj) {
    if(!obj.room || obj.room.length == 0) {
        // No room was specified
		return 'NO_ROOM_SPECIFIED';
	}
    if(!rooms.get(obj.room)) {
        return 'ROOM_NONEXISTENT';
    }
    if(rooms.get(obj.room).password && rooms.get(obj.room).password.length > 0 && rooms.get(obj.room).password != obj.password) {
        return 'WRONG_PASSWORD';   
    }
	return true;
}

// Checks every second to see if there are rooms
// that have been idle longer than EXPIRE_TIME
setInterval(function() {
    for(var room in rooms.list) {
        if(!rooms.list[room]) continue; // This shouldn't happen
        if(Math.abs(new Date().valueOf() - rooms.list[room].latest) > EXPIRE_TIME) {
            rooms.list[room].getSockets().emit('room-expired',{});
            setTimeout(function() {
                delete rooms.list[room];
            },10000);
        }
    }
},1000);

// Creates a random identifier
function randomID(len) {
    var text = "",
        possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        i;
    for(i=0;i<len;i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}