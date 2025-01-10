#include <WiFi.h>
#include <WebSocketsClient.h>

// Configuración de la red WiFi
const char* ssid = "Mecatronica-MGVC";         // Tu SSID
const char* password = "Mecatronica 2022";     // Tu contraseña

WebSocketsClient webSocket;               // Cliente WebSocket
const int ledPin = 2;                      // LED integrado en la placa

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("Conectado al servidor WebSocket.");
      webSocket.sendTXT("ESP32 conectada.");
      break;

    case WStype_DISCONNECTED:
      Serial.println("Desconectado del servidor WebSocket.");
      break;

    case WStype_TEXT:
      Serial.printf("Mensaje recibido: %s\n", payload);
      if (strstr((char *)payload, "Botón A") != NULL) {
        Serial.println("Acción: Botón A presionado.");
        digitalWrite(ledPin, HIGH);
        delay(500);
        digitalWrite(ledPin, LOW);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);

  // Conexión a la red WiFi
  Serial.println("Conectando a WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado.");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Conexión al servidor WebSocket (puerto sin encriptación WS)
  webSocket.begin("192.168.0.182", 8080, "/"); // Cambia a 8080 para usar WS
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
}
