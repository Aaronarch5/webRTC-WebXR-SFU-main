import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.117.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/XRControllerModelFactory.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/ARButton.js';

// Variables for cube position
let isSqueezing = false;
let grabbedObject = null; // Variable to store the grabbed object (cube)
let offset = new THREE.Vector3(); // To track offset between controller and object
let currentGrip = null; // Store the current controller grip being used
// Variables for cube position and tracking
let controllerGrip=null;
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
    controller1.addEventListener('squeezestart', (event) => onSqueezeStart(event, 'left'));
    controller1.addEventListener('squeezeend', (event) => onSqueezeEnd(event, 'left'));
    scene.add(controller1);

    controller2.addEventListener('selectstart', (event) => onSelectStart(event, 'right'));
    controller2.addEventListener('selectend', (event) => onSelectEnd(event, 'right'));
    controller2.addEventListener('squeezestart', (event) => onSqueezeStart(event, 'right'));
    controller2.addEventListener('squeezeend', (event) => onSqueezeEnd(event, 'right'));
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);


    function handleGamepadInput(controller, hand) {
        console.log(controller);
        const inputSource = controller.inputSource;


        if (inputSource && inputSource.gamepad) {
          const gamepad = inputSource.gamepad;
      
          // Check joystick axes (usually on index 0 and 1)
          const joystickX = gamepad.axes[0];  // Left/Right
          const joystickY = gamepad.axes[1];  // Up/Down
          console.log(`${hand} joystick - X: ${joystickX}, Y: ${joystickY}`);
      
          // Check buttons (X/Y and other buttons can be indexed based on the gamepad spec)
          const xButton = gamepad.buttons[3];  // X button
          const yButton = gamepad.buttons[4];  // Y button
      
          if (xButton.pressed) {
            console.log(`${hand} X button pressed`);
            // Handle X button press logic
          }
          if (yButton.pressed) {
            console.log(`${hand} Y button pressed`);
            // Handle Y button press logic
          }
        }
      }
      
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

    function conjugateQuaternion(quaternion) {
        return new THREE.Quaternion(
            -quaternion.x,  // Negate x
            -quaternion.y,  // Negate y
            -quaternion.z,  // Negate z
             quaternion.w   // Keep w the same
        );
    }

    function onSqueezeStart(controllerGrip,hand) {

        let visorRotation = new THREE.Quaternion();

        // Get the camera's current rotation
        visorRotation.copy(camera.quaternion);
        
        // Manually conjugate the quaternion to face the cube towards the camera
        let invertedRotation = conjugateQuaternion(visorRotation);
        
        // Apply the inverted rotation to the cube
        cube.quaternion.copy(invertedRotation);
        

        console.log("Squeeze started");
        // Extract the position from the controller's matrixWorld
        let controller1Position = new THREE.Vector3();
        let controller2Position = new THREE.Vector3();
               
        let cubeSqueezePosition = new THREE.Vector3();
        let controllerToCubeDist = new THREE.Vector3();
        let controlleToCubeDist2 = new THREE.Vector3();
        let cubeNewPos = new THREE.Vector3();

        controller1Position = controllerGrip1.position;
        controller2Position = controllerGrip2.position;
        cubeSqueezePosition = cube.position;
        controllerToCubeDist = controller1Position.distanceTo(cubeSqueezePosition);
       
        if (hand === 'left') {
            cubeNewPos.copy(controller1Position);
        } else if (hand === 'right') {
            cubeNewPos.copy(controller2Position);
        }

        cube.position.copy(cubeNewPos).add;
       // console.log(controller1Position);
        //console.log(controller2Position);
        //console.log(cubeSqueezePosition);
        //console.log(controllerToCubeDist);
        //console.log(cubeNewPos);        
    }

    function onSqueeze(controllerGrip){

    }
    
    function onSqueezeEnd(controllerGrip) {
        console.log("Squeeze ended");
        // Release the cube when the squeeze ends
        grabbedObject = null;
        currentGrip = null;
    }
   

    

    // Render the scene
    function animate() {
        renderer.setAnimationLoop(render);
    }


    function render(frame) {


        controls.update();  // Update controls
        renderer.render(scene, camera);

    }

    animate();
}