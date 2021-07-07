// ================================================ Dependencies =======================================================

require("dotenv").config();
const express = require("express");
const speech = require("@google-cloud/speech");
const udp = require("datagram-stream");
// =============================================== Telnyx Account Details ==============================================
const telnyx = require("telnyx")(process.env.TELNYX_API_KEY);

const forkIP = process.env.IP_ADDRESS;
const forkPort = process.env.FORK_PORT;
// ================================================ RESTful API Creation ================================================
const rest = express();
rest.use(express.json());

//i======================================== UDP SERVER ===================
var udpServer = require('dgram');
// --------------------creating a udp server --------------------
// creating a udp server
var server = udpServer.createSocket('udp4');
// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});
// emits on new datagram msg
server.on('message', function (msg, info) {
    //console.log('Data received from client : ' + msg.toString());
   // console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
/*   server.send(msg, info.port, '35.247.163.18', function (error) {
        if (error) {
            client.close();
        } else {
            console.log('Data sent !!!');
        }
    });*/
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
server.bind(9001)



// ================================================ Auxillary Functions ================================================
const toBase64 = (data) => new Buffer.from(data).toString("base64");
const fromBase64 = (data) => new Buffer.from(data, "base64").toString();

// ================================================ GoogleAPI  ================================================

// Creates a client
const client = new speech.SpeechClient();
const encoding = "MULAW";
const sampleRateHertz = 8000;
const languageCode = "en-US";

const request = {
	config: {
		encoding: encoding,
		sampleRateHertz: sampleRateHertz,
		languageCode: languageCode,
	},
	interimResults: true, // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = client
	.streamingRecognize(request)
	.on("error", console.error)
	.on("data", (data) =>
		/*process.stdout.write(
			data.results[0] && data.results[0].alternatives[0]
				? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
				: "\n\nReached transcription time limit, press Ctrl+C\n"
		)*/

		console.log(data.results[0].alternatives[0].transcript)
	);

//===================================== UDP SERVER END ===============
// ================================================ UDP Listener Creation =============================================
//const udp = require("datagram-stream");
//const udp = require('dgram');
/*var udp = require('dgram');
var udpclient = udp.createSocket('udp4');

udpclient.on('listening', function () {
    var address = '35.247.163.18';
    var port = 9001;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server ip :' + ipaddr);
});

udpclient.on('message', (msg, senderInfo) => {
console.log('Messages received '+ msg)
});
*/
var udpc = require('dgram');

var buffer = require('buffer');

// creating a client socket
var udpclient = udpc.createSocket('udp4');
//emits when socket is ready and listening for datagram msgs
udpclient.on('listening', function () {
    var address = '35.247.163.18';
    var port = 9001;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server ip :' + ipaddr);
});


udpclient.on('message', function (msg, info) {
    console.log('Data received from server : ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port); 
    recognizeStream.write(msg);
    console.log('Write to Stream completed');
});

//buffer msg
var data = Buffer.from('Raman Saini');
udpclient.send(data, 9001, '35.247.163.18', function (error) {
    if (error) {
        client.close();
    } else {
        console.log('Data sent !!!');
    }
});

// ================================================ UDP Listener Config =============================================

const stream = udp({
	//address: "0.0.0.0", //address to bind to
	address: "35.247.163.18", //address to bind to
	//broadcast: '255.255.255.255',
	//port: forkPort, //udp port to send to
	port: 9001, //udp port to send to
	bindingPort: 9001, //udp port to listen on. Default: port
	reuseAddr: true, //boolean: allow multiple processes to bind to the
	//         same address and port. Default: true
	loopback: false, //boolean: whether or not to receive sent datagrams
	//         on the loopback device. Only applies to
	//         multicast. Default: false
});

//pipe whatever is received to Google Cloud
stream.pipe(recognizeStream);


// ================================================ TELNYX COMMANDS API  ================================================
// Fork Media 
const handleForkMedia = async (call, event) => {
	try {
		console.log("FORK")
		console.log("forkip:" + forkIP + "forkport:" + forkPort);
		call.fork_start({
			rx: `udp:${forkIP}:${forkPort}`,
			tx: `udp:${forkIP}:${forkPort}`,
		});

	} catch (error) {
		if (error) {
			console.error(`HandleFork - ${error}`);
		}
	}
};

const handleAnswer = async (call, event) => {
	try {
		call.answer();
	} catch (error) {
		if (error) {
			console.error(`HandleAnswer - ${error}`);
		}
	}
};

// ================================================    WEBHOOK API IVR   ================================================

rest.post(`/call-flow`, async (req, res) => {
	try {
		res.sendStatus(200);
		const event = req.body;
		console.log(event.event_type);
		const context = event.payload.client_state
			? fromBase64(event.payload.client_state)
			: "";
		const call = new telnyx.Call({
			call_control_id: event.payload.call_control_id,
		});

		switch (event.event_type) {
			case "call_initiated":
				handleAnswer(call, event);
				break;
			case "call_answered":
				handleForkMedia(call, event);

				break;
			case "call_playback_ended":
				break;
			case "call_hangup":
				break;
			default:
				break;
		}
	} catch (error) {
		if (error) {
			console.error(error);
		}
	}
});

// ================================================ RESTful Server Start ================================================

const PORT = 8000;
rest.listen(PORT, () => {
	console.log(`SERVER -  app listening at http://localhost:${PORT}/`);
});
