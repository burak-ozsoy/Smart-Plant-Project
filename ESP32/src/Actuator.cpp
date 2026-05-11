#include "Actuator.hpp"


Actuator::Actuator(){
    if(s == nullptr) this->s = new (std::nothrow) Sensor();
    if(t == nullptr) this->t = new (std::nothrow) Threshold();
    if(this->as == nullptr) this->as = new (std::nothrow) ActuatorState{false , false , false};
    if(this->pin == nullptr) this->pin = new (std::nothrow) Pins();

    if(!is_initialized()){
        delete_ptrs();
        ESP_LOGE(CLASS_TAG , ": Actuator memalloc failed!");
        return;
    }
}

Actuator::Pins::Pins(){
    gpio_config_t output_conf = {
        .pin_bit_mask = (1ULL << this->PUMP_RELAY_PIN) |
                        (1ULL << this->GROW_LIGHT_PIN) |
                        (1ULL << this->FAN_RELAY_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&output_conf);
 
    gpio_set_level(this->PUMP_RELAY_PIN, 0);
    gpio_set_level(this->GROW_LIGHT_PIN, 0);
    gpio_set_level(this->FAN_RELAY_PIN, 0);

    ESP_LOGI(Actuator::CLASS_TAG, "GPIO pins configured successfully. PUMP:%d, LIGHT:%d, FAN:%d",
        this->PUMP_RELAY_PIN, this->GROW_LIGHT_PIN, this->FAN_RELAY_PIN);
}

void Actuator::control_actuators(){

    if(s != nullptr && s->sd == nullptr){
        ESP_LOGE(CLASS_TAG , ": Access to SensorData is failed!");
        return;
    } else if(s == nullptr){
        ESP_LOGE(CLASS_TAG , ": Access to Sensor object via pointer is failed!");
        return;
    } 
    if(t != nullptr && t->thres == nullptr){
        ESP_LOGE(CLASS_TAG , ": Access to Threshold values are failed!");
        return;
    } else if(t == nullptr){
        ESP_LOGE(CLASS_TAG , ": Access to Threshold object via pointer is failed!");
        return;
    }

    ESP_LOGD(CLASS_TAG, "Soil:%d Light:%d Temp:%.2f Hum:%.2f", s->sd->soilMoisture, s->sd->lightLevel, s->sd->temperature, s->sd->humidity);

    if(s->sd->soilMoisture != INVALID_UINT8_T){
        if(s->sd->soilMoisture < t->thres->soilMoistureVals[0]){
            if(!as->pumpOn && pin != nullptr){
                this->as->pumpOn = true;
                gpio_set_level(pin->PUMP_RELAY_PIN, as->pumpOn);
                ESP_LOGW(CLASS_TAG, "Water pump is now ON - Soil moisture: %d%%", s->sd->soilMoisture);
            }
        } else if(s->sd->soilMoisture > t->thres->soilMoistureVals[1]){
            if(as->pumpOn && pin != nullptr){
                this->as->pumpOn = false;
                gpio_set_level(pin->PUMP_RELAY_PIN, as->pumpOn);
                ESP_LOGW(CLASS_TAG, "Water pump is now OFF due to enough soil moisture! - Soil moisture: %d%%", s->sd->soilMoisture);
            }
        }
    } else {
        ESP_LOGW(CLASS_TAG, "Soil moisture is INVALID, skipping water pump control.");
    }

    if(s->sd->lightLevel != INVALID_UINT8_T){
        if(s->sd->lightLevel < t->thres->lightVals[0]){
            if(!as->growLightOn && pin != nullptr){
                this->as->growLightOn = true;
                gpio_set_level(pin->GROW_LIGHT_PIN, as->growLightOn);
                ESP_LOGW(CLASS_TAG, "Grow light is now ON due to low light level! - Light level: %d%%" , s->sd->lightLevel);
            }
        } else if(s->sd->lightLevel > t->thres->lightVals[1]){
            if(as->growLightOn && pin != nullptr){
                this->as->growLightOn = false;
                gpio_set_level(pin->GROW_LIGHT_PIN, as->growLightOn);
                ESP_LOGW(CLASS_TAG, "Grow light is now OFF due to enough light level! %d%%" , s->sd->lightLevel);
            }
        }
    } else {
        ESP_LOGW(CLASS_TAG, "Light level is INVALID, skipping grow light control.");
    }

    if(s->sd->temperature != INVALID_FLOAT && s->sd->humidity != INVALID_FLOAT){
        bool highTemp = s->sd->temperature > t->thres->tempVals[1];
        bool highHum  = s->sd->humidity > t->thres->humidityVals[1];
        if(highTemp || highHum){
            if(!as->fanOn && pin != nullptr){
                this->as->fanOn = true;
                gpio_set_level(pin->FAN_RELAY_PIN, as->fanOn);
                ESP_LOGW(CLASS_TAG, "Fan is ON due to %s",
                    (highTemp && highHum) ? "both high temperature and humidity values!" :
                    highTemp ? "high temperature value!" : "high humidity value!");
            }
        } else {
            if(as->fanOn && pin != nullptr){
                as->fanOn = false;
                gpio_set_level(pin->FAN_RELAY_PIN, as->fanOn);
                ESP_LOGW(CLASS_TAG, "Fan is OFF due to low Temperature/Humidity values. Temperature: %.2f , Humidity: %.2f" , s->sd->temperature , s->sd->humidity);
            }
        }
    } else {
        ESP_LOGW(CLASS_TAG, "Both humidity/temperature values are INVALID, skipping fan control.");
    }
}

void Actuator::call_control_actuators(){
    control_actuators();
}

void Actuator::activate_actuators(const std::unordered_map<std::string, bool>& um){
    if(as == nullptr || pin == nullptr){
        ESP_LOGE(CLASS_TAG , ": error on either as/pin pointer!");
        return;
    }

    if(um.find("fanOn") != um.end()){
       as->fanOn = um.at("fanOn");
       gpio_set_level(pin->FAN_RELAY_PIN, (as->fanOn)? 1 : 0);
    } 
    if(um.find("pumpOn") != um.end()){
        as->pumpOn = um.at("pumpOn");
        gpio_set_level(pin->PUMP_RELAY_PIN, (as->pumpOn)? 1 : 0);
    } 
    if(um.find("growLightOn") != um.end()){
       as->growLightOn = um.at("growLightOn");
       gpio_set_level(pin->GROW_LIGHT_PIN, (as->growLightOn)? 1 : 0);
    }
    ESP_LOGI(CLASS_TAG, "States set -> Pump:%s Light:%s Fan:%s", as->pumpOn ? "On":"Off", as->growLightOn ? "On":"Off", as->fanOn ? "On":"Off");
}

void Actuator::printStatus(){
    if(this->as != nullptr){
        ESP_LOGI(CLASS_TAG, "Water pump: %s", as->pumpOn? "On" : "Off");
        ESP_LOGI(CLASS_TAG, "Grow Light: %s", as->growLightOn? "On" : "Off");
        ESP_LOGI(CLASS_TAG, "Fan: %s", as->fanOn? "On" : "Off");
    } else {
        ESP_LOGE(CLASS_TAG, "Cannot access to actuator states");
    }
}

bool Actuator::is_initialized(){
    return (s != nullptr) && (t != nullptr) && (as != nullptr) && (pin != nullptr);
}

void Actuator::delete_ptrs(){
    if(s != nullptr){delete s; s = nullptr;}
    if(t != nullptr){delete t; t = nullptr;}
    if(as != nullptr){delete this->as; as = nullptr;}
    if(pin != nullptr){delete this->pin; pin = nullptr;}
}

Actuator::~Actuator(){
    delete_ptrs();
}