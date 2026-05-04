#include "Actuator.hpp"


Actuator::Actuator(){
    if(this->as == nullptr) this->as = new ActuatorState{false , false , false};
    if(this->pin == nullptr) this->pin = new Pins();
}

void Actuator::control_actuators(){
    Sensor* s = new Sensor();
    Threshold* t = new Threshold();

    if(s->sd == nullptr || t->thres == nullptr){
        return;
    }

    //Check if soilMoisture value is valid
    if(s->sd->soilMoisture != INVALID_UINT8_T){
        if(s->sd->soilMoisture < t->thres->soilMoistureVals[0]){
            if(!as->pumpOn && pin != nullptr){
                this->as->pumpOn = true;
                digitalWrite(pin->PUMP_RELAY_PIN , HIGH);
                Serial.println("Water pump is now ON due to low soil moisture!");
            }
        } else if(s->sd->soilMoisture > t->thres->soilMoistureVals[1]){
            if (as->pumpOn && pin != nullptr){
                this->as->pumpOn = false;
                digitalWrite(pin->PUMP_RELAY_PIN, LOW);
                Serial.println("Water pump is now OFF due to enough soil moisture!");
            }
        }
    }

    //Check if lightLevel value is valid
    if(s->sd->lightLevel != INVALID_UINT8_T){
        if(s->sd->lightLevel < t->thres->lightVals[0]){
            if(!as->growLightOn && pin != nullptr){
                this->as->growLightOn = true;
                digitalWrite(pin->PUMP_RELAY_PIN , HIGH);
                Serial.println("Grow light is now ON due to low light level!");
            }
        } else if(s->sd->lightLevel > t->thres->lightVals[1]){
            if (as->growLightOn && pin != nullptr){
                this->as->growLightOn = false;
                digitalWrite(pin->GROW_LIGHT_PIN, LOW);
                Serial.println("Grow light is now OFF due to enough light level!");
            }
        }
    }

    if(s->sd->temperature != INVALID_FLOAT && s->sd->humidity != INVALID_FLOAT){
        bool highTemp = s->sd->temperature > t->thres->tempVals[1];
        bool highHum =  s->sd->humidity > t->thres->humidityVals[1];
        if(highTemp || highHum){
            if(!as->fanOn && pin != nullptr){
                this->as->fanOn = true;
                digitalWrite(pin->FAN_RELAY_PIN , HIGH);
                Serial.println("Fan is ON due to " + (highTemp && highHum)? "both high temperature and humidity values!" 
                : String("high ") + (highTemp? "temperature" : "humidity") + "value");
            }
        } else if(s->sd->temperature < t->thres->tempVals[0] || s->sd->humidity < t->thres->humidityVals[0]){
            if(as->fanOn && pin != nullptr){
                as->fanOn = false;
                digitalWrite(pin->FAN_RELAY_PIN, LOW);
                Serial.println("Fan is OFF due to low Temperature/Humidity values");
            }
        }
    }

    delete s;
    delete t;
}

void Actuator::call_control_actuators(){
    control_actuators();
}

void Actuator::activate_actuators(const std::unordered_map<const char* , bool>& um){
    if(as == nullptr){
        this->as = new ActuatorState();
    }
    as->fanOn = (um.at("fanOn"))? true : false;
    as->pumpOn = (um.at("pumpOn"))? true : false;
    as->growLightOn = (um.at("growLightOn"))? true : false;
}

void Actuator::printStatus(){
    if(this->as != nullptr){
        Serial.println("--- Actuators ---");
        Serial.println("Water pump: " + as->pumpOn? "On" : "Off");
        Serial.println("Grow Light: " + as->growLightOn? "On" : "Off");
        Serial.println("Fan: " + as->fanOn? "On\n" : "Off\n");
    } else {
        Serial.println("There is an error on pointer that points ActuatorState obj\n");
    }
}