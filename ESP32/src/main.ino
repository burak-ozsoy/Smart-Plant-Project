/*
 * Smart Indoor Plant Multi-Sensor Control System
 * BAU Capstone Project - Wokwi Simulation Version
 * 
 * Sensprs:
 *   - DHT22 (GPIO4)           -> Temperature (°C) & Humidity (%)
 *   - Potantiometer (GPIO34) -> Soil moisture simulation (%)
 *   - Potantiometer (GPIO35) -> Light level simulation (%)
 * 
 * Actuators (simulating with leds):
 *   - Water pump  (GPIO25) -> Blue LED
 *   - Grow light  (GPIO26) -> Green LED
 *   - Fan         (GPIO27) -> Yellow LED
 */

#pragma once
#include "JSONTransfer.hpp"
#include "Sensor.hpp"
#include "Actuator.hpp"
#include <thread>
#include <chrono>

#define READ_INTERVAL 2000
#define PRINT_INTERVAL 3000

Sensor* sensor = new Sensor();
Actuator* actuator = new Actuator();
JSON_Transfer* jt = new JSON_Transfer();
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  Smart Indoor Plant Control System [Logs]");
  Serial.println("========================================\n");

  sensor->begin_dht();
  if(sensor->pin != nullptr){
    pinMode(sensor->pin->SOIL_MOISTURE_PIN, INPUT);
    pinMode(sensor->pin->LIGHT_SENSOR_PIN, INPUT);
  }
  
  if(actuator->pin != nullptr){
    pinMode(actuator->pin->PUMP_RELAY_PIN, OUTPUT);
    pinMode(actuator->pin->GROW_LIGHT_PIN, OUTPUT);
    pinMode(actuator->pin->FAN_RELAY_PIN, OUTPUT);

    digitalWrite(actuator->pin->PUMP_RELAY_PIN, LOW);
    digitalWrite(actuator->pin->GROW_LIGHT_PIN, LOW);
    digitalWrite(actuator->pin->FAN_RELAY_PIN, LOW);
  }

  if(jt == nullptr){
    jt = new JSON_Transfer();
  }

  auto send_json = [](JSON_Transfer* jt_ptr) -> void{
    while(true){
      jt_ptr->send();
      std::this_thread::sleep_for(std::chrono::milliseconds(2000));
    }
  };

  auto receive_json = [](JSON_Transfer* jt_ptr) -> void{
    while(true){
      jt_ptr->receive();
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
  };

  std::thread t1(send_json , jt);
  std::thread t2(receive_json , jt);
  t1.detach(); t2.detach();

}

uint64_t lastReadTime = 0;
uint64_t lastPrintTime = 0;

std::thread t1(&JSON_Transfer::send , jt);
std::thread t2(&JSON_Transfer::receive , jt);
void loop() {
  uint64_t currentTime = millis();
  
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;

    if(sensor->sd->isValid) {
      actuator->call_control_actuators();
      sensor->sd->isValid = false;
    }
  }

  if (currentTime - lastPrintTime >= PRINT_INTERVAL) {
    lastPrintTime = currentTime;
    if(sensor->sd->isValid) {
      sensor->printStatus();
      actuator->printStatus();
    }
  }
}