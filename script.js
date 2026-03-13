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
            // 2. LÓGICA DE CLIMA (FIX: 93% e 16% +1)
            // ==========================================
            try {
                const weather = entities[WEATHER_ENTITY];
                if (weather) {
                    const state = weather.state.toLowerCase();
                    const attrs = weather.attributes;
                    const hour = new Date().getHours();

                    const translations = { 'pouring': 'Torrencial', 'rainy': 'Chuvoso', 'sunny': 'Ensolarado', 'cloudy': 'Nublado', 'partlycloudy': 'Parcialmente Nublado', 'lightning-rainy': 'Tempestade', 'clear-night': 'Noite Limpa' };
                    const icons = { 'pouring': '🌧️', 'rainy': '🌦️', 'sunny': '☀️', 'cloudy': '☁️', 'partlycloudy': '⛅', 'lightning-rainy': '⛈️', 'clear-night': '🌙' };

                    // CORREÇÃO: Pegamos apenas o número da umidade
                    const humRaw = attrs.humidity || 0;
                    document.getElementById('w-temp').innerText = Math.round(attrs.temperature || 0);
                    document.getElementById('w-humidity').innerText = String(humRaw).replace('%', '') + "%";

                    // CORREÇÃO: Previsão formatada como "16% +1"
                    let forecastRaw = 0;
                    if (hour >= 6 && hour < 18) {
                        forecastRaw = entities[RAIN_NIGHT_1]?.state || 0;
                    } else {
                        forecastRaw = entities[RAIN_DAY_1]?.state || 0;
                    }
                    const cleanForecast = String(forecastRaw).replace('%', '').trim();
                    document.getElementById('w-rain').innerText = cleanForecast + "% +1";

                    document.getElementById('w-condition').innerText = translations[state] || state.toUpperCase();
                    document.getElementById('w-icon').innerText = icons[state] || '🌡️';
                }
            } catch (e) { console.warn("Erro no Clima:", e); }

            // ==========================================
            // 3. RENDERIZAÇÃO (RESTAURADO: CARDS E ROOMS)
            // ==========================================
            if (grid) grid.innerHTML = '';
            if (topBar) topBar.innerHTML = '';

            // Renderiza Chips (Topo)
            TOP_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;
                const chip = document.createElement('div');
                chip.className = `chip ${ (data.state === 'on' || data.state === 'open') ? 'active' : '' }`;
                chip.innerHTML = `<span class="icon">${item.icon}</span> <span>${item.label}</span>`;
                chip.onclick = () => callService(connection, item.id.split('.')[0], 'toggle', { entity_id: item.id });
                topBar.appendChild(chip);
            });

            // Renderiza Seções e Cards (Corrigido: As divisões de Room voltaram)
            let currentRoom = "";
            MY_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;

                // Se o cômodo mudou, cria um novo título de seção
                if (item.room !== currentRoom) {
                    currentRoom = item.room;
                    const roomHeader = document.createElement('div');
                    roomHeader.className = 'room-section';
                    roomHeader.style.gridColumn = "1 / -1"; // Faz o título ocupar a largura toda
                    roomHeader.innerText = currentRoom;
                    grid.appendChild(roomHeader);
                }

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