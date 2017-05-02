var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


var Mopidy = require('mopidy');
var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/"
});


app.use("/", express.static(__dirname + "/"));

//Quand une personne se connecte au serveur
io.sockets.on('connection', function (socket) {
    socket.emit('faitUneAlerte');
    socket.emit('faitUneAlerte2', 'Je suis fou');
});


http.listen(8080);
console.log('Server running on port 8080');
