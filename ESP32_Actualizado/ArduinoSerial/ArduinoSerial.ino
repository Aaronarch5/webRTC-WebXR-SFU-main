// Definir el pin al que está conectado el LED
const int ledPin = 13; // Pin 13 en el Arduino

void setup() {
  // Inicializar puerto serial
  Serial.begin(115200); // Asegúrate de que coincida con el baudrate en el código de Node.js

  // Configurar el pin del LED como salida
  pinMode(ledPin, OUTPUT);

  // Apagar el LED al inicio
  digitalWrite(ledPin, LOW);
}

void loop() {
  // Si hay datos disponibles en el puerto serial
  if (Serial.available() > 0) {
    // Leer el dato y enviarlo de vuelta
    String data = Serial.readStringUntil('\n'); // Leer hasta el salto de línea

    Serial.println("Recibido en COM13 (Arduino): " + data); // Imprimir el mensaje recibido en el monitor serial

    // Verificar los comandos recibidos
    if (data.indexOf("Botón A presionado") >= 0) {
      // Encender el LED si se recibe el mensaje de que el botón A fue presionado
      digitalWrite(ledPin, HIGH);
      Serial.println("LED encendido");
    }
    else if (data.indexOf("Botón B presionado") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    else if (data.indexOf("Botón X presionado") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    else if (data.indexOf("Botón Y presionado") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    
    // Joystick Derecho
    else if (data.indexOf("Joystick X derecho a la derecha") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    else if (data.indexOf("Joystick X derecho a la izquierda") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    else if (data.indexOf("Joystick Y derecho arriba") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }
    else if (data.indexOf("Joystick Y derecho abajo") >= 0) {
      // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
      digitalWrite(ledPin, LOW);
      Serial.println("LED apagado");
    }


    // Joystick Izquierdo
      else if (data.indexOf("Joystick X izquierdo a la derecha") >= 0) {
        // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
        digitalWrite(ledPin, LOW);
        Serial.println("LED apagado");
      }
      else if (data.indexOf("Joystick X izquierdo a la izquierda") >= 0) {
        // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
        digitalWrite(ledPin, LOW);
        Serial.println("LED apagado");
      }
      else if (data.indexOf("Joystick Y izquierdo arriba") >= 0) {
        // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
        digitalWrite(ledPin, LOW);
        Serial.println("LED apagado");
      }
      else if (data.indexOf("Joystick Y izquierdo abajo") >= 0) {
        // Apagar el LED si se recibe el mensaje de que el botón B fue presionado
        digitalWrite(ledPin, LOW);
        Serial.println("LED apagado");
      }    
  }
}
