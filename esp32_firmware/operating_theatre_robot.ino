/*
==========================================================
 IoT Operating Theatre Monitoring Robot
 ESP32 + Flask + Supabase Integration

 Communication:
 ESP32 <-> Flask REST API <-> Supabase PostgreSQL
                         ^
                         |
                    React Dashboard

Real sensors:
- MQ135 on GPIO 34
- DHT11 on GPIO 4
- PMS5003 on UART2 GPIO 16/17
- HC-SR04 on GPIO 5/18

Commands:
- MOVE
- STOP
- REAL
- NORMAL
- WARNING
- DANGER
==========================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <DHT.h>

// ========================================================
// WIFI
// ========================================================

const char* WIFI_SSID = "santech01";
const char* WIFI_PASSWORD = "santech01@";

// ========================================================
// FLASK BACKEND
// ========================================================

const char* API_BASE_URL = "http://192.168.1.25:5000";
const char* DEVICE_ID = "OT_ROBOT_001";
const char* DEVICE_API_KEY = "OT_ROBOT_SECRET_2026";

// ========================================================
// DHT11
// ========================================================

#define DHT_PIN 4
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// ========================================================
// PMS5003
// ========================================================

HardwareSerial pmsSerial(2);

#define PMS_RX 16
#define PMS_TX 17

// ========================================================
// MQ135
// ========================================================

#define MQ135_PIN 34

// ========================================================
// L298N MOTOR DRIVER
// ========================================================

#define IN1 26
#define IN2 27
#define IN3 14
#define IN4 12
#define ENA 25
#define ENB 33

// ========================================================
// ULTRASONIC SENSOR
// ========================================================

#define TRIG_PIN 5
#define ECHO_PIN 18

// ========================================================
// ALERT OUTPUTS
// ========================================================

#define GREEN_LED 2
#define YELLOW_LED 15
#define RED_LED 32
#define BUZZER 13

// ========================================================
// MOTOR CONFIGURATION
// ========================================================

const int PWM_FREQUENCY = 1000;
const int PWM_RESOLUTION = 8;

int motorSpeed = 180;

// ========================================================
// THRESHOLDS
// ========================================================

const float OBSTACLE_DISTANCE_CM = 25.0;

const int GAS_WARNING = 1800;
const int GAS_DANGER = 2600;

const float OXYGEN_WARNING = 75.0;
const float OXYGEN_DANGER = 50.0;

const int PM25_WARNING = 10;
const int PM25_DANGER = 35;

const int PM10_WARNING = 20;
const int PM10_DANGER = 50;

const float TEMP_LOW = 20.0;
const float TEMP_HIGH = 24.0;

const float HUMIDITY_LOW = 40.0;
const float HUMIDITY_HIGH = 60.0;

// ========================================================
// NAVIGATION CONFIGURATION
// ========================================================

// Calibrate these values on the robot platform.
// Accurate rectangular navigation requires encoders or an IMU.
const unsigned long RECTANGLE_SIDE_DURATION_MS = 2200;
const unsigned long RECTANGLE_TURN_DURATION_MS = 700;
const unsigned long OBSTACLE_STOP_DURATION_MS = 400;
const unsigned long OBSTACLE_REVERSE_DURATION_MS = 800;
const unsigned long OBSTACLE_TURN_DURATION_MS = 650;

// ========================================================
// SENSOR DATA
// ========================================================

float distanceCm = 0.0;

int mq135Raw = 0;

float co2TrendPpm = 0.0;
float n2oRiskPercent = 0.0;
float oxygenIndexPercent = 0.0;

float temperatureC = 0.0;
float humidityPercent = 0.0;

int pm25 = 0;
int pm10 = 0;

float contaminationRiskPercent = 0.0;

// ========================================================
// SYSTEM STATUS
// ========================================================

String operatingMode = "REAL";
String robotStatus = "STOPPED";
String alertStatus = "NORMAL";

bool automaticMovementEnabled = false;

// ========================================================
// SENSOR VALIDITY
// ========================================================

bool dhtValid = false;
bool pmsValid = false;

// ========================================================
// TIMERS
// ========================================================

unsigned long lastSensorReadTime = 0;
unsigned long lastUploadTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lastWiFiCheckTime = 0;
unsigned long lastBuzzerTime = 0;

const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long UPLOAD_INTERVAL_MS = 5000;
const unsigned long COMMAND_POLL_INTERVAL_MS = 1000;
const unsigned long WIFI_CHECK_INTERVAL_MS = 5000;

bool buzzerState = false;

// ========================================================
// NON-BLOCKING NAVIGATION STATE MACHINE
// ========================================================

enum NavigationState {
  RECTANGLE_FORWARD,
  RECTANGLE_TURN_RIGHT,
  AVOID_STOP,
  AVOID_REVERSE,
  AVOID_TURN,
  RESUME_RECTANGLE
};

NavigationState navigationState = RECTANGLE_FORWARD;

unsigned long navigationStateStartTime = 0;
int rectangleSide = 1;

// ========================================================
// SETUP
// ========================================================

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);

  initializeSensors();
  initializeMotors();
  initializeUltrasonic();
  initializeAlerts();

  stopRobot();

  connectToWiFi();

  Serial.println();
  Serial.println("========================================");
  Serial.println("Operating Theatre Robot Ready");
  Serial.println("========================================");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Flask API: ");
  Serial.println(API_BASE_URL);
  Serial.println();
}

// ========================================================
// MAIN LOOP
// ========================================================

void loop() {
  maintainWiFiConnection();
  readSerialModeCommand();

  unsigned long currentTime = millis();

  distanceCm = readDistanceCm();

  if (currentTime - lastSensorReadTime >= SENSOR_INTERVAL_MS) {
    lastSensorReadTime = currentTime;

    if (operatingMode == "REAL") {
      readRealSensors();
    } else {
      generateSimulationData();
    }

    calculateAcademicIndexes();
    determineAlertStatus();
    printSystemData();
  }

  updateAlertOutputs();

  runNavigationStateMachine();

  if (currentTime - lastCommandPollTime >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollTime = currentTime;

    if (WiFi.status() == WL_CONNECTED) {
      pollBackendCommand();
    }
  }

  if (currentTime - lastUploadTime >= UPLOAD_INTERVAL_MS) {
    lastUploadTime = currentTime;

    if (WiFi.status() == WL_CONNECTED) {
      submitSensorData();
    }
  }
}

// ========================================================
// INITIALIZATION
// ========================================================

void initializeSensors() {
  dht.begin();

  pmsSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pinMode(MQ135_PIN, INPUT);
}

void initializeMotors() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  ledcAttach(ENA, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttach(ENB, PWM_FREQUENCY, PWM_RESOLUTION);

  ledcWrite(ENA, motorSpeed);
  ledcWrite(ENB, motorSpeed);
}

void initializeUltrasonic() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
}

void initializeAlerts() {
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);
}

// ========================================================
// WIFI
// ========================================================

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");

  unsigned long connectionStart = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - connectionStart < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed");
  }
}

void maintainWiFiConnection() {
  if (millis() - lastWiFiCheckTime < WIFI_CHECK_INTERVAL_MS) {
    return;
  }

  lastWiFiCheckTime = millis();

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("WiFi disconnected. Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ========================================================
// REAL SENSOR READING
// ========================================================

void readRealSensors() {
  mq135Raw = analogRead(MQ135_PIN);

  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();

  dhtValid = !isnan(newTemperature) && !isnan(newHumidity);

  if (dhtValid) {
    temperatureC = newTemperature;
    humidityPercent = newHumidity;
  } else {
    Serial.println("DHT11 reading failed");
  }

  pmsValid = readPMS5003();

  if (!pmsValid) {
    Serial.println("No new valid PMS5003 frame");
  }
}

// ========================================================
// PMS5003 FRAME READING
// ========================================================

bool readPMS5003() {
  static uint8_t frame[32];

  while (pmsSerial.available() >= 32) {
    if (pmsSerial.peek() != 0x42) {
      pmsSerial.read();
      continue;
    }

    size_t bytesRead = pmsSerial.readBytes(frame, sizeof(frame));

    if (bytesRead != sizeof(frame)) {
      return false;
    }

    if (frame[0] != 0x42 || frame[1] != 0x4D) {
      return false;
    }

    uint16_t frameLength = (static_cast<uint16_t>(frame[2]) << 8) | frame[3];

    if (frameLength != 28) {
      return false;
    }

    uint16_t calculatedChecksum = 0;

    for (int i = 0; i < 30; i++) {
      calculatedChecksum += frame[i];
    }

    uint16_t receivedChecksum = (static_cast<uint16_t>(frame[30]) << 8) | frame[31];

    if (calculatedChecksum != receivedChecksum) {
      Serial.println("PMS5003 checksum failed");
      return false;
    }

    pm25 = (static_cast<uint16_t>(frame[12]) << 8) | frame[13];
    pm10 = (static_cast<uint16_t>(frame[14]) << 8) | frame[15];

    return true;
  }

  return false;
}

// ========================================================
// SIMULATION MODES
// ========================================================

void generateSimulationData() {
  dhtValid = true;
  pmsValid = true;

  if (operatingMode == "NORMAL") {
    mq135Raw = 900;
    temperatureC = 22.0;
    humidityPercent = 50.0;
    pm25 = 5;
    pm10 = 12;
  } else if (operatingMode == "WARNING") {
    mq135Raw = 2000;
    temperatureC = 26.0;
    humidityPercent = 65.0;
    pm25 = 18;
    pm10 = 30;
  } else if (operatingMode == "DANGER") {
    mq135Raw = 3200;
    temperatureC = 30.0;
    humidityPercent = 35.0;
    pm25 = 45;
    pm10 = 70;
  }
}

// ========================================================
// ACADEMIC INDEX CALCULATIONS
// ========================================================

void calculateAcademicIndexes() {
  co2TrendPpm = mapFloat(mq135Raw, 0.0, 4095.0, 400.0, 1500.0);
  n2oRiskPercent = mapFloat(mq135Raw, 0.0, 4095.0, 0.0, 100.0);

  float combinedParticles = static_cast<float>(pm25 + pm10);
  contaminationRiskPercent = mapFloat(combinedParticles, 0.0, 150.0, 0.0, 100.0);
  contaminationRiskPercent = constrain(contaminationRiskPercent, 0.0, 100.0);

  oxygenIndexPercent = 100.0 - (static_cast<float>(mq135Raw) / 4095.0) * 45.0 - contaminationRiskPercent * 0.35;
  oxygenIndexPercent = constrain(oxygenIndexPercent, 0.0, 100.0);
}

float mapFloat(float value, float inputMinimum, float inputMaximum, float outputMinimum, float outputMaximum) {
  return (value - inputMinimum) * (outputMaximum - outputMinimum) / (inputMaximum - inputMinimum) + outputMinimum;
}

// ========================================================
// ALERT EVALUATION
// ========================================================

void determineAlertStatus() {
  bool danger = false;
  bool warning = false;

  if (mq135Raw >= GAS_DANGER) {
    danger = true;
  } else if (mq135Raw >= GAS_WARNING) {
    warning = true;
  }

  if (oxygenIndexPercent <= OXYGEN_DANGER) {
    danger = true;
  } else if (oxygenIndexPercent <= OXYGEN_WARNING) {
    warning = true;
  }

  if (pm25 >= PM25_DANGER || pm10 >= PM10_DANGER) {
    danger = true;
  } else if (pm25 >= PM25_WARNING || pm10 >= PM10_WARNING) {
    warning = true;
  }

  if (temperatureC < TEMP_LOW || temperatureC > TEMP_HIGH) {
    warning = true;
  }

  if (humidityPercent < HUMIDITY_LOW || humidityPercent > HUMIDITY_HIGH) {
    warning = true;
  }

  if (danger) {
    alertStatus = "DANGER";
  } else if (warning) {
    alertStatus = "WARNING";
  } else {
    alertStatus = "NORMAL";
  }
}

// ========================================================
// NON-BLOCKING BUZZER AND LED ALERTS
// ========================================================

void updateAlertOutputs() {
  unsigned long currentTime = millis();

  if (alertStatus == "DANGER") {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);

    if (currentTime - lastBuzzerTime >= 300) {
      lastBuzzerTime = currentTime;
      buzzerState = !buzzerState;
      digitalWrite(BUZZER, buzzerState);
    }
  } else if (alertStatus == "WARNING") {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);

    unsigned long warningCycle = currentTime % 1500;
    digitalWrite(BUZZER, warningCycle < 120 ? HIGH : LOW);
  } else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER, LOW);
    buzzerState = false;
  }
}

// ========================================================
// SENSOR DATA UPLOAD
// ========================================================

void submitSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Upload skipped: WiFi disconnected");
    return;
  }

  HTTPClient http;
  String endpoint = String(API_BASE_URL) + "/api/device/readings";

  if (!http.begin(endpoint)) {
    Serial.println("Could not start upload request");
    return;
  }

  http.setConnectTimeout(5000);
  http.setTimeout(7000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  JsonDocument document;

  document["device_id"] = DEVICE_ID;
  document["operating_mode"] = operatingMode;
  document["robot_status"] = robotStatus;
  document["alert_status"] = alertStatus;
  document["distance_cm"] = distanceCm;
  document["mq135_raw"] = mq135Raw;
  document["co2_trend_ppm"] = co2TrendPpm;
  document["n2o_risk_percent"] = n2oRiskPercent;
  document["oxygen_index_percent"] = oxygenIndexPercent;
  document["temperature_c"] = temperatureC;
  document["humidity_percent"] = humidityPercent;
  document["pm25_ug_m3"] = pm25;
  document["pm10_ug_m3"] = pm10;
  document["contamination_risk_percent"] = contaminationRiskPercent;

  String jsonPayload;
  serializeJson(document, jsonPayload);

  int responseCode = http.POST(jsonPayload);

  Serial.println();
  Serial.println("---------- SENSOR UPLOAD ----------");
  Serial.print("Endpoint: ");
  Serial.println(endpoint);
  Serial.print("Response code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    String responseBody = http.getString();
    Serial.print("Response: ");
    Serial.println(responseBody);
  } else {
    Serial.print("Upload failed: ");
    Serial.println(http.errorToString(responseCode));
  }

  http.end();
}

// ========================================================
// COMMAND POLLING
// ========================================================

void pollBackendCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String endpoint = String(API_BASE_URL) + "/api/device/command/" + DEVICE_ID;

  if (!http.begin(endpoint)) {
    Serial.println("Could not start command request");
    return;
  }

  http.setConnectTimeout(3000);
  http.setTimeout(5000);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  int responseCode = http.GET();

  if (responseCode != HTTP_CODE_OK) {
    if (responseCode > 0) {
      Serial.print("Command polling HTTP code: ");
      Serial.println(responseCode);
    } else {
      Serial.print("Command polling failed: ");
      Serial.println(http.errorToString(responseCode));
    }

    http.end();
    return;
  }

  String responseBody = http.getString();
  JsonDocument document;
  DeserializationError jsonError = deserializeJson(document, responseBody);

  if (jsonError) {
    Serial.print("Command JSON error: ");
    Serial.println(jsonError.c_str());
    http.end();
    return;
  }

  bool success = document["success"] | false;
  bool hasCommand = document["data"]["has_command"] | false;

  if (!success || !hasCommand) {
    http.end();
    return;
  }

  long commandId = document["data"]["command"]["id"] | 0;
  const char* commandText = document["data"]["command"]["command"] | "";

  String command = String(commandText);
  command.trim();
  command.toUpperCase();

  Serial.println();
  Serial.println("---------- COMMAND RECEIVED ----------");
  Serial.print("Command ID: ");
  Serial.println(commandId);
  Serial.print("Command: ");
  Serial.println(command);

  bool commandSuccessful = executeBackendCommand(command);
  acknowledgeCommand(commandId, commandSuccessful ? "COMPLETED" : "FAILED");

  http.end();
}

// ========================================================
// EXECUTE BACKEND COMMAND
// ========================================================

bool executeBackendCommand(const String& command) {
  if (command == "MOVE") {
    automaticMovementEnabled = true;
    navigationState = RECTANGLE_FORWARD;
    navigationStateStartTime = millis();
    rectangleSide = 1;
    robotStatus = "RECT SIDE 1";
    return true;
  }

  if (command == "STOP") {
    automaticMovementEnabled = false;
    navigationState = RECTANGLE_FORWARD;
    stopRobot();
    robotStatus = "STOPPED";
    return true;
  }

  if (command == "REAL" || command == "NORMAL" || command == "WARNING" || command == "DANGER") {
    operatingMode = command;
    return true;
  }

  Serial.print("Unknown command: ");
  Serial.println(command);
  return false;
}

// ========================================================
// ACKNOWLEDGE COMMAND
// ========================================================

void acknowledgeCommand(long commandId, const String& completionStatus) {
  if (WiFi.status() != WL_CONNECTED || commandId <= 0) {
    return;
  }

  HTTPClient http;
  String endpoint = String(API_BASE_URL) + "/api/device/command/acknowledge";

  if (!http.begin(endpoint)) {
    Serial.println("Could not start acknowledgement request");
    return;
  }

  http.setConnectTimeout(3000);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  JsonDocument document;
  document["command_id"] = commandId;
  document["command_status"] = completionStatus;

  String jsonPayload;
  serializeJson(document, jsonPayload);

  int responseCode = http.POST(jsonPayload);

  Serial.print("Acknowledgement code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
}

// ========================================================
// NON-BLOCKING RECTANGLE NAVIGATION STATE MACHINE
// ========================================================

void runNavigationStateMachine() {
  if (!automaticMovementEnabled) {
    return;
  }

  unsigned long currentTime = millis();
  unsigned long elapsed = currentTime - navigationStateStartTime;

  switch (navigationState) {
    case RECTANGLE_FORWARD:
      if (distanceCm <= OBSTACLE_DISTANCE_CM) {
        stopRobot();
        robotStatus = "OBSTACLE";
        navigationState = AVOID_STOP;
        navigationStateStartTime = currentTime;
        break;
      }

      moveForward();
      robotStatus = "RECT SIDE " + String(rectangleSide);

      if (elapsed >= RECTANGLE_SIDE_DURATION_MS) {
        stopRobot();
        robotStatus = "RECT TURN";
        navigationState = RECTANGLE_TURN_RIGHT;
        navigationStateStartTime = currentTime;
      }
      break;

    case RECTANGLE_TURN_RIGHT:
      turnRight();
      robotStatus = "RECT TURN";

      if (elapsed >= RECTANGLE_TURN_DURATION_MS) {
        stopRobot();
        rectangleSide++;
        if (rectangleSide > 4) {
          rectangleSide = 1;
        }
        navigationState = RECTANGLE_FORWARD;
        navigationStateStartTime = currentTime;
      }
      break;

    case AVOID_STOP:
      stopRobot();
      robotStatus = "OBSTACLE";
      if (elapsed >= OBSTACLE_STOP_DURATION_MS) {
        navigationState = AVOID_REVERSE;
        navigationStateStartTime = currentTime;
      }
      break;

    case AVOID_REVERSE:
      moveBackward();
      robotStatus = "REVERSING";
      if (elapsed >= OBSTACLE_REVERSE_DURATION_MS) {
        stopRobot();
        navigationState = AVOID_TURN;
        navigationStateStartTime = currentTime;
      }
      break;

    case AVOID_TURN:
      turnRight();
      robotStatus = "AVOID TURN";
      if (elapsed >= OBSTACLE_TURN_DURATION_MS) {
        stopRobot();
        navigationState = RESUME_RECTANGLE;
        navigationStateStartTime = currentTime;
      }
      break;

    case RESUME_RECTANGLE:
      robotStatus = "RESUMING";
      navigationState = RECTANGLE_FORWARD;
      navigationStateStartTime = currentTime;
      break;
  }
}

// ========================================================
// ULTRASONIC SENSOR
// ========================================================

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    return 400.0;
  }

  return static_cast<float>(duration) * 0.0343 / 2.0;
}

// ========================================================
// SERIAL COMMANDS
// ========================================================

void readSerialModeCommand() {
  if (!Serial.available()) {
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();

  if (command == "REAL" || command == "NORMAL" || command == "WARNING" || command == "DANGER") {
    operatingMode = command;
    Serial.print("Operating mode changed to: ");
    Serial.println(operatingMode);
  } else if (command == "MOVE") {
    automaticMovementEnabled = true;
    navigationState = RECTANGLE_FORWARD;
    navigationStateStartTime = millis();
    rectangleSide = 1;
    robotStatus = "RECT SIDE 1";
  } else if (command == "STOP") {
    automaticMovementEnabled = false;
    navigationState = RECTANGLE_FORWARD;
    stopRobot();
    robotStatus = "STOPPED";
  }
}

// ========================================================
// SERIAL OUTPUT
// ========================================================

void printSystemData() {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Mode: ");
  Serial.println(operatingMode);

  Serial.print("Robot: ");
  Serial.println(robotStatus);

  Serial.print("Alert: ");
  Serial.println(alertStatus);

  Serial.print("Distance: ");
  Serial.print(distanceCm, 1);
  Serial.println(" cm");

  Serial.print("MQ135 raw: ");
  Serial.println(mq135Raw);

  Serial.print("CO2 trend: ");
  Serial.print(co2TrendPpm, 1);
  Serial.println(" ppm");

  Serial.print("N2O risk: ");
  Serial.print(n2oRiskPercent, 1);
  Serial.println("%");

  Serial.print("Oxygen index: ");
  Serial.print(oxygenIndexPercent, 1);
  Serial.println("%");

  Serial.print("Temperature: ");
  Serial.print(temperatureC, 1);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humidityPercent, 1);
  Serial.println("%");

  Serial.print("PM2.5: ");
  Serial.print(pm25);
  Serial.println(" ug/m3");

  Serial.print("PM10: ");
  Serial.print(pm10);
  Serial.println(" ug/m3");

  Serial.print("Contamination risk: ");
  Serial.print(contaminationRiskPercent, 1);
  Serial.println("%");
}

// ========================================================
// MOTOR FUNCTIONS
// ========================================================

void setMotorSpeed(int speedValue) {
  motorSpeed = constrain(speedValue, 0, 255);
  ledcWrite(ENA, motorSpeed);
  ledcWrite(ENB, motorSpeed);
}

void moveForward() {
  setMotorSpeed(motorSpeed);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void moveBackward() {
  setMotorSpeed(motorSpeed);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void turnRight() {
  setMotorSpeed(motorSpeed);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stopRobot() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}
