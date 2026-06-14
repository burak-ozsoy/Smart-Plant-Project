

FILE(GLOB_RECURSE app_sources ${CMAKE_SOURCE_DIR}/src/*.*)

idf_component_register(
    SRCS
        "main.cpp"
        "Sensor.cpp"
        "JSONTransfer.cpp"
        "Actuator.cpp"
        "Threshold.cpp"
    INCLUDE_DIRS
        "../include"
    REQUIRES
        esp_wifi
        esp_event
        esp_netif
        lwip
        mqtt
        nvs_flash
        log
        driver
        freertos
        esp_adc
)
