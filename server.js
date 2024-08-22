const express = require('express');
const dotenv = require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const webrtc = require('wrtc');

// Initialize the senderStream variable
let senderStream;

// Create Express app
const app = express();
const port = process.env.PORT || 433;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// STUN server configuration
const iceServers = [
    { urls: 'stun:stun.stunprotocol.org' } // STUN server
];

// Route to handle consumer connections
app.post('/consumer', async (req, res) => {
    try {
        const peer = new webrtc.RTCPeerConnection({ iceServers });

        // Set remote description
        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        // Add sender stream tracks if available
        if (senderStream) {
            senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
        } else {
            console.error('Sender stream not initialized.');
        }

        // Create and set local description
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        res.json({ sdp: peer.localDescription });
    } catch (error) {
        console.error('Error in /consumer:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle broadcast connections
app.post('/broadcast', async (req, res) => {
    try {
        const peer = new webrtc.RTCPeerConnection({ iceServers });

        // Handle incoming tracks
        peer.ontrack = (e) => handleTrackEvent(e);

        // Set remote description
        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        // Create and set local description
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        res.json({ sdp: peer.localDescription });
    } catch (error) {
        console.error('Error in /broadcast:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to handle incoming tracks
function handleTrackEvent(e) {
    senderStream = e.streams[0];
}

// Read SSL certificate and key files
const options = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
};

// Create HTTPS server
const server = https.createServer(options, app);

// Start the server
server.listen(port, () => {
    console.log(`Server started on https://localhost:${port}`);
});
