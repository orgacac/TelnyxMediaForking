// ================================================ Dependencies =======================================================

require("dotenv").config();
const express = require("express");
const speech = require("@google-cloud/speech");

// =============================================== Telnyx Account Details ==============================================
const telnyx = require("telnyx")(process.env.TELNYX_API_KEY);

const forkIP = process.env.IP_ADDRESS;
const forkPort = process.env.FORK_PORT;
// ================================================ RESTful API Creation ================================================
const rest = express();
rest.use(express.json());
// ================================================ UDP Listener Creation =============================================
const udp = require("datagram-stream");
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
		process.stdout.write(
			data.results[0] && data.results[0].alternatives[0]
				? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
				: "\n\nReached transcription time limit, press Ctrl+C\n"
		)
	);

// ================================================ UDP Listener Config =============================================

const stream = udp({
	address: forkIP, //address to bind to
	broadcast: '255.255.255.255',
	port: forkPort, //udp port to send to
	bindingPort: forkPort, //udp port to listen on. Default: port
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
