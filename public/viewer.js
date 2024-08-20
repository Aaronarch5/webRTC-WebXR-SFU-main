import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.117.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/XRControllerModelFactory.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/ARButton.js';

window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init();
    };
}

async function init() {
    const peer = createPeer();
    peer.addTransceiver("video", { direction: "recvonly" });
    var element = document.getElementById("video");
    element.style.display = "none";
}

function createPeer() {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    const { data } = await axios.post('/consumer', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}

function handleTrackEvent(e) {
    const video = document.getElementById("video");
    video.srcObject = e.streams[0];

    video.onloadedmetadata = () => {
        createSceneWithVideoTexture(video);
    };
}

function createSceneWithVideoTexture(video) {
    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Enable WebXR
    document.body.appendChild(renderer.domElement);

    // Create custom ARButton
    const arButton = ARButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor'] });
    document.body.appendChild(arButton);

    // Apply custom styles to the ARButton
    const arButtonStyle = document.createElement('style');
    arButtonStyle.innerHTML = `
        #ARButton {
            position: absolute;
            top: 20px;
            left: 20px;
            padding: 10px 20px;
            background: #000000;
            color: #ffffff;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }
        #ARButton:hover {
            background: #333333;
        }
        #ARButton:active {
            background: #555555;
        }
    `;
    document.head.appendChild(arButtonStyle);

    // Create a video texture from the video element
    const videoTexture = new THREE.VideoTexture(video);

    // Create a material for the front face using the video texture
    const frontMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });

    // Create materials for the other faces
    const otherMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // Create an array of materials for each face of the cube
    const materials = [
        otherMaterial, // right face
        otherMaterial, // left face
        otherMaterial, // top face
        otherMaterial, // bottom face
        frontMaterial, // front face (video texture)
        otherMaterial  // back face
    ];

    // Create a cube geometry and apply the materials
    let geometry = new THREE.BoxGeometry(4, 2, 0.1);
    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cube.position.set(0, 0, -1.5);

    // Position the camera
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    // Set up OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;  // Allow zooming
    controls.enablePan = false;  // Disable panning

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Setup WebXR controllers
    const controller1 = renderer.xr.getController(0); // Left controller
    const controller2 = renderer.xr.getController(1); // Right controller

    let scale = 1.0;
    const scaleFactor = 0.1; // Amount of scaling per trigger press

    controller1.addEventListener('selectstart', (event) => onSelectStart(event, 'left'));
    controller1.addEventListener('selectend', (event) => onSelectEnd(event, 'left'));
    scene.add(controller1);

    controller2.addEventListener('selectstart', (event) => onSelectStart(event, 'right'));
    controller2.addEventListener('selectend', (event) => onSelectEnd(event, 'right'));
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    function onSelectStart(event, hand) {
        // Start scaling on trigger press
        if (hand === 'left') {
            scale += scaleFactor;
        } else if (hand === 'right') {
            scale -= scaleFactor;
        }
        if (scale < 0.1) scale = 0.1; // Prevent scale from going negative or zero
        cube.scale.set(scale, scale, scale); // Apply scaling
    }

    function onSelectEnd(event, hand) {
        // Optionally handle the end of the trigger press
    }

    // Render the scene
    function animate() {
        renderer.setAnimationLoop(render);
    }

    function render() {
        controls.update();  // Update controls
        renderer.render(scene, camera);
    }

    animate();
}
