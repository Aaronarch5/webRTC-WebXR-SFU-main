void setup() {
  // Inicializamos el puerto serie a 9600 baudios
  Serial.begin(115200);
  while (!Serial) {
    // Esperamos a que se establezca la conexión con el puerto serie
  }
  Serial.println("Arduino listo para leer datos del puerto serie.");
}

void loop() {
  // Verificamos si hay datos disponibles en el puerto serie
  if (Serial.available() > 0) {
    // Leemos el dato recibido
    String inputData = Serial.readStringUntil('\n'); // Lee hasta encontrar un salto de línea
    // Mostramos el dato recibido
    Serial.print("Dato recibido: ");
    Serial.println(inputData);
  }
}
