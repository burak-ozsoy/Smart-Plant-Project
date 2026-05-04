#include "Sensor.hpp"


Sensor::Sensor(){
    if(this->pin == nullptr) this->pin = new Pins();
    if(this->sd == nullptr) this->sd = new SensorData();
    if(this->dht == nullptr) this->dht = new DHT(pin->DHT_PIN , DHT_TYPE);
}

void Sensor::begin_dht(){
    if(this->dht != nullptr){
        this->dht->begin();
    }
}

std::unordered_map<std::string , std::string> Sensor::read_sensors(){
    std::unordered_map<std::string , std::string> data_table;

    if(sd == nullptr){
        sd = new SensorData();
    }
    auto get_temperature = [this]() -> float{
        sd->temperature = INVALID_FLOAT;
        try {
            float val = dht->readTemperature();
            sd->temperature = val;
            return val;
        } catch(...){
            return INVALID_FLOAT;
        }
    };
    
    auto get_humidity = [this]() -> float{
        sd->humidity = INVALID_FLOAT;
        try {
            float val =dht->readHumidity();
            sd->humidity = val;
            return val;
        } catch(...){
            return INVALID_FLOAT; 
        }
    };

    auto get_soil_moisture = [this]() -> uint8_t{
        sd->soilMoisture = INVALID_UINT8_T;
        try {
            uint8_t val = map(analogRead(pin->SOIL_MOISTURE_PIN) , 0 , 4095 , 0 , 100);
            sd->soilMoisture = val;
            return val;
        } catch(...){
            return INVALID_UINT8_T;
        }
    };

    auto get_light = [this]() -> uint8_t{
        sd->lightLevel = INVALID_UINT8_T;
        try {
            uint8_t val = map(analogRead(pin->LIGHT_SENSOR_PIN) , 0 , 4095 , 0 , 100);
            sd->lightLevel = val;
            return val;
        } catch(...){
            return INVALID_UINT8_T;
        }
    };
    
    this->sd->isValid = true;
    return {{"Temperature", std::to_string(get_temperature())},
            {"Humidity" , std::to_string(get_humidity())},
            {"Soil Moisture", std::to_string(get_soil_moisture())},
            {"Light Level", std::to_string(get_light())}};
}

void Sensor::printStatus(){
    if(this->sd != nullptr){
        Serial.println("--- Sensor Data ---");
        Serial.println("Temperature: " + String(sd->temperature) + " Celcius" +
        ((sd->temperature == INVALID_FLOAT)? "[Add print statement to read_sensors method for further information]" : "[OK]") + "\n");

        Serial.println("Humidity: " + String(sd->humidity) + " %" +
        ((sd->humidity == INVALID_FLOAT)? "[Add print statement to read_sensors method for further information]" : "[OK]") + "\n");

        Serial.println("Soil Moisture: " + String(sd->soilMoisture) + " %" +
        ((sd->soilMoisture == INVALID_UINT8_T)? "[Add print statement to read_sensors method for further information]" : "[OK]") + "\n");

        Serial.println("Light Level: " + String(sd->lightLevel) + " %" +
        ((sd->lightLevel == INVALID_UINT8_T)? "[Add print statement to read_sensors method for further information]" : "[OK]") + "\n");     
    } else {
        Serial.println("There is an error on pointer that points SensorData object.");
    }
}

Sensor::~Sensor(){
    if(pin != nullptr) delete pin;
    if(sd != nullptr) delete sd;
    if(dht != nullptr) delete dht;
}