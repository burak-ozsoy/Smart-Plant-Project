#!/bin/bash

#color codes
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[1;31m'
GREEN='\033[1;32m'
RESET='\033[0m'

get_sudo_password() {
    local attempts=0
    local max_attempts=3

    while [ $attempts -lt $max_attempts ]; do
        read -s -p "$(echo -e "${BLUE}[sudo]${RESET} Enter sudo password: ")" SUDO_PASS
        echo ""

        # Şifreyi doğrula
        if echo "$SUDO_PASS" | sudo -S true 2>/dev/null; then
            echo -e "${GREEN}SUCCESS:${RESET} Password accepted"
            break
        else
            attempts=$((attempts + 1))
            remaining=$((max_attempts - attempts))
            if [ $remaining -gt 0 ]; then
                echo -e "${RED}ERROR:${RESET} Wrong password. $remaining attempt(s) remaining"
            else
                echo -e "${RED}ERROR:${RESET} Too many wrong attempts. Exiting..."
                exit 1
            fi
        fi
    done
}

sudo_command(){
    echo "$SUDO_PASS" | sudo -S "$@" 2>/dev/null
}

get_sudo_password

run_apt_get_upd=false
apt_get_upd(){
    if [ "$run_apt_get_upd" = false ]; then
        echo -e "${BLUE}NOTE:${RESET} Running sudo apt-get update command"
        sudo_command apt-get update
        run_apt_get_upd=true
    fi
}

if ! command -v python3 >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} python3 not found - installing 'python3' package"
    sudo_command apt-get install -y python3
fi
if ! command -v pip3 >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} pip3 not found - installing 'python3-pip' package"
    sudo_command apt-get install -y python3-pip
fi
if ! systemctl status mosquitto >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} Mosquitto broker is not installed - installing 'mosquitto' package"
    sudo_command apt-get install -y mosquitto
fi

libraries=(firebase-auth paho-mqtt websockets opencv-python python-dotenv google-cloud-firestore)
for lib in "${libraries[@]}"; do
    if ! python3 -m pip show "$lib" >/dev/null 2>&1; then
        echo -e "${YELLOW}WARNING:${RESET} $lib is not installed - installing..."
        python3 -m pip install "$lib" --break-system-packages
    else
        echo -e "${GREEN}SUCCESS:${RESET} $lib is already installed"
    fi
done

check_and_open_port() {
    local port=$1
    local label=$2

    if ss -tuln | grep -q ":$port "; then
        echo -e "${GREEN}SUCCESS:${RESET} Port-${port} for ${label} is already active"
    else
        echo -e "${YELLOW}WARNING:${RESET} Port-${port} for ${label} is not active - attempting to open..."

        if command -v ufw >/dev/null 2>&1; then
            if sudo_command ufw status | grep -q "Status: active"; then
                sudo_command ufw allow $port
                echo -e "${GREEN}SUCCESS:${RESET} Port-${port} for ${label} allowed via ufw"
            fi
        else
            echo -e "${YELLOW}WARNING:${RESET} ufw not found, skipping firewall rule"
        fi 

        if [ "$port" = "1883" ]; then
            MOSQ_CONF="/etc/mosquitto/mosquitto.conf"
            if ! grep -q "listener 1883" "$MOSQ_CONF" 2>/dev/null; then
                echo "listener 1883" | sudo tee -a "$MOSQ_CONF"
                echo "allow_anonymous true" | sudo tee -a "$MOSQ_CONF"
                echo -e "${BLUE}NOTE:${RESET} Added listener 1883 to mosquitto.conf"
            fi
            sudo_command systemctl restart mosquitto
            sleep 1
        fi

        if ss -tuln | grep -q ":$port "; then
            echo -e "${GREEN}SUCCESS:${RESET} Port-${port} for ${label} is now active"
        else
            echo -e "${RED}ERROR:${RESET} Port-${port} for ${label} could not be activated"
        fi
    fi
}

check_and_open_port 1883 "MQTT"

sudo_command systemctl enable mosquitto
sudo_command systemctl start mosquitto

#check directories and folders before executing project files
current_dir=$(pwd)
if [ "$current_dir" == "~/Raspberry" ] || [ "$current_dir" == "home/$(whoami)/Raspberry" ]; then
    dir=$current_dir
else
    echo -e "${BLUE}NOTE:${RESET} Searching for project in local"
    dir=$(find / -type d -iname "Raspberry" -print -quit 2>/dev/null)
fi

if [ -z "$dir" ]; then
    echo -e "${RED}ERROR:${RESET}Please include raspberry project!"
    exit 1
else
    echo -e "${BLUE}NOTE:${RESET} Project found under ${dir}"
    file_not_found=false
    folder_not_found=false
    for folder in camera firebase MQTT; do
        if [ ! -d "$dir/$folder" ]; then
            echo -e "${RED}ERROR:${RESET} Folder ${folder} cannot be found under ${dir} directory"
            folder_not_found=true
        fi
        if [ "$folder" = "camera" ]; then
            if [ -f "$dir/$folder/camera.py" ]; then
                echo -e "${GREEN}SUCCESS:${RESET} camera.py exists under ${dir}/${folder} directory"
            else
                echo -e "${RED}ERROR:${RESET} camera.py does not exists under ${dir}/${folder} directory"
                file_not_found=true
            fi
        elif [ "$folder" = "firebase" ]; then
            if [ f "$dir/$folder/send_to_firestore.py" ]; then
                echo -e "${GREEN}SUCCESS:${RESET} send_to_firestore.py exists under ${dir}/${folder} directory"
            else
                echo -e "${RED}ERROR:${RESET} send_to_firestore.py does not exists under ${dir}/${folder} directory"
                file_not_found=true
            fi
        elif [ "$folder" = "MQTT" ]; then
            if [ -f "$dir/$folder/mqtt_broker.py" ]; then
                echo -e "${GREEN}SUCCESS:${RESET} mqtt_broker.py exists under ${dir}/${folder} directory"
            else
                echo -e "${RED}ERROR:${RESET} mqtt_broker.py does not exists under ${dir}/${folder} directory"
                file_not_found=true
            fi
        fi
        done
    if [ "$file_not_found" = true ]  || [ "$folder_not_found" = true ]; then
        echo -e "${RED}ERROR:${RESET} Execution of this project is ${RED}FAILED!${RESET}"
        if [ "$file_not_found" = true ]; then
            echo -e "${BLUE}NOTE:${RESET} Please include the missing file(s) under the correct folder"
        else
            echo -e "${BLUE}NOTE:${RESET} Please include the missing folder(s) under the correct folder"
        fi
        exit 1
    fi
fi

sudo chmod 700 "$dir"/*
echo -e "${BLUE}NOTE:${RESET}: Setting CPU Core 0 to run mqtt_broker.py"
echo -e "${BLUE}NOTE:${RESET}: Setting CPU Core 1 , 2 and 3 to run camera.py"
#taskset -c 0 python3 "$dir/MQTT/mqtt_broker.py" &
#taskset -c 1,2,3 python3 "$dir/camera/camera.py" &