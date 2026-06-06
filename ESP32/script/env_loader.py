Import('env')
import os

env_file = os.path.join(env['PROJECT_DIR'], '.env')
config = {}

if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()

for key in ['WIFI_SSID', 'WIFI_PASSWORD', 'RASPBERRY_IP']:
    val = config.get(key, '')
    env.Append(CPPDEFINES=[(key, '\\"%s\\"' % val)])
