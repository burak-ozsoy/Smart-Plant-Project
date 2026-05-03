#include "JSONTransfer.hpp"


JSON_Transfer::JSON_Transfer(){
    this->j = new JSON();
    (*j)["Publisher"] = "ESP32";
    (*j)["Subscriber"] = "Raspberry PI";
}

void JSON_Transfer::write_sensor_data(){
    Sensor* s = new Sensor();
    std::unordered_map<std::string , std::string> data = s->read_sensors();
    JSON sensor_data  = JSON::array();
    for(const auto& pair : data){
        JSON j_obj = JSON::object();
        j_obj["data"] = pair.first;
        j_obj["value"] = pair.second;
        if(!pair.first.compare("Temperature") || !pair.first.compare("Humidity")){
            j_obj["type"] = "float";
        } else {
            j_obj["type"] = "unsigned short";
        }
        j_obj["unit"] = (!pair.first.compare("Temperature"))? "C" : "%";
        sensor_data.push_back(j_obj);
    }
    (*j)["sensor_data"] = sensor_data;
    data.clear();
}

void JSON_Transfer::write_time(){
    auto current = std::chrono::system_clock::now();
    std::time_t time = std::chrono::system_clock::to_time_t(current);
    std::tm tm = *std::localtime(&time);

    std::ostringstream oss;
    oss << std::put_time(&tm , "%Y-%m*%d - %H%M%S");

    (*j)["generated_at"] = oss.str();
    oss.clear();
}

void JSON_Transfer::Wifi::set(){
    this->ssid = "";
    this->pwd = "";
    this->raspberry_ip = "192.168.64.6";

    WiFi.begin(ssid, pwd);
    unsigned long wifiStart = millis();
    while(WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000){
        delay(500);
    }
    client.setServer(raspberry_ip, port);
    client.setBufferSize(static_cast<uint16_t>(MQTT_BUFFER_SIZE)); 
    client.connect("ESP32_client");
}

void JSON_Transfer::send_json_to_raspberry(const JSON& j){

    Wifi wifi;
    wifi.set();

    auto start = std::chrono::steady_clock::now();
    while(!wifi.client.connected() &&
          std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - start).count() < 5){
        wifi.client.connect("ESP32_client");
    }

    if(!wifi.client.connected()){
        return;
    }

    wifi.client.loop();

    std::string dumped_json = j.dump(4);
    wifi.client.publish("ESP32_DATA" , dumped_json.c_str());
    dumped_json.clear();
    delay(5000);
}

void JSON_Transfer::send(){
    
    write_sensor_data();
    write_time();
    if(this->j != nullptr){
        send_json_to_raspberry(*this->j);
    }
}

JSON_Transfer::~JSON_Transfer(){
    delete j;
}