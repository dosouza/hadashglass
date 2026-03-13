import { HA_CONFIG, MY_ENTITIES, TOP_ENTITIES, WEATHER_ENTITY } from './config.js';
import {
    createConnection, createLongLivedTokenAuth, subscribeEntities, callService
} from "https://unpkg.com/home-assistant-js-websocket?module";

function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    if(timeEl) timeEl.innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if(dateEl) dateEl.innerText = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
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

            // --- CLIMA ---
            try {
                const weather = entities[WEATHER_ENTITY];
                if (weather) {
                    const attrs = weather.attributes;
                    document.getElementById('w-temp').innerText = Math.round(attrs.temperature || 0);
                    document.getElementById('w-humidity').innerText = attrs.humidity || "--";
                    const prob = attrs.precipitation_probability || (attrs.forecast && attrs.forecast[0]?.precipitation_probability) || 0;
                    document.getElementById('w-rain').innerText = prob;
                    document.getElementById('w-condition').innerText = weather.state.toUpperCase();
                }
            } catch (e) { console.warn(e); }

            // --- TOP CHIPS ---
            TOP_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;
                const chipId = `chip-${item.id.replace(/\./g, '-')}`;
                let chip = document.getElementById(chipId);
                if (!chip) {
                    chip = document.createElement('div');
                    chip.id = chipId; chip.className = 'chip';
                    topBar.appendChild(chip);
                    chip.onclick = () => callService(connection, item.id.split('.')[0], 'toggle', { entity_id: item.id });
                }
                chip.classList.toggle('active', data.state === 'on' || data.state === 'open');
                chip.innerHTML = `<span class="icon">${item.icon}</span> <span>${item.label}</span>`;
            });

            // --- GRID DE CÔMODOS ---
            MY_ENTITIES.forEach(item => {
                const data = entities[item.id];
                if (!data) return;

                const roomSlug = item.room.replace(/\s+/g, '-').toLowerCase();
                let roomHeader = document.getElementById(`room-${roomSlug}`);
                if (!roomHeader) {
                    roomHeader = document.createElement('div');
                    roomHeader.id = `room-${roomSlug}`;
                    roomHeader.className = 'room-section';
                    roomHeader.innerText = item.room;
                    grid.appendChild(roomHeader);
                }

                const cardId = `card-${item.id.replace(/\./g, '-')}`;
                let card = document.getElementById(cardId);
                if (!card) {
                    card = document.createElement('div');
                    card.id = cardId; card.className = 'card';
                    card.innerHTML = `<div class="icon" style="font-size:30px; margin-bottom:8px">${item.icon}</div><div class="name">${item.label}</div><div class="status" style="font-size:10px; opacity:0.5">...</div>`;
                    card.onclick = () => callService(connection, "light", "toggle", { entity_id: item.id });
                    roomHeader.after(card);
                }
                const isOn = data.state === 'on';
                card.classList.toggle('on', isOn);
                card.querySelector('.status').innerText = isOn ? "aceso" : "apagado";
            });
        });
    } catch (err) { console.error(err); }
}
connectHA();