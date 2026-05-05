#ifndef THRESHOLD_HPP
#define THERESHOLD_HPP

#include <Arduino.h>

class Threshold {
private:
    struct PlantThresholds {
        // Each array stores min and max values respectively.
        const float tempVals[2] = {18.0f , 30.0f};           
        const float humidityVals[2] = {40.0f , 70.0f};           
        const uint8_t soilMoistureVals[2] = {30 , 70};   
        const uint8_t lightVals[2] = {30 , 80};                
    };
public:
    PlantThresholds* thres = nullptr;
    Threshold();
    void printThresholds();
    ~Threshold();

    friend class Sensor;
    friend class Actuators;
};

#endif