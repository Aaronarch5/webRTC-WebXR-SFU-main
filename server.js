const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const webrtc = require('wrtc');
const https = require('https')
// Initialize the senderStream variable
let senderStream;

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

        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        if (senderStream) {
            senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
        } else {
            console.error('Sender stream not initialized.');
        }

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

        peer.ontrack = (e) => handleTrackEvent(e, peer);

        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        res.json({ sdp: peer.localDescription });
    } catch (error) {
        console.error('Error in /broadcast:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to handle incoming tracks
function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
