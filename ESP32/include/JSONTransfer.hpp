#ifndef JSON_TRANSFER_HPP
#define JSON_TRANSFER_HPP

#pragma once
#include "Sensor.hpp"
#include "Actuator.hpp"
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
    void write_actuator_data();
    void receive_and_apply(char* msg_topic , byte* msg , uint32_t len);
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
        Wifi(){set();}
    };
public:
    JSON_Transfer();
    void write_time();
    void send();
    void receive();
    ~JSON_Transfer();
};


#endif