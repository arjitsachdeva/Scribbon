exports.handler = function(method,data,rooms) {
    var res;
    switch(method) {
        case 'room-info':
            if(rooms.list[data.room]) {
                res = rooms.list[data.room];
                return {
                    name: res.name,
                    password: res.password != ''
                }
            } else {
                return {error: 'room-nonexistent'};
            }
        case 'create-room':
            res = rooms.create(data.name,data.password);
            return res.id;
        case 'auth-room':
            if(rooms.list[data.room]) {
                return ['',data.password].indexOf(rooms.list[data.room].password) != -1;
            } else {
                return false;
            }
    }
    return {error: 'no-method'};
};