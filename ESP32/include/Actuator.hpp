#ifndef ACTUATOR_HPP
#define ACTUATOR_HPP

#pragma once
#include "Sensor.hpp"
#include <unordered_map>
#include "freertos/FreeRTOS.h"
#include "driver/gpio.h"
#include "esp_log.h"

#define ACTUATOR_CHECK_PERIOD_MS 500

class Actuator {
private:
    struct Pins {
        static constexpr gpio_num_t PUMP_RELAY_PIN = GPIO_NUM_23;
        static constexpr gpio_num_t GROW_LIGHT_PIN = GPIO_NUM_22;
        static constexpr gpio_num_t FAN_RELAY_PIN = GPIO_NUM_21;
        Pins();
    };

    struct ActuatorState {
        bool pumpOn;
        bool growLightOn;
        bool fanOn;
    };
    struct ManualOverride {
        bool active = false;
        TickType_t expires_at = 0;
    };
    ActuatorState* as = nullptr;
    ManualOverride manual_override = {};
    void control_actuators();
    bool is_manual_override_active();
    void start_manual_override();
    void activate_actuators(const std::unordered_map<std::string , bool>&);
    void delete_ptrs();
    Sensor* s = nullptr;
    Threshold* t = nullptr;
public:
    static constexpr const char* CLASS_TAG = "Actuator";
    Pins* pin = nullptr;
    Actuator();
    void call_control_actuators();
    void printStatus();
    bool is_initialized();
    ~Actuator();

    friend class JSON_Transfer;
};

#endif