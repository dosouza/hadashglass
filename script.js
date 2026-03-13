import { HA_CONFIG, MY_ENTITIES, TOP_ENTITIES, WEATHER_ENTITY, RAIN_DAY_1, RAIN_NIGHT_1 } from './config.js';
import {
    createConnection, createLongLivedTokenAuth, subscribeEntities, callService
} from "https://unpkg.com/home-assistant-js-websocket?module";

// ==========================================
// 1. RELÓGIO E DATA
// ==========================================
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    
    if(timeEl) timeEl.innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if(dateEl) dateEl.innerText = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(updateClock, 1000);
updateClock();

async function connectHA() {
    try {
        const auth = createLongLivedTokenAuth(HA_CONFIG.URL, HA_CONFIG.TOKEN);
        const connection = await createConnection({ auth });

        subscribeEntities(connection, (entities) => {
            const grid = document.getElementById('dashboard-grid');
            const topBar = document.getElementById('top-bar');

            // ==========================================
            // 2. LÓGICA DE CLIMA (CORREÇÃO DE % E +1)
            // ==========================================
            try {
                const weather = entities[WEATHER_ENTITY];
                if (weather) {
                    const state = weather.state.toLowerCase();
                    const attrs = weather.attributes;
                    const hour = new Date().getHours();

                    // Traduções e Ícones
                    const translations = { 'pouring': 'Torrencial', 'rainy': 'Chuvoso', 'sunny': 'Ensolarado', 'cloudy': 'Nublado', 'partlycloudy': 'Parcialmente Nublado', 'lightning-rainy': 'Tempestade', 'clear-night': 'Noite Limpa' };
                    const icons = { 'pouring': '🌧️', 'rainy': '🌦️', 'sunny': '☀️', 'cloudy': '☁️', 'partlycloudy': '⛅', 'lightning-rainy': '⛈️', 'clear-night': '🌙' };

                    // CORREÇÃO UMIDADE: Removemos o "%" extra para evitar o "93%%"
                    const humidityValue = attrs.humidity || "--";
                    document.getElementById('w-temp').innerText = Math.round(attrs.temperature || 0);
                    document.getElementById('w-humidity').innerText = humidityValue + "%";

                    // CORREÇÃO PREVISÃO (+1): Formatação exata "16% +1"
                    let forecastValue = 0;
                    if (hour >= 6 && hour < 18) {
                        forecastValue = entities[RAIN_NIGHT_1]?.state || 0;
                    } else {
                        forecastValue = entities[RAIN_DAY_1]?.state || 0;
                    }

                    // Garantimos que o valor seja apenas o número antes de montar a string
                    const cleanForecast = String(forecastValue).replace('%', '').trim();
                    document.getElementById('w-rain').innerText = cleanForecast + "% +1";

                    document.getElementById('w-condition').innerText = translations[state] || state.toUpperCase();
                    document.getElementById('w-icon').innerText = icons[state] || '🌡️';
                }
            } catch (e) { console.warn("Erro no Clima:", e); }

            // ==========================================
            // 3. RENDERIZAÇÃO DE INTERFACE (CARDS E CHIPS)
            // ==========================================
            // Limpa containers para evitar duplicatas
            if (grid) grid.innerHTML = '';
            if (topBar) topBar.innerHTML = '';

            // Renderiza os Chips Superiores (Favoritos)
            TOP_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;
                const chip = document.createElement('div');
                chip.className = `chip ${ (data.state === 'on' || data.state === 'open') ? 'active' : '' }`;
                chip.innerHTML = `<span class="icon">${item.icon}</span> <span>${item.label}</span>`;
                chip.onclick = () => callService(connection, item.id.split('.')[0], 'toggle', { entity_id: item.id });
                topBar.appendChild(chip);
            });

            // Renderiza os Cards de Dispositivos por Cômodo
            MY_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;

                const card = document.createElement('div');
                const isOn = data.state === 'on' || data.state === 'open';
                card.className = `card ${isOn ? 'on' : ''}`;
                
                let statusText = isOn ? (data.state === 'open' ? "ABERTO" : "ACESO") : "APAGADO";
                
                card.innerHTML = `
                    <div class="icon" style="font-size:30px; margin-bottom:8px">${item.icon}</div>
                    <div class="name">${item.label}</div>
                    <div class="status" style="font-size:10px; opacity:0.5">${statusText}</div>
                `;
                
                card.onclick = () => callService(connection, item.id.split('.')[0], "toggle", { entity_id: item.id });
                grid.appendChild(card);
            });
        });
    } catch (err) { console.error("Erro Conexão HA:", err); }
}

connectHA();