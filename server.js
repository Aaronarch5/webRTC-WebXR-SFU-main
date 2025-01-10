const express = require('express');
const dotenv = require('dotenv').config();
const https = require('https');
const http = require('http'); // Para el servidor HTTP adicional
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const webrtc = require('wrtc');

// Crear app Express
const app = express();
const port = process.env.PORT || 433;

// Servir archivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Leer certificados SSL
const options = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
};

// Configuración del puerto serial para la ESP32 y Arduino
const serialPort = new SerialPort({
    path: 'COM16', // Asegúrate de que sea el puerto correcto de la ESP32 o Arduino
    baudRate: 115200,
}, (err) => {
    if (err) {
        console.error('Error abriendo el puerto serie:', err.message);
    } else {
        console.log('Puerto serie abierto en COM16');
    }
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => {
    console.log('Mensaje recibido desde el puerto serial:', data);
    // Aquí también puedes enviar a través de WebSocket si lo necesitas
});

// Crear servidor HTTPS
const server = https.createServer(options, app);

// Crear servidor HTTP para WebSocket sin cifrar (WS)
const wsHttpServer = http.createServer(app);
const wsUnsecure = new WebSocket.Server({ server: wsHttpServer });

// Crear servidor WebSocket seguro (WSS)
const wss = new WebSocket.Server({ server });

// Configuración del servidor STUN/TURN
const iceServers = [
    { urls: 'stun:stun.stunprotocol.org' },
    { urls: 'stun:stun.l.google.com:19302' },
];

// Variable para almacenar la transmisión de video
let senderStream;

// Manejar conexiones WebSocket seguras (WSS)
wss.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket segura');

    ws.on('message', (message) => {
        console.log('Mensaje recibido del cliente:', message);

        // Verifica si el mensaje es un Buffer
        if (Buffer.isBuffer(message)) {
            // Convertir el Buffer a una cadena
            message = message.toString('utf-8');
            console.log('Mensaje convertido a cadena:', message);
        }

        if (serialPort && serialPort.isOpen) {
            // Enviar el mensaje al puerto serial (COM12) para que lo lea el Arduino
            serialPort.write(message + '\n', (err) => {
                if (err) {
                    console.error('Error enviando mensaje al puerto serial:', err.message);
                } else {
                    console.log('Mensaje enviado al puerto serial (COM13):', message);
                }
            });
        } else {
            console.error('El puerto serial no está abierto.');
        }
    });

    ws.on('close', () => {
        console.log('WebSocket desconectado');
    });
});

// Manejar conexiones WebSocket no seguras (WS)
wsUnsecure.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket no segura');

    ws.on('message', (message) => {
        console.log('Mensaje recibido del cliente (WS):', message);

        // Verifica si el mensaje es un Buffer
        if (Buffer.isBuffer(message)) {
            // Convertir el Buffer a una cadena
            message = message.toString('utf-8');
            console.log('Mensaje convertido a cadena:', message);
        }

        if (serialPort && serialPort.isOpen) {
            // Enviar el mensaje al puerto serial (COM12) para que lo lea el Arduino
            serialPort.write(message + '\n', (err) => {
                if (err) {
                    console.error('Error enviando mensaje al puerto serial:', err.message);
                } else {
                    console.log('Mensaje enviado al puerto serial (COM16):', message);
                }
            });
        } else {
            console.error('El puerto serial no está abierto.');
        }
    });

    ws.on('close', () => {
        console.log('WebSocket desconectado (no seguro)');
    });
});

// Ruta para manejar solicitudes POST a /consumer
app.post('/consumer', async (req, res) => {
    try {
        const peer = new webrtc.RTCPeerConnection({ iceServers });

        // Configurar la descripción remota
        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        // Agregar tracks al peer si el stream ya existe
        if (senderStream) {
            senderStream.getTracks().forEach((track) => peer.addTrack(track, senderStream));
        } else {
            console.error('El stream del transmisor aún no está inicializado.');
        }

        // Crear y enviar la respuesta al cliente
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        res.json({ sdp: peer.localDescription });
    } catch (error) {
        console.error('Error en el endpoint /consumer:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para manejar la transmisión desde el transmisor
app.post('/broadcast', async (req, res) => {
    try {
        const peer = new webrtc.RTCPeerConnection({ iceServers });

        // Manejar la recepción de tracks
        peer.ontrack = (e) => {
            senderStream = e.streams[0];
        };

        // Configurar la descripción remota
        const desc = new webrtc.RTCSessionDescription(req.body.sdp);
        await peer.setRemoteDescription(desc);

        // Crear y enviar la respuesta al cliente
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        res.json({ sdp: peer.localDescription });
    } catch (error) {
        console.error('Error en el endpoint /broadcast:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Iniciar servidor HTTPS
server.listen(port, () => {
    console.log(`Servidor HTTPS iniciado en https://localhost:${port}`);
});

// Iniciar servidor HTTP para WebSocket sin cifrar (WS)
wsHttpServer.listen(8080, () => {
    console.log('Servidor HTTP iniciado en http://localhost:8080 para WebSockets sin cifrar');
});