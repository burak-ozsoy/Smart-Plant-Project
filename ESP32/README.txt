Before building the ESP32 project, follow the steps given below:

#Prerequisities
  - Install platformio extension(preferred)/application

1) Add a new directory named nlohmann under include file: mkdir include\nlohmann

2) On the projects root directory, open Powershell and run the command:

Invoke-WebRequest -UseBasicParsing `
  -Uri "https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp" `
  -OutFile "include\nlohmann\json.hpp"

or open cmd/developer cmd and run the command:

powershell -Command "New-Item -ItemType Directory -Force 'include\nlohmann'; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp' -OutFile 'include\nlohmann\json.hpp'"

3) Run following commands consecutively:

    pio run -e esp32dev -t clean
    pio run -e esp32dev -v

Note that, follow third step each time you make a change on the project(adjustments, code changes etc.)