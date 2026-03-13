import { HA_CONFIG, MY_ENTITIES, TOP_ENTITIES, WEATHER_ENTITY, RAIN_DAY_1, RAIN_NIGHT_1 } from './config.js';
import {
    createConnection, createLongLivedTokenAuth, subscribeEntities, callService
} from "https://unpkg.com/home-assistant-js-websocket?module";

// 1. RELÓGIO
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

            // 2. CLIMA (FIX FINAL %%)
            try {
                const weather = entities[WEATHER_ENTITY];
                if (weather) {
                    const attrs = weather.attributes;
                    const hour = new Date().getHours();

                    // Limpeza radical de símbolos para evitar o 93%%
                    const cleanHum = String(attrs.humidity || 0).replace(/[^0-9]/g, '');
                    document.getElementById('w-temp').innerText = Math.round(attrs.temperature || 0);
                    document.getElementById('w-humidity').innerText = cleanHum + "%";

                    // Previsão Inteligente
                    let fRaw = (hour >= 6 && hour < 18) ? entities[RAIN_NIGHT_1]?.state : entities[RAIN_DAY_1]?.state;
                    const cleanForecast = String(fRaw || 0).replace(/[^0-9]/g, '');
                    document.getElementById('w-rain').innerText = cleanForecast + "% +1";

                    const translations = { 'pouring': 'Torrencial', 'rainy': 'Chuvoso', 'sunny': 'Ensolarado', 'cloudy': 'Nublado', 'partlycloudy': 'Parcialmente Nublado', 'lightning-rainy': 'Tempestade', 'clear-night': 'Noite Limpa' };
                    document.getElementById('w-condition').innerText = translations[weather.state.toLowerCase()] || weather.state.toUpperCase();
                }
            } catch (e) { console.warn(e); }

            // 3. RENDERIZAÇÃO E VIBRAÇÃO
            if (grid) grid.innerHTML = '';
            if (topBar) topBar.innerHTML = '';

            // CHIPS (Favoritos)
            TOP_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;
                const chip = document.createElement('div');
                chip.className = `chip ${ (data.state === 'on' || data.state === 'open') ? 'active' : '' }`;
                chip.innerHTML = `<span class="icon">${item.icon}</span> <span>${item.label}</span>`;
                
                chip.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(40); // Vibração curta ao tocar
                    callService(connection, item.id.split('.')[0], 'toggle', { entity_id: item.id });
                };
                topBar.appendChild(chip);
            });

            // CARDS E ROOMS (Divisões Restauradas)
            let currentRoom = "";
            MY_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;

                if (item.room !== currentRoom) {
                    currentRoom = item.room;
                    const roomHeader = document.createElement('div');
                    roomHeader.className = 'room-section';
                    roomHeader.style.gridColumn = "1 / -1";
                    roomHeader.innerText = currentRoom;
                    grid.appendChild(roomHeader);
                }

                const card = document.createElement('div');
                const isOn = data.state === 'on' || data.state === 'open';
                card.className = `card ${isOn ? 'on' : ''}`;
                card.innerHTML = `
                    <div class="icon" style="font-size:30px; margin-bottom:8px">${item.icon}</div>
                    <div class="name">${item.label}</div>
                    <div class="status" style="font-size:10px; opacity:0.5">${isOn ? "ACESO" : "APAGADO"}</div>
                `;
                
                card.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(50); // Vibração ao tocar no card
                    callService(connection, item.id.split('.')[0], "toggle", { entity_id: item.id });
                };
                grid.appendChild(card);
            });
        });
    } catch (err) { console.error(err); }
}
connectHA();