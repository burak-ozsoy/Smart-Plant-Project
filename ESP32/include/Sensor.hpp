#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

#include <Arduino.h>
#include <DHT.h>
#include <unordered_map>
#include <memory>
#include <string>

#include <Threshold.hpp>

#define DHT_TYPE DHT22
#define INVALID_FLOAT -1000.0F
#define INVALID_UINT8_T ((uint8_t)UINT8_MAX)


class Sensor {
private:
    struct Pins {
        static constexpr uint8_t DHT_PIN = 4;
        static constexpr uint8_t SOIL_MOISTURE_PIN = 34; // ADC1_CH6
        static constexpr uint8_t LIGHT_SENSOR_PIN = 35;  // ADC1_CH7
    };

    struct SensorData {
        float temperature;
        float humidity;
        uint8_t soilMoisture;   
        uint8_t lightLevel;
        bool isValid;
    };

    DHT* dht = nullptr;
    std::unordered_map<std::string , std::string> read_sensors();
public:
    Pins* pin = nullptr;
    SensorData* sd = nullptr;

    Sensor();
    void begin_dht();
    void printStatus();
    ~Sensor();

    friend class Actuators;
    friend class JSON_Transfer;
};


#endif