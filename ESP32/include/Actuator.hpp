#ifndef ACTUATOR_HPP
#define ACTUATOR_HPP

#pragma once
#include "Sensor.hpp"
#include <Arduino.h>

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
public:
    Pins* pin = nullptr;
    Actuator();
    void call_control_actuators();
    void printStatus();
    ~Actuator();
};

#endif