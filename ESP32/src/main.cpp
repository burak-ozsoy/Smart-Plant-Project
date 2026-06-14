#include "JSONTransfer.hpp"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "nvs_flash.h"        
#include "esp_netif.h"        
#include "esp_event.h" 

static constexpr const char* MAIN_TAG = "Main";
static SemaphoreHandle_t g_data_mutex = nullptr;
static JSON_Transfer* g_jt = nullptr;

void sensor_actuator_send_task(void*) {
    while (true) {
        if (xSemaphoreTake(g_data_mutex, pdMS_TO_TICKS(500)) == pdTRUE) {
            g_jt->read_and_send();
            xSemaphoreGive(g_data_mutex);
        } else {
            ESP_LOGW(MAIN_TAG, "Failed to acquire mutex, skipping cycle.");
        }
        vTaskDelay(pdMS_TO_TICKS(SENSOR_READ_PERIOD_MS));
    }
}

void monitor_task(void*) {
    while (true) {
        vTaskDelay(pdMS_TO_TICKS(MONITOR_PRINT_PERIOD_MS));
        if (g_jt != nullptr) {
            g_jt->printStatus();
        }
    }
}

extern "C" void app_main() {
    ESP_LOGI(MAIN_TAG, "System is initialized!");

    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();

    g_data_mutex = xSemaphoreCreateMutex();
    if (g_data_mutex == nullptr) {
        ESP_LOGE(MAIN_TAG, "Unable to create mutex! Stopping the system...");
        return;
    }

    g_jt = new (std::nothrow) JSON_Transfer(g_data_mutex);
    if (g_jt == nullptr || !g_jt->is_initialized()) {
        ESP_LOGE(MAIN_TAG, "Unable to initialize JSON_Transfer object");
        delete g_jt;
        g_jt = nullptr;
        return;
    }

    ESP_LOGI(MAIN_TAG, "Waiting for DHT22 sensor stabilization...");
    vTaskDelay(pdMS_TO_TICKS(2000));
    xTaskCreatePinnedToCore(sensor_actuator_send_task,
                            "sensor_send",
                            16384,
                            nullptr,
                            5,
                            nullptr,
                            0);

    xTaskCreatePinnedToCore(monitor_task,
                            "monitor",
                            4096,
                            nullptr,
                            2,
                            nullptr,
                            1);

}