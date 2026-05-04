#ifndef ACTUATOR_HPP
#define ACTUATOR_HPP

#pragma once
#include "Sensor.hpp"
#include <Arduino.h>
#include <unordered_map>

class Actuator {
private:
    struct Pins {
        static constexpr uint8_t PUMP_RELAY_PIN = 25;
        static constexpr uint8_t GROW_LIGHT_PIN = 26;
        static constexpr uint8_t FAN_RELAY_PIN = 27;
    };

    struct ActuatorState {
        bool pumpOn;
        bool growLightOn;
        bool fanOn;
    };
    ActuatorState* as = nullptr;
    void control_actuators();
    void activate_actuators(const std::unordered_map<const char* , bool>&);
public:
    Pins* pin = nullptr;
    Actuator();
    void call_control_actuators();
    void printStatus();
    ~Actuator();

    friend class JSON_Transfer;
};

#endif