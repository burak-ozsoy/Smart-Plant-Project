#ifndef THRESHOLD_HPP
#define THRESHOLD_HPP

#include <cstdio>
#include <new>
#include "esp_log.h"

class Threshold {
private:
    struct PlantThresholds {
        // Each array stores min and max values respectively.
        const float tempVals[2] = {18.0f , 30.0f};           
        const float humidityVals[2] = {40.0f , 70.0f};           
        const uint8_t soilMoistureVals[2] = {30 , 70};   
        const uint8_t lightVals[2] = {30 , 80};                
    };
    PlantThresholds* thres = nullptr;
public:
    Threshold();
    void printThresholds();
    ~Threshold();

    friend class Sensor;
    friend class Actuator;
};

#endif