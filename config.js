// config.js
export const HA_CONFIG = {
    URL: "http://10.10.0.148:8123", // Coloque o IP do seu HA
    TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIwM2U4Yzk3Y2I4ZTk0YThhYmU0YmEzNDc2YzE4MjA4YiIsImlhdCI6MTc3MzM2Mzk1MywiZXhwIjoyMDg4NzIzOTUzfQ.vWqosBkPeI-k_I3z2k0J6D0YxjFfBhsf-Tap6wuHJ0M"         // Cole seu Long-Lived Token aqui
};

// Entidades de status e ações rápidas no TOPO
export const TOP_ENTITIES = [
    { id: "cover.portao_garagem_porta", label: "Portão", icon: "🚗" },
    { id: "sensor.jds_casa", label: "No Wi-Fi", icon: "📱" }
];

export const MY_ENTITIES = [
    { id: "light.sala_estar_teto", label: "Teto", icon: "💡", room: "Sala de Estar" },
    { id: "light.quarto_visita_visita", label: "Teto", icon: "🛏️", room: "Quarto Visita" },
    { id: "light.quarto_sophia_closet", label: "Closet", icon: "💡", room: "Quarto Sophia" },
    { id: "light.quarto_sophia_teto", label: "Teto", icon: "💡", room: "Quarto Sophia" },
    { id: "light.lavanderia", label: "Teto", icon: "🧺", room: "Lavanderia" }
];

// Novos sensores para a lógica inteligente de chuva
export const RAIN_DAY_1 = "sensor.casa_accuweather_thunderstorm_probability_day_1";
export const RAIN_NIGHT_1 = "sensor.casa_accuweather_thunderstorm_probability_night_1";
export const WEATHER_ENTITY = "weather.casa_accuweather"; // Verifique se o ID está correto