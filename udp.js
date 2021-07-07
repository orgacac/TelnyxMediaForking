/*const dgram = require('dgram');
const server = dgram.createSocket('udp4');
server.on('error', (err) => {
console.log(`server error:\n${err.stack}`);
server.close();
});
server.on('message', (msg, senderInfo) => {
console.log('Messages received '+ msg)
//server.send(msg,senderInfo.port,senderInfo.address,()=>{
server.send(msg,'9001','35.247.163.18',()=>{
console.log(`Message sent to ${senderInfo.address}:${senderInfo.port}`)
})
});
server.on('listening', () => {
const address = server.address();
console.log(`server listening on ${address.address}:${address.port}`);
});
server.bind(9001);*/

var udp = require('dgram');

// --------------------creating a udp server --------------------

// creating a udp server
var server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});

// emits on new datagram msg
server.on('message', function (msg, info) {
    console.log('Data received from client : ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

    server.send(msg, info.port, '35.247.163.18', function (error) {
        if (error) {
            client.close();
        } else {
            console.log('Data sent !!!');
        }
    });
});

//emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

server.bind(9001);
