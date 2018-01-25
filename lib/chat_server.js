import { Socket } from 'dgram';
import { debug } from 'util';

const socketio = require('socket.io');
let io;
let guestNumber = 1;
let nickNames = {};
let namesUsed = [];
let currentRoom = {};

// 分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    let name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', { "success": true, "name": name });
    namesUsed.push(name);
    return guestNumber++;
};

// 进入聊天室
function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcast.to(room).emit('message', { text: nickNames[socket.id] + ' has joined' + room + '.' });
    let usersInRoom = io.socket.clients(room);
    if (usersInRoom.listen > 1) {
        let usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (let index in usersInRoom) {
            let userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', { text: usersInRoomSummary });
    }
}

// 更名请求
function handleNameChangeAttemps(socket, nickNames, namesUsed) {
    socket.on('nameAttemp', function (name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', { success: false, message: 'Named cannot begin with “Guest”.' });
        } else {
            if (namesUsed.indexOf(name) == -1) {
                let previousName = nickNames[socket.id];
                let previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', { success: true, name: name });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', { text: previousName + 'is now known as ' + name + '.' });
            } else {
                socket.emit('nameResult', { success: false, message: 'That name is already in use.' });
            }
        }
    });
}

// 发送聊天消息
function handleMessageBroadCasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', { text: nickNames[socket.id] + ': ' + message.text });
    });
}

// 用户断开连接
function handleClientDisconnection(socket) {
    socket.on('disconnection', function () {
        let nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

// 创建房间
function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

exports.listen = function (server) {
    io = socketio.listen(server);//启动socketio 允许他搭载在已有的HTTP服务器上
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket,'Lobby');
        handleMessageBroadCasting(socket,nickNames);
        handleNameChangeAttemps(socket,nickNames,namesUsed);
        handleRoomJoining(socket);
        socket.on('rooms',function(){});
    });
};