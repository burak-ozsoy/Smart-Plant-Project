#include "Threshold.hpp"

Threshold::Threshold(){
    this->thres = new PlantThresholds();
}

void Threshold::printThresholds() {
    if(this->thres != nullptr){
        Serial.println("--- Threshold values ---");

        Serial.print("Temperature: [" + String(this->thres->tempVals[0]) + "," + 
        String(this->thres->tempVals[1]) + "] Celcius\n");

        Serial.print("Humidity: [" + String(this->thres->humidityVals[0]) + "," + 
        String(this->thres->humidityVals[1]) + "] %\n");

        Serial.print("Soil Moisture: [" + String(this->thres->soilMoistureVals[0]) + "," + 
        String(this->thres->soilMoistureVals[1]) + "] %\n");

        Serial.print("Light: [" + String(this->thres->lightVals[0]) + "," + 
        String(this->thres->lightVals[1]) + "] %\n");
    } else {
        Serial.println("thres pointer is not pointing to PlantThresholds object!");
    }
}

Threshold::~Threshold(){
    if(this->thres != nullptr){
        delete this->thres;
    }
}