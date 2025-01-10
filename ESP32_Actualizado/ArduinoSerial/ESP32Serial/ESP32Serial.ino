#define RXD2 16  // Pin GPIO16 como RX para Serial2
#define TXD2 17  // Pin GPIO17 como TX para Serial2

void setup() {
  Serial.begin(115200);      // Puerto serial principal (USB) para depuración
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2);  // Configuración de Serial2
  delay(1000);
  Serial.println("ESP32 lista para recibir datos en Serial2.");
}

void loop() {
  // Leer datos desde Serial2
  if (Serial2.available()) {
    String data = Serial2.readString();  // Leer cadena completa desde Serial2
    Serial.print("Recibido en Serial2: ");
    Serial.println(data);               // Imprimir en el Monitor Serial
  }
}
