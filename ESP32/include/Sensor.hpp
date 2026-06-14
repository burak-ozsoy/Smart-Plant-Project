#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

#pragma once
#include "Threshold.hpp"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "rom/ets_sys.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"

#include <unordered_map>
#include <memory>
#include <string>

#define INVALID_FLOAT -1000.0F
#define INVALID_UINT8_T ((uint8_t)UINT8_MAX)
#define SENSOR_READ_PERIOD_MS    2000
#define MONITOR_PRINT_PERIOD_MS  3000


class Sensor {
private:
    struct Pins {
        static constexpr gpio_num_t DHT_GPIO = GPIO_NUM_32;
        static constexpr adc_channel_t SOIL_MOISTURE_ADC = ADC_CHANNEL_6; // GPIO34
        static constexpr adc_channel_t LIGHT_SENSOR_ADC = ADC_CHANNEL_7;  // GPIO35
        Pins();
    };
    Pins* pin = nullptr;

    struct SensorData {
        float temperature = INVALID_FLOAT;
        float humidity = INVALID_FLOAT;
        uint8_t soilMoisture = INVALID_UINT8_T;
        uint8_t lightLevel = INVALID_UINT8_T;
    };
    SensorData* sd = nullptr;

    struct DHT {
        public:
            int32_t dht_wait_for_level(uint32_t , uint16_t, Pins*);
            const uint16_t dht_start_signal_ms = 20;
            const uint16_t dht_timeout_us = 100;
            bool dht22_read(Pins*);
            uint8_t* get_data(){ return data;}
            uint8_t fail_count = 0;
            DHT() : data(nullptr) {}
            ~DHT(){ if(data != nullptr) delete[] data;}
            private:
                uint8_t* data;
                static portMUX_TYPE dht_spinlock;
            friend class Sensor;
    };
    DHT* dht = nullptr;

    struct ADC {
        adc_oneshot_unit_handle_t handle = nullptr;
        // Soil moisture calibration (raw ADC values)
        static constexpr int32_t SOIL_DRY = 4095;
        static constexpr int32_t SOIL_WET = 800;
        // Light sensor (LDR) calibration: dark = high ADC, bright = low ADC
        static constexpr int32_t LIGHT_DARK = 3950;
        static constexpr int32_t LIGHT_BRIGHT = 400;
        static constexpr int32_t ADC_SAMPLES = 8;
        ADC(adc_channel_t ch1, adc_channel_t ch2);
        int32_t read_percent(adc_channel_t channel);
        int32_t read_raw(adc_channel_t channel);
        ~ADC(){ if(handle != nullptr) adc_oneshot_del_unit(handle); }
    };
    ADC* adc = nullptr;

    std::unordered_map<std::string , std::string> read_sensors();
    void delete_ptrs();
public:
    static constexpr const char* CLASS_TAG = "Sensor";

    Sensor();
    void printStatus();
    bool is_initialized();
    ~Sensor();

    friend class Actuator;
    friend class JSON_Transfer;
};


#endif