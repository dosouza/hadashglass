// config.js
export const HA_CONFIG = {
    URL: "http://10.10.0.148:8123", // Coloque o IP do seu HA
    TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIwM2U4Yzk3Y2I4ZTk0YThhYmU0YmEzNDc2YzE4MjA4YiIsImlhdCI6MTc3MzM2Mzk1MywiZXhwIjoyMDg4NzIzOTUzfQ.vWqosBkPeI-k_I3z2k0J6D0YxjFfBhsf-Tap6wuHJ0M"         // Cole seu Long-Lived Token aqui
};

// Novos sensores para a lógica inteligente de chuva
export const RAIN_DAY_1 = "sensor.casa_accuweather_thunderstorm_probability_day_1";
export const RAIN_NIGHT_1 = "sensor.casa_accuweather_thunderstorm_probability_night_1";
export const WEATHER_ENTITY = "weather.casa_accuweather"; // Verifique se o ID está correto