#include "Threshold.hpp"

Threshold::Threshold(){
    if(this->thres == nullptr) this->thres = new (std::nothrow) PlantThresholds();
    if(thres == nullptr) ESP_LOGE("Threshold: " , "Threshold memalloc failed!");
}

void Threshold::printThresholds() {
    const char* method_tag = "Threshold::printThresholds: ";
    if(this->thres != nullptr){
        ESP_LOGD(method_tag, "Temperature: [%.1f,%.1f] Celcius", this->thres->tempVals[0], this->thres->tempVals[1]);
        ESP_LOGD(method_tag, "Humidity: [%.1f,%.1f] %%", this->thres->humidityVals[0], this->thres->humidityVals[1]);
        ESP_LOGD(method_tag, "Soil Moisture: [%u,%u] %%", this->thres->soilMoistureVals[0], this->thres->soilMoistureVals[1]);
        ESP_LOGD(method_tag, "Light: [%u,%u] %%", this->thres->lightVals[0], this->thres->lightVals[1]);
        } else {
        ESP_LOGE(method_tag, "thres pointer is not pointing to PlantThresholds object!");
    }
}

Threshold::~Threshold(){
    if(this->thres != nullptr){
        delete this->thres;
    }
}