// ================================================ env example =======================================================
// TELNYX_API_KEY=API-KEY
// CONNECTION_ID=111111111
// GOOGLE_APPLICATION_CREDENTIALS="/Users/telnyx/creds.json"
// IP_ADDRESS=x.x.x.x
// FforkPort ORK_PORT=9000

TELNYX_API_KEY="KEY0178F60AFAEEE22E912931490F0F1C5A_D8i9aqVu0qj3zfHWUXuveJ"
CONNECTION_ID=1619962744679695607
GOOGLE_APPLICATION_CREDENTIALS="/home/orgacac/develop/twilioStreamInterface/upheld-setting-293615-5106604f6585.json"
IP_ADDRESS="35.247.163.18"
FORK_PORT=9000


// ================================================ Dependencies =======================================================

require("dotenv").config();
const express = require("express");
const speech = require("@google-cloud/speech");

// =============================================== Telnyx Account Details ==============================================
const telnyx = require("telnyx")(TELNYX_API_KEY);

const forkIP = "35.247.163.18";
const forkPort = 9000;
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
	address: "35.247.163.18", //address to bind to
	port: 9000, //udp port to send to
	bindingPort: 9000, //udp port to listen on. Default: port
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

rest.post('/outbound', async (request, response) => {
  const to_number = request.body.to_number;

  try {
    const { data: call } = await telnyx.calls.create({ connection_id: process.env.TELNYX_CONNECTION_ID, to: to_number, from: process.env.TELNYX_NUMBER });
    response.render('messagesuccess');
  } catch (e) {
    response.send(e);
  }
});

rest.post(`/call-flow`, async (req, res) => {
	try {
		res.sendStatus(200);
		const event = req.body.data;
		console.log(event.event_type);
		const context = event.payload.client_state
			? fromBase64(event.payload.client_state)
			: "";
		const call = new telnyx.Call({
			call_control_id: event.payload.call_control_id,
		});
			
		switch (event.event_type) {
			case "call.initiated":
				handleAnswer(call, event);
				break;
			case "call.answered":
				handleForkMedia(call, event);

				break;
			case "call.playback.ended":
				break;
			case "call.hangup":
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
