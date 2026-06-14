#include "Sensor.hpp"

Sensor::Sensor(){
    if(this->pin == nullptr) this->pin = new (std::nothrow) Pins();
    if(this->sd == nullptr) this->sd = new (std::nothrow) SensorData();
    if(this->dht == nullptr) this->dht = new (std::nothrow) DHT();
    if(this->adc == nullptr) this->adc = new (std::nothrow) ADC(Pins::SOIL_MOISTURE_ADC , Pins::LIGHT_SENSOR_ADC);

    if(!is_initialized()){
        delete_ptrs();
        ESP_LOGE(CLASS_TAG , "Sensor object initialization failed! Memalloc error!");
        return;
    }
}

Sensor::Pins::Pins(){
    gpio_config_t dht_conf = {
        .pin_bit_mask = (1ULL << this->DHT_GPIO),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&dht_conf);
}

Sensor::ADC::ADC(adc_channel_t ch1 , adc_channel_t ch2){
    adc_oneshot_unit_init_cfg_t init_cfg = {
        .unit_id  = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE
    };
    if(adc_oneshot_new_unit(&init_cfg, &handle) != ESP_OK){
        ESP_LOGE(Sensor::CLASS_TAG, "ADC unit init failed!");
        return;
    }
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten    = ADC_ATTEN_DB_11,
        .bitwidth = ADC_BITWIDTH_12
    };
    adc_oneshot_config_channel(handle, ch1, &chan_cfg);
    adc_oneshot_config_channel(handle, ch2, &chan_cfg);
}

int32_t Sensor::ADC::read_percent(adc_channel_t channel){
    if(handle == nullptr) return 0;
    int32_t sum = 0;
    for(int32_t i = 0; i < ADC_SAMPLES; i++){
        int raw = 0;
        esp_err_t err = adc_oneshot_read(handle, channel, &raw);
        if(err != ESP_OK){
            ESP_LOGE(Sensor::CLASS_TAG, "ADC read failed: %s", esp_err_to_name(err));
            return -1;
        }
        sum += raw;
    }
    int32_t avg = sum / ADC_SAMPLES;

    if(channel == Sensor::Pins::SOIL_MOISTURE_ADC){
        if(avg >= SOIL_DRY)  return 0;
        if(avg <= SOIL_WET)  return 100;
        return (int32_t)(((float)(SOIL_DRY - avg) / (float)(SOIL_DRY - SOIL_WET)) * 100.0f);
    }
    if(channel == Sensor::Pins::LIGHT_SENSOR_ADC){
        // LDR: dark = high ADC, bright = low ADC  →  invert: %0 = dark, %100 = bright
        if(avg >= LIGHT_DARK)   return 0;
        if(avg <= LIGHT_BRIGHT) return 100;
        return (int32_t)(((float)(LIGHT_DARK - avg) / (float)(LIGHT_DARK - LIGHT_BRIGHT)) * 100.0f);
    }
    return 100 - ((avg * 100) / 4095); // fallback
}

int32_t Sensor::DHT::dht_wait_for_level(uint32_t level , uint16_t dht_timeout_us, Pins* pin){

    int32_t count = 0;
    while (gpio_get_level(pin->DHT_GPIO) != level) {
        if (count >= dht_timeout_us) return -1;
        ets_delay_us(1);
        count++;
    }
    return count;
}

portMUX_TYPE Sensor::DHT::dht_spinlock = portMUX_INITIALIZER_UNLOCKED;
bool Sensor::DHT::dht22_read(Pins* pin){
    if(data != nullptr){
        delete[] data;
    }
    data = new (std::nothrow) uint8_t[5]();
    if(data == nullptr) return false;

    gpio_set_direction(pin->DHT_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(pin->DHT_GPIO, 0);
    vTaskDelay(pdMS_TO_TICKS(dht_start_signal_ms));
    gpio_set_level(pin->DHT_GPIO, 1);
    ets_delay_us(30);

    gpio_set_direction(pin->DHT_GPIO, GPIO_MODE_INPUT);
    
    if(dht_wait_for_level(0, dht_timeout_us , pin) < 0) return false;
    if(dht_wait_for_level(1, dht_timeout_us , pin) < 0) return false;
    if(dht_wait_for_level(0, dht_timeout_us , pin) < 0) return false;

    // Read 40 bit of data
    taskENTER_CRITICAL(&dht_spinlock);
    for (int i = 0; i < 40; i++) {
        if(dht_wait_for_level(1, dht_timeout_us , pin) < 0){
            taskEXIT_CRITICAL(&dht_spinlock);
            ESP_LOGE(Sensor::CLASS_TAG, "DHT22: Timeout waiting for bit %d HIGH", i);
            return false;
        }
        int32_t high_duration = dht_wait_for_level(0, dht_timeout_us , pin);
        if(high_duration < 0){
            taskEXIT_CRITICAL(&dht_spinlock);
            ESP_LOGE(Sensor::CLASS_TAG, "DHT22: Timeout waiting for bit %d LOW", i);
            return false;
        }
        if(high_duration > 40) {
            data[i / 8] |= (1 << (7 - (i % 8)));
        }
    }
    taskEXIT_CRITICAL(&dht_spinlock);

    //Checksum control
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if(checksum != data[4]) {
        ESP_LOGE(Sensor::CLASS_TAG , ": DHT22 checksum failure!");
        return false;
    }
    return true;
}

std::unordered_map<std::string , std::string> Sensor::read_sensors(){
    std::unordered_map<std::string , std::string> data_table;

    if(!is_initialized()){
        ESP_LOGE(CLASS_TAG, "Sensor object is not properly initialized!");
        return data_table;
    }

    bool is_dht22_read_suc = dht->dht22_read(pin);
    if(is_dht22_read_suc){
        dht->fail_count = 0;
    } else {
        dht->fail_count++;
        if(dht->fail_count >= 5){
            ESP_LOGE(CLASS_TAG, "DHT22 failed %d consecutive times!" , dht->fail_count);
        }
    }

    auto get_temperature = [this, is_dht22_read_suc]() -> float{
        sd->temperature = INVALID_FLOAT;
        if(is_dht22_read_suc){
            int16_t raw_temp = (((dht->data[2] & 0x7F) << 8) | dht->data[3]);
            sd->temperature = raw_temp * 0.1f;
            if(dht->data[2] & 0x80){
                sd->temperature *= -1;
            }
        }
        return sd->temperature;
    };

    auto get_humidity = [this , is_dht22_read_suc]() -> float{
        sd->humidity = INVALID_FLOAT;
        if(is_dht22_read_suc){
            sd->humidity = ((dht->data[0] << 8) | dht->data[1]) * 0.1f;
        }
        return sd->humidity;
    };

    auto read_adc_percent = [this](const adc_channel_t& channel) -> int32_t{
        return adc->read_percent(channel);
    };

    auto get_soil_moisture = [this , &read_adc_percent]() -> uint16_t{
            uint16_t val = static_cast<uint16_t>(read_adc_percent(pin->SOIL_MOISTURE_ADC));
            sd->soilMoisture = (val <= 100) ? static_cast<uint8_t>(val) : INVALID_UINT8_T;
            return sd->soilMoisture;
    };

    auto get_light = [this , &read_adc_percent]() -> uint16_t{
        uint16_t val = static_cast<uint16_t>(read_adc_percent(pin->LIGHT_SENSOR_ADC));
        sd->lightLevel = (val <= 100) ? static_cast<uint8_t>(val) : INVALID_UINT8_T;
        return sd->lightLevel;
    };

    auto to_str_1dp = [](float v) -> std::string {
        char buffer[16];
        snprintf(buffer, sizeof(buffer), "%.1f", v);
        return std::string(buffer);
    };

    float temp = get_temperature() , hum = get_humidity();
    uint16_t soil = get_soil_moisture() , light = get_light();

    return {{"Temperature",  (temp  == INVALID_FLOAT)   ? "null" : to_str_1dp(temp)},
            {"Humidity",     (hum   == INVALID_FLOAT)   ? "null" : to_str_1dp(hum)},
            {"Soil Moisture",(soil  == INVALID_UINT8_T) ? "null" : std::to_string(soil)},
            {"Light Level",  (light == INVALID_UINT8_T) ? "null" : std::to_string(light)}};
    
}

void Sensor::printStatus(){
    if(this->sd != nullptr){
        ESP_LOGI(CLASS_TAG, "Temperature: %.1f C [%s]",
            sd->temperature,
            (sd->temperature == INVALID_FLOAT) ? "NO DATA" : "OK");

        ESP_LOGI(CLASS_TAG, "Humidity: %.1f %% [%s]",
            sd->humidity,
            (sd->humidity == INVALID_FLOAT) ? "NO DATA" : "OK");

        ESP_LOGI(CLASS_TAG, "Soil Moisture: %u %% [%s]",
            sd->soilMoisture,
            (sd->soilMoisture == INVALID_UINT8_T) ? "NO DATA" : "OK");

        ESP_LOGI(CLASS_TAG, "Light Level: %u %% [%s]",
            sd->lightLevel,
            (sd->lightLevel == INVALID_UINT8_T) ? "NO DATA" : "OK");
    } else {
        ESP_LOGE(CLASS_TAG, "SensorData pointer is null.");
    }
}

bool Sensor::is_initialized(){
    return (pin != nullptr) && (sd != nullptr) && (dht != nullptr) && (adc != nullptr);
}

void Sensor::delete_ptrs(){
    if(pin != nullptr){delete pin; pin = nullptr;}
    if(sd != nullptr){delete sd; sd = nullptr;}
    if(dht != nullptr){delete dht; dht = nullptr;}
    if(adc != nullptr){delete adc; adc = nullptr;}
}

Sensor::~Sensor(){
    delete_ptrs();
}