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
if ! dpkg -s python3-opencv >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} python3-opencv not found - installing 'python3-opencv' package"
    sudo_command apt-get install -y python3-opencv
fi
if ! dpkg -s python3-picamera2 >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} python3-picamera2 not found - installing 'python3-picamera2' package"
    sudo_command apt-get install -y python3-picamera2
fi
if ! systemctl status mosquitto >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} Mosquitto broker is not installed - installing 'mosquitto' package"
    sudo_command apt-get install -y mosquitto
fi
if ! command -v tailscale >/dev/null 2>&1; then
    apt_get_upd
    echo -e "${YELLOW}WARNING:${RESET} tailscale not found - installing..."
    curl -fsSL https://tailscale.com/install.sh | sh
    echo -e "${GREEN}SUCCESS:${RESET} tailscale installed"
fi
local_ip=$(hostname -I | awk '{print $1}')
subnet=$(echo "$local_ip" | awk -F. '{print $1"."$2"."$3".0/24"}')
if [ -n "$subnet" ]; then
    echo -e "${BLUE}NOTE:${RESET} Detected local subnet: ${subnet}"
    sudo_command tailscale up --advertise-routes="$subnet" 2>/dev/null || \
        echo -e "${YELLOW}WARNING:${RESET} tailscale up failed!"
    echo -e "${BLUE}NOTE:${RESET} Approve the route at https://login.tailscale.com/admin/routes"
else
    echo -e "${RED}ERROR:${RESET} Could not detect local subnet, skipping tailscale route advertisement"
fi

libraries=(firebase-auth paho-mqtt websockets fastapi uvicorn python-dotenv google-cloud-firestore)
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
            if ! grep -q "listener 1883 0.0.0.0" "$MOSQ_CONF" 2>/dev/null; then
                sudo_command sed -i '/^listener 1883/d' "$MOSQ_CONF" 2>/dev/null
                sudo_command bash -c "echo 'listener 1883 0.0.0.0' >> $MOSQ_CONF"
                sudo_command bash -c "echo 'allow_anonymous true' >> $MOSQ_CONF"
                echo -e "${BLUE}NOTE:${RESET} Added listener 1883 0.0.0.0 to mosquitto.conf"
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
check_and_open_port 8766 "Actuator WebSocket"
check_and_open_port 8000 "Camera WebSocket/API"

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
            if [ -f "$dir/$folder/send_to_firebase.py" ]; then
                echo -e "${GREEN}SUCCESS:${RESET} send_to_firebase.py exists under ${dir}/${folder} directory"
            else
                echo -e "${RED}ERROR:${RESET} send_to_firebase.py does not exists under ${dir}/${folder} directory"
                file_not_found=true
            fi
            if [ -f "$dir/$folder/serviceAccountKey.json" ]; then
                echo -e "${GREEN}SUCCESS:${RESET} serviceAccountKey.json exists under ${dir}/${folder} directory"
            else
                echo -e "${RED}ERROR:${RESET} serviceAccountKey.json does not exists under ${dir}/${folder} directory"
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

# Kill old instances so websocket ports don't remain occupied between runs.
old_pids=$(pgrep -f "python3 $dir/MQTT/mqtt_broker.py")
if [ -n "$old_pids" ]; then
    echo -e "${YELLOW}WARNING:${RESET} Found old mqtt_broker.py instance(s). Stopping..."
    kill $old_pids >/dev/null 2>&1
    sleep 1
fi

child_pids=()
cleanup_started=false

cleanup() {
    if [ "$cleanup_started" = true ]; then
        return
    fi
    cleanup_started=true

    echo -e "\n${BLUE}NOTE:${RESET} Stopping child process(es)..."
    for pid in "${child_pids[@]}"; do
        if kill -0 "$pid" >/dev/null 2>&1; then
            kill "$pid" >/dev/null 2>&1
        fi
    done
    wait >/dev/null 2>&1
}

trap cleanup INT TERM EXIT

taskset -c 0 env PYTHONPATH=$(dirname "$dir") python3 "$dir/MQTT/mqtt_broker.py" &
child_pids+=("$!")

taskset -c 1,2,3 env PYTHONPATH=$(dirname "$dir") python3 "$dir/camera/camera.py" &
child_pids+=("$!")

echo -e "${GREEN}SUCCESS:${RESET} Services started. Press Ctrl+C to stop."
wait "${child_pids[@]}"