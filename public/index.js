let currentStream = null;  // Track the current media stream

// This function initializes the video stream and sets up the WebRTC peer connection
async function init(deviceId = null) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());  // Stop the existing stream
    }
    
    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true
    };
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;  // Store the current stream
        document.getElementById("video").srcObject = stream;
        const peer = createPeer();
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
}

// This function creates and returns a new RTCPeerConnection object
function createPeer() {
    const peer = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.stunprotocol.org" },
            { urls: "stun:stun.l.google.com:19302" },
            { urls:"stun:stun.relay.metered.ca:80"},
            {   urls:"turn:global.relay.metered.ca:80",
                username:"a983dce89aeea887f64b69b7",
                credential:"Y5NP897GSYJxs6RV"},
            {
                urls:"turn:global.relay.metered.ca:80?transport=tcp",
                username:"a983dce89aeea887f64b69b7",
                credential:"Y5NP897GSYJxs6RV"},
            {
                urls:"turn:global.relay.metered.ca:443",
                username:"a983dce89aeea887f64b69b7",
                credential:"Y5NP897GSYJxs6RV"},
            {urls:"turns:global.relay.metered.ca:443?transport=tcp",
                username:"a983dce89aeea887f64b69b7",
                credential:"Y5NP897GSYJxs6RV"},
            {
                urls: "turn:aaronarch1.metered.live",  // URL del servidor TURN
                username: "a983dce89aeea887f64b69b7",  // Tu nombre de usuario del servidor TURN
                credential: "Y5NP897GSYJxs6RV"  // Tu contraseña del servidor TURN
            }

            
        ]
    });
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);
    peer.onicecandidate = handleICECandidateEvent;
    peer.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    return peer;
}

// This function handles the negotiation needed event for the WebRTC connection
async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const payload = {
            sdp: peer.localDescription
        };

        const { data } = await axios.post('/broadcast', payload);
        const desc = new RTCSessionDescription(data.sdp);
        await peer.setRemoteDescription(desc);
    } catch (error) {
        console.error('Error during negotiation.', error);
        setTimeout(() => {
            handleNegotiationNeededEvent(peer);  // Retry if negotiation fails
        }, 1000);  // Adjust the retry interval as needed
    }
}

// This function handles ICE candidate events
function handleICECandidateEvent(event) {
    if (event.candidate) {
        const payload = {
            candidate: event.candidate
        };
        axios.post('/ice-candidate', payload).catch(console.error);
    }
}

// This function monitors the ICE connection state
function handleICEConnectionStateChangeEvent(event) {
    const peer = event.target;
    if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'closed') {
        console.error('ICE connection failed or disconnected.');
        // Implement reconnection logic or notify the user
    }
}

// This function toggles the visibility of the instructions
function toggleInstructions() {
    const instructions = document.getElementById('instructions');
    if (instructions.style.display === 'none' || instructions.style.display === '') {
        instructions.style.display = 'block';
    } else {
        instructions.style.display = 'none';
    }
}

// This function populates the camera selection dropdown with available devices
async function populateCameraOptions() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const cameraSelect = document.getElementById('camera-select');
    
    videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${cameraSelect.length + 1}`;
        cameraSelect.appendChild(option);
    });

    // Automatically select the first camera if available
    if (videoDevices.length > 0) {
        init(videoDevices[0].deviceId);
    }
}

// This code runs when the window loads
window.onload = () => {
    // Populate camera options
    populateCameraOptions();

    // Attach event listener to the "Start Streaming" button
    document.getElementById('my-button').onclick = () => {
        const cameraSelect = document.getElementById('camera-select');
        const deviceId = cameraSelect.value;
        init(deviceId);
    };

    // Attach event listener to the "Show/Hide Instructions" button
    document.getElementById('toggle-instructions').onclick = () => {
        toggleInstructions();
    };
};

