require("dotenv").config();
const express = require('express')
const app = express()
const server = require('http').createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: server });
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
const port = 3000;
wss.on('connection', function connection(ws) {
    console.log('A new client Connected!');
    ws.send('Welcome New Client!');
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});
app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/call', async (request, response) => {
    const to_number = "+917889183393";

    try {
        const { data: call } = await telnyx.calls.create({ connection_id: process.env.TELNYX_CONNECTION_ID, to: to_number, from: process.env.TELNYX_NUMBER });
        response.send('Hello World!')
    } catch (e) {
        console.log(e, e.stack.split("\n"));
        response.send(e);
    }
})
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})