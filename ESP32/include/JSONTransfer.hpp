#ifndef JSON_TRANSFER_HPP
#define JSON_TRANSFER_HPP

#pragma once
#include "Sensor.hpp"
#include <nlohmann/json.hpp>
#include <WiFi.h>
#include <PubSubClient.h>
#include <unordered_map>
#include <string>
#include <sstream>
#include <cstdio>
#include <chrono>
#include <ctime>
#include <iomanip>

#define MQTT_BUFFER_SIZE 512

using JSON = nlohmann::json;

class JSON_Transfer {
private:
    void write_sensor_data();
    void send_json_to_raspberry(const JSON&);
    JSON* j = nullptr;
protected:
    struct Wifi {
        const char* ssid = nullptr;
        const char* pwd = nullptr;
        const char* raspberry_ip = nullptr;
        const uint16_t port = 1883;

        WiFiClient esp;
        PubSubClient client{esp};

        void set();
    };
public:
    JSON_Transfer();
    void write_time();
    void send();
    ~JSON_Transfer();
};


#endif