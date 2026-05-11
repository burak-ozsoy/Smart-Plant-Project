#ifndef JSON_TRANSFER_HPP
#define JSON_TRANSFER_HPP

#pragma once
#include "Sensor.hpp"
#include "Actuator.hpp"

#include <ArduinoJson.h>
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_sntp.h"
#include "mqtt_client.h"
#include "nvs_flash.h"

#include <unordered_map>
#include <string>
#include <sstream>
#include <chrono>
#include <ctime>
#include <iomanip>

#define MQTT_BUFFER_SIZE 512
#define JSON_DOC_SIZE    512

class JSON_Transfer {
private:
    void write_sensor_data(const std::unordered_map<std::string,std::string>&, JsonDocument&);
    void write_actuator_data(JsonDocument&);
    void receive_and_apply(const std::string& topic, const std::string& payload);
    void send_json_to_raspberry(JsonDocument&);
    bool ensure_connected();

    static void wifi_event_handler(void* arg, esp_event_base_t base, int32_t event_id, void* data);
    static void mqtt_event_handler(void* arg, esp_event_base_t base, int32_t event_id, void* data);

    struct Wifi {
        const char* ssid = nullptr;
        const char* pwd = nullptr;
        const char* raspberry_ip = nullptr;
        const uint16_t port = 1883;
        std::string subscriber_topic;

        esp_mqtt_client_handle_t mqtt_client = nullptr;
        esp_netif_t* netif = nullptr;

        bool wifi_connected = false;
        bool mqtt_connected = false;

        void init_wifi();
        void init_mqtt(void* parent_instance);
        Wifi(void* parent_instance){ init_wifi(); init_mqtt(parent_instance); }
        ~Wifi(){
            if(mqtt_client != nullptr) esp_mqtt_client_destroy(mqtt_client);
        }
    };
    Wifi* w = nullptr;

    char local_ip[16] = "0.0.0.0";
    Actuator* act = nullptr;
    SemaphoreHandle_t shared_mtx = nullptr;
    bool is_mtx_for_json_class = false;
    void delete_ptrs();

public:
    JSON_Transfer(SemaphoreHandle_t mutex);
    void write_time(JsonDocument&);
    void send();
    void read_and_send();
    void mqtt_client_loop();
    bool is_initialized();
    ~JSON_Transfer();
};

#endif