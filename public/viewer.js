import { WebXRButton } from './js/util/webxr-button.js';
import { Scene } from './js/render/scenes/scene.js';
import { Renderer, createWebGLContext } from './js/render/core/renderer.js';
import { Node } from './js/render/core/node.js';
import { Gltf2Node } from './js/render/nodes/gltf2.js';
import { SkyboxNode } from './js/render/nodes/skybox.js';
import { BoxBuilder } from './js/render/geometry/box-builder.js';
import { PbrMaterial } from './js/render/materials/pbr.js';
import { mat4, vec3, quat } from './js/render/math/gl-matrix.js';
import { InlineViewerHelper } from './js/util/inline-viewer-helper.js';
import { QueryArgs } from './js/util/query-args.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.117.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/XRControllerModelFactory.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/webxr/ARButton.js';

// Variables para posición del cubo
let isSqueezing = false;
let grabbedObject = null; // Variable para el objeto agarrado (cubo)
let offset = new THREE.Vector3(); // Para rastrear el desplazamiento entre controlador y objeto
let currentGrip = null; // Almacena el grip del controlador actual
let controllerGrip = null; // Rastrea el grip del controlador
let cube; // Cubo definido globalmente

let websocket; // Variable para WebSocket

window.onload = () => {
    // Inicializar WebSocket
    websocket = new WebSocket('wss://192.168.0.167:433'); // Cambiar localhost por 192.168.0.167
    websocket.onopen = () => console.log('WebSocket conectado al servidor.');
    websocket.onclose = () => console.log('WebSocket desconectado.');
    websocket.onerror = (err) => console.error('WebSocket error:', err);

    // Funcionalidad existente
    document.getElementById('my-button').onclick = () => {
        init();
    };
};

async function init() {
    const peer = createPeer();
    peer.addTransceiver('video', { direction: 'recvonly' });
    const element = document.getElementById('video');
    element.style.display = 'none';
}

function createPeer() {
    const peer = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.stunprotocol.org' },
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.relay.metered.ca:80' },
            {
                urls: 'turn:global.relay.metered.ca:80',
                username: 'a983dce89aeea887f64b69b7',
                credential: 'Y5NP897GSYJxs6RV',
            },
        ],
    });
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription,
    };

    const { data } = await axios.post('/consumer', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch((e) => console.log(e));
}

function handleTrackEvent(e) {
    const video = document.getElementById('video');
    video.srcObject = e.streams[0];

    video.onloadedmetadata = () => {
        createSceneWithVideoTexture(video);
    };
}

function createSceneWithVideoTexture(video) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const arButton = ARButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor'] });
    document.body.appendChild(arButton);

    const videoTexture = new THREE.VideoTexture(video);
    const frontMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
    const otherMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const materials = [
        otherMaterial,
        otherMaterial,
        otherMaterial,
        otherMaterial,
        frontMaterial,
        otherMaterial,
    ];

    const geometry = new THREE.BoxGeometry(4, 2, 0.1);
    cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cube.position.set(0, 0, -1.5);

    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    const session = renderer.xr.getSession();

    let scale = 1.0;
    const scaleFactor = 0.1;

    controller1.addEventListener('selectstart', () => {
        scale += scaleFactor;
        if (scale < 0.1) scale = 0.1;
        cube.scale.set(scale, scale, scale);
    });

    controller2.addEventListener('selectstart', () => {
        scale -= scaleFactor;
        if (scale < 0.1) scale = 0.1;
        cube.scale.set(scale, scale, scale);
    });


    controller1.addEventListener('squeezestart', (event) => onSqueezeStart(event, 'left'));
    controller1.addEventListener('squeezeend', (event) => onSqueezeEnd(event, 'left'));
    controller2.addEventListener('squeezestart', (event) => onSqueezeStart(event, 'right'));
    controller2.addEventListener('squeezeend', (event) => onSqueezeEnd(event, 'right'));

  function onSqueezeStart(controllerGrip) {
        console.log("Squeeze started");
        // Extract the position from the controller's matrixWorld
        let controller1Position = new THREE.Vector3();
        let controller2Position = new THREE.Vector3();
        let cubeSqueezePosition = new THREE.Vector3();
        let controllerToCubeDist = new THREE.Vector3();
        let cubeNewPos = new THREE.Vector3();

        controller1Position = controllerGrip1.position;
        controller2Position = controllerGrip2.position;
        cubeSqueezePosition = cube.position;
        controllerToCubeDist = controller1Position.distanceTo(cubeSqueezePosition);
        cubeNewPos.copy(controller1Position);
        cube.position.copy(cubeNewPos).add;
        cubeNewPos.copy(controller2Position);
        cube.position.copy(cubeNewPos).add;
        


    }
function onSqueeze(controllerGrip){
                // Extract the position from the controller's matrixWorld
        let controller1Position = new THREE.Vector3();
        let cubeSqueezePosition = new THREE.Vector3();
        let cubeNewPos = new THREE.Vector3();

        controller1Position = controllerGrip1.position;
        cubeSqueezePosition = cube.position;
        controllerToCubeDist = controller1Position.distanceTo(cubeSqueezePosition);
        cubeNewPos.copy(controller1Position);

        cube.position.copy(cubeNewPos).add;
    }

    function onSqueezeEnd(controllerGrip) {
        console.log("Squeeze ended");
        // Release the cube when the squeeze ends
        grabbedObject = null;
        currentGrip = null;
    }

    const controllerModelFactory = new XRControllerModelFactory();
    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    function animate() {
        renderer.setAnimationLoop(render);
    }

    function render() {
        const session = renderer.xr.getSession();
        if (session) {
            for (const sourceXR of session.inputSources) {
                const botones = sourceXR.gamepad.buttons;
               // const joysticks = sourceXR.gamepad.axes;
                let joysticks = sourceXR.gamepad.axes;
                let XJRight = joysticks[2]; //-1.0 to 1.0 
                let YJRight = joysticks[3]; //-1.0 to 1.0
                let XJLeft = joysticks[2]; //-1.0 to 1.0 
                let YJLeft = joysticks[3]; //-1.0 to 1.0

                if (sourceXR.handedness === 'right') {
                    if (botones[4].pressed) {
                        const message = 'A'; //(controlador derecho) Botón A presionado
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    if (botones[5].pressed) {
                        const message = 'B';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                } else if (sourceXR.handedness === 'left') {
                    if (botones[4].pressed) {
                        const message = 'X'; //(controlador izquierdo)
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    if (botones[5].pressed) {
                        const message = 'Y';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                }
                    
                // Joysticks

                if (sourceXR.handedness === 'right') {  // Controlador derecho
                    if (XJRight>0.5){
                        const message = 'DDX';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    else if (XJRight<=-0.5){
                        const message = 'DIX';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }

                    if (YJRight<=-0.5){
                        const message = 'DAY'; //Joystick Y derecho arriba
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    else if (YJRight>0.5){
                        const message = 'DBY';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                } else if (sourceXR.handedness === 'left') {  // Controlador izquierdo
                    if (XJLeft>0.5){
                        const message = 'IDX';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    else if (XJLeft<=-0.5){
                        const message = 'IIX';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    

                    if (YJLeft<=-0.5){
                        const message = 'IAY';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                    else if (YJLeft>0.5){
                        const message = 'IBY';
                        console.log(message);
                        if (websocket.readyState === WebSocket.OPEN) websocket.send(message);
                    }
                }
               
        }
    }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}
