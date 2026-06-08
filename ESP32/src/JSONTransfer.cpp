#include "JSONTransfer.hpp"

static constexpr const char* CLASS_TAG = "JSON_Transfer";

void JSON_Transfer::wifi_event_handler(void* arg, esp_event_base_t base, int32_t event_id, void* data) {
    JSON_Transfer* self = static_cast<JSON_Transfer*>(arg);

    if(base == WIFI_EVENT){
        if (event_id == WIFI_EVENT_STA_DISCONNECTED) {
            self->w->wifi_connected = false;
            self->w->mqtt_connected = false;
            ESP_LOGW(CLASS_TAG, "WiFi disconnected, retrying...");
            esp_wifi_connect();
        }
    } else if(base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP){
        ip_event_got_ip_t* event = static_cast<ip_event_got_ip_t*>(data);
        snprintf(self->local_ip, sizeof(self->local_ip), IPSTR, IP2STR(&event->ip_info.ip));
        self->w->wifi_connected = true;
        ESP_LOGI(CLASS_TAG, "WiFi connected. IP: %s", self->local_ip);

        esp_mqtt_client_start(self->w->mqtt_client);
    }
}

void JSON_Transfer::mqtt_event_handler(void* arg, esp_event_base_t base, int32_t event_id, void* data) {
    JSON_Transfer* self = static_cast<JSON_Transfer*>(arg);
    esp_mqtt_event_handle_t event = static_cast<esp_mqtt_event_handle_t>(data);

    switch (static_cast<esp_mqtt_event_id_t>(event_id)) {
        case MQTT_EVENT_CONNECTED:
            self->w->mqtt_connected = true;
            // esp_mqtt_client_subscribe(self->w->mqtt_client, self->w->subscriber_topic.c_str(), 0);
            // ESP_LOGI(CLASS_TAG, "MQTT connected, subscribed to '%s'", self->w->subscriber_topic.c_str());
            ESP_LOGI(CLASS_TAG, "MQTT connected");
            break;
        case MQTT_EVENT_DISCONNECTED:
            self->w->mqtt_connected = false;
            ESP_LOGW(CLASS_TAG, "MQTT disconnected");
            break;
        // case MQTT_EVENT_DATA: { 
        //     std::string topic(event->topic, event->topic_len);
        //     std::string payload(event->data, event->data_len);
        //     self->receive_and_apply(topic, payload);
        //     break;
        // }
        case MQTT_EVENT_ERROR:
            ESP_LOGE(CLASS_TAG, "MQTT error occurred");
          break;
        default:
            break;
    }
}


void JSON_Transfer::Wifi::init_wifi() {
    // subscriber_topic = "from_" + std::string(raspberry_ip ? raspberry_ip : "");
    netif = esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    wifi_config_t wifi_cfg = {};
    strncpy(reinterpret_cast<char*>(wifi_cfg.sta.ssid), ssid, sizeof(wifi_cfg.sta.ssid));
    strncpy(reinterpret_cast<char*>(wifi_cfg.sta.password), pwd, sizeof(wifi_cfg.sta.password));

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg);
    esp_wifi_start();
    esp_wifi_connect();
}


void JSON_Transfer::Wifi::init_mqtt(void* parent_instance) {
    char uri[64];
    snprintf(uri, sizeof(uri), "mqtt://%s:%d", raspberry_ip ? raspberry_ip : "0.0.0.0", port);

    esp_mqtt_client_config_t mqtt_cfg = {};
    mqtt_cfg.broker.address.uri = uri;
    mqtt_cfg.buffer.size = MQTT_BUFFER_SIZE;

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    if(mqtt_client == nullptr){
        ESP_LOGE("Wifi", "esp_mqtt_client_init failed!");
        return;
    }
    esp_mqtt_client_register_event(
        mqtt_client,
        static_cast<esp_mqtt_event_id_t>(ESP_EVENT_ANY_ID),
        JSON_Transfer::mqtt_event_handler,
        parent_instance
    );
}


JSON_Transfer::JSON_Transfer(SemaphoreHandle_t mtx){
    if(mtx != nullptr){
        this->shared_mtx = mtx;
        this->is_mtx_for_json_class = false; 
    } else {
        this->shared_mtx = xSemaphoreCreateMutex();
        this->is_mtx_for_json_class = true;
    }
    if(this->act == nullptr) this->act = new (std::nothrow) Actuator();

    // Register event handlers BEFORE creating Wifi (which calls esp_wifi_connect
    // internally). Avoids a race condition where IP/WiFi events fire before handlers
    // are registered.
    esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &JSON_Transfer::wifi_event_handler, this);
    esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &JSON_Transfer::wifi_event_handler, this);

    if(this->w == nullptr) this->w = new (std::nothrow) Wifi(this);

    if(!is_initialized()){
        esp_event_handler_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID, &JSON_Transfer::wifi_event_handler);
        esp_event_handler_unregister(IP_EVENT, IP_EVENT_STA_GOT_IP, &JSON_Transfer::wifi_event_handler);
        delete_ptrs();
        ESP_LOGE(CLASS_TAG , ": JSON_Transfer memalloc failed!");
        return;
    }

}

bool JSON_Transfer::ensure_connected() {
    if (w == nullptr) return false;
    if (!w->wifi_connected) {
        ESP_LOGW(CLASS_TAG, "WiFi not connected yet!");
        return false;
    }
    if (!w->mqtt_connected) {
        ESP_LOGW(CLASS_TAG, "MQTT not connected yet!");
        return false;
    }
    return true;
}

void JSON_Transfer::read_and_send() {
    if (act == nullptr || act->s == nullptr || act->s->sd == nullptr) {
        ESP_LOGE(CLASS_TAG, "Either actuator or sensor pointer is null!");
        return;
    }

    JsonDocument json_to_be_sent;
    std::unordered_map<std::string, std::string> sensor_data = act->s->read_sensors();
    act->call_control_actuators();
    write_sensor_data(sensor_data, json_to_be_sent);
    write_actuator_data(json_to_be_sent);

    json_to_be_sent["Publisher"] = local_ip;
    if (w != nullptr) json_to_be_sent["Subscriber"] = w->raspberry_ip;

    if (ensure_connected()) {
        send_json_to_raspberry(json_to_be_sent);
    } else {
        ESP_LOGE(CLASS_TAG, "No connection, unable to send data to raspberry");
    }
}


void JSON_Transfer::write_sensor_data(const std::unordered_map<std::string, std::string>& data, JsonDocument& json_to_be_sent){
    JsonArray sensor_arr = json_to_be_sent["sensor_data"].to<JsonArray>();
    for(const auto& pair : data){
        JsonObject obj = sensor_arr.add<JsonObject>();
        obj["data"] = pair.first;
        obj["value"] = pair.second;
        obj["type"] = (pair.first == "Temperature" || pair.first == "Humidity") ? "float" : "unsigned short";
        obj["unit"] = (pair.first == "Temperature") ? "C" : "%";
    }
}

void JSON_Transfer::write_actuator_data(JsonDocument& json_to_be_sent){
    if (act->as == nullptr) {
        json_to_be_sent["fanOn"] = "NaN"; json_to_be_sent["growLightOn"] = "NaN"; json_to_be_sent["pumpOn"] = "NaN";
        return;
    }
    json_to_be_sent["fanOn"] = act->as->fanOn;
    json_to_be_sent["growLightOn"] = act->as->growLightOn;
    json_to_be_sent["pumpOn"] = act->as->pumpOn;
}


void JSON_Transfer::send_json_to_raspberry(JsonDocument& json_to_be_sent){
    char buffer[MQTT_BUFFER_SIZE];
    size_t len = serializeJsonPretty(json_to_be_sent, buffer, sizeof(buffer));

    std::string topic = "sensor_data_from/" + std::string(local_ip);
    int msg_id = esp_mqtt_client_publish(w->mqtt_client, topic.c_str(), buffer, static_cast<int>(len), 0, 0);

    if (msg_id < 0) {
        ESP_LOGE(CLASS_TAG, "MQTT publish failed! (%d byte)", static_cast<int>(len));
    } else {
        ESP_LOGI(CLASS_TAG, "Data sent, msg_id=%d (%d byte)", msg_id, static_cast<int>(len));
    }
}

// void JSON_Transfer::receive_and_apply(const std::string& topic, const std::string& payload){
//     if (topic != w->subscriber_topic) return;
//     if (act == nullptr) return;
// 
//     JsonDocument received_json;
//     DeserializationError err = deserializeJson(received_json, payload);
//     if (err) {
//         ESP_LOGE(CLASS_TAG, "JSON parse error: %s", err.c_str());
//         return;
//     }
// 
//     if (received_json["topic"] == "actuator_request") {
//         if(xSemaphoreTake(shared_mtx , pdMS_TO_TICKS(1000)) == pdTRUE){
//         
//             std::unordered_map<std::string, bool> requests = {
//                 {"pumpOn", received_json["pumpOn"] | false},
//                 {"growLightOn", received_json["growLightOn"] | false},
//                 {"fanOn", received_json["fanOn"] | false}
//             };
//             act->activate_actuators(requests);
//             xSemaphoreGive(shared_mtx);
//             ESP_LOGI(CLASS_TAG, "Actuator command received and applied.");
//         }
//     }
// }


void JSON_Transfer::mqtt_client_loop(){
    if (!ensure_connected())
        ESP_LOGD(CLASS_TAG, "Waiting for connection...");
}

void JSON_Transfer::printStatus(){
    if(act != nullptr){
        ESP_LOGI(CLASS_TAG, "===== System Status =====");
        act->printStatus();
        if(act->s != nullptr) act->s->printStatus();
        ESP_LOGI(CLASS_TAG, "WiFi: %s | MQTT: %s | IP: %s",
            (w && w->wifi_connected) ? "Connected" : "Disconnected",
            (w && w->mqtt_connected) ? "Connected" : "Disconnected",
            local_ip);
        ESP_LOGI(CLASS_TAG, "=========================");
    }
}

void JSON_Transfer::send(){ 
    read_and_send(); 
}

bool JSON_Transfer::is_initialized(){
    return (act != nullptr) && act->is_initialized() &&
           (w != nullptr) && (w->mqtt_client != nullptr) &&
           (shared_mtx != nullptr);
}

void JSON_Transfer::delete_ptrs(){
    if(act != nullptr){delete act; act = nullptr;}
    if(w != nullptr){delete w; w = nullptr;}
    if(shared_mtx != nullptr && is_mtx_for_json_class){
        vSemaphoreDelete(shared_mtx);
        shared_mtx = nullptr;
    }
}

JSON_Transfer::~JSON_Transfer(){
    esp_event_handler_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID, &JSON_Transfer::wifi_event_handler);
    esp_event_handler_unregister(IP_EVENT, IP_EVENT_STA_GOT_IP, &JSON_Transfer::wifi_event_handler);
    if(w && w->mqtt_client){
        esp_mqtt_client_stop(w->mqtt_client); 
        esp_mqtt_client_destroy(w->mqtt_client);
        w->mqtt_client = nullptr;
    }
    delete_ptrs();
}