export const MOCK_SENSOR_DATA = {
  temperature: 24.5, // °C
  humidity: 60, // %
  lightIntensity: 850, // lux
  soilMoisture: 45, // %
};

export const MOCK_SYSTEM_STATUS = {
  pump: false,
  light: true,
  fan: false,
};

export const MOCK_DERIVED_DATA = {
  wateringNeed: 75, // %
  lightAdequacy: 'Optimal', // text
  overallStatus: 'Healthy', // text
};

export const MOCK_CHART_DATA = {
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  temperature: [20, 19, 22, 26, 25, 22],
  humidity: [65, 66, 60, 55, 58, 62],
  light: [0, 0, 400, 900, 750, 100],
  soil: [50, 48, 45, 42, 40, 45], // went up after watering maybe
};
