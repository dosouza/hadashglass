import { HA_CONFIG, WEATHER_ENTITY, RAIN_DAY_1 } from './config.js';
import { createConnection, createLongLivedTokenAuth, subscribeEntities, callService } from "https://unpkg.com/home-assistant-js-websocket?module";

// NAVEGAÇÃO
document.querySelectorAll('.nav-icon').forEach(icon => {
    icon.onclick = () => {
        document.querySelectorAll('.nav-icon, .page').forEach(el => el.classList.remove('active'));
        icon.classList.add('active');
        document.getElementById(icon.dataset.target).classList.add('active');
    };
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

// RELÓGIO
setInterval(() => {
    const now = new Date();
    document.getElementById('time').innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').innerText = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}, 1000);

// RESOLVER ÁREA (Cascata: Entidade > Dispositivo > Área)
function getAreaInfo(entityId, areas, entities_reg, devices_reg) {
    const reg = entities_reg.find(e => e.entity_id === entityId);
    let areaId = null;
    if (reg) {
        if (reg.area_id) areaId = reg.area_id;
        else if (reg.device_id) {
            const dev = devices_reg.find(d => d.id === reg.device_id);
            if (dev && dev.area_id) areaId = dev.area_id;
        }
    }
    const area = areas.find(a => a.area_id === areaId);
    return area ? area.name : "Sem Área";
}

async function init() {
    try {
        const auth = createLongLivedTokenAuth(HA_CONFIG.URL, HA_CONFIG.TOKEN);
        const conn = await createConnection({ auth });

        const areas = await conn.sendMessagePromise({ type: "config/area_registry/list" });
        const devices = await conn.sendMessagePromise({ type: "config/device_registry/list" });
        const entities_reg = await conn.sendMessagePromise({ type: "config/entity_registry/list" });

        subscribeEntities(conn, entities => {
            renderHome(entities, conn, areas, entities_reg, devices);
            renderList('light', 'lights-list', entities, conn, areas, entities_reg, devices);
            renderList('switch', 'switches-list', entities, conn, areas, entities_reg, devices);
            renderSettings(entities, areas, entities_reg, devices);
            updateWeather(entities);
        });
    } catch (err) {
        console.error("Erro HA:", err);
    }
}

// RENDER HOME DINÂMICA
function renderHome(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = '';
    const visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || "[]");

    const grouped = {};
    visibleIds.forEach(id => {
        if (!entities[id]) return;
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id: id, state: entities[id] });
    });

    Object.keys(grouped).sort().forEach(room => {
        const rDiv = document.createElement('div');
        rDiv.className = 'room-section';
        rDiv.innerText = room;
        grid.appendChild(rDiv);

        grouped[room].forEach(item => {
            const ent = item.state;
            const isOn = ent.state === 'on';
            const domain = item.id.split('.')[0];
            const card = document.createElement('div');
            card.className = `card ${isOn ? 'on' : ''}`;
            
            // Ícone Inteligente por domínio
            let icon = '📱';
            if (domain === 'light') icon = '💡';
            else if (domain === 'switch') icon = '🔌';
            else if (domain === 'sensor') icon = '🌡️';
            else if (domain === 'binary_sensor') icon = '🛡️';
            else if (domain === 'lock') icon = '🔒';

            card.innerHTML = `
                <div style="font-size:30px">${icon}</div>
                <div style="font-size:12px;margin-top:8px;font-weight:500">${ent.attributes.friendly_name || item.id}</div>
                <div style="font-size:10px;opacity:0.6">${ent.state}</div>
            `;
            
            // Só toggle se for domínio de controle
            if (['light', 'switch', 'lock', 'fan'].includes(domain)) {
                card.onclick = () => callService(conn, domain, "toggle", { entity_id: item.id });
            }
            grid.appendChild(card);
        });
    });
}

// AJUSTES: LISTAGEM DE TUDO POR ÁREA
function renderSettings(entities, areas, entities_reg, devices_reg) {
    const container = document.getElementById('settings-entities-list');
    if (!container) return;

    let visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || "[]");
    
    // Filtra todas as entidades válidas, ativas e não ocultas
    const allEntities = Object.keys(entities).filter(id => {
        const reg = entities_reg.find(e => e.entity_id === id);
        return reg && !reg.hidden_by && !reg.disabled_by;
    });

    // Agrupa por área para os ajustes
    const groupedSettings = {};
    allEntities.forEach(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!groupedSettings[room]) groupedSettings[room] = [];
        groupedSettings[room].push(id);
    });

    container.innerHTML = '';
    Object.keys(groupedSettings).sort().forEach(room => {
        const section = document.createElement('div');
        section.className = 'room-section';
        section.style.marginTop = '20px';
        section.innerText = room;
        container.appendChild(section);

        groupedSettings[room].sort().forEach(id => {
            const isVisible = visibleIds.includes(id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `
                <div style="max-width:75%">
                    <div style="font-size:13px">${entities[id].attributes.friendly_name || id}</div>
                    <div style="font-size:10px; opacity:0.5">${id}</div>
                </div>
                <label class="switch switch-visibility">
                    <input type="checkbox" ${isVisible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;

            itemDiv.querySelector('input').onchange = (e) => {
                if (e.target.checked) {
                    if (!visibleIds.includes(id)) visibleIds.push(id);
                } else {
                    visibleIds = visibleIds.filter(v => v !== id);
                }
                localStorage.setItem('visible_home_entities', JSON.stringify(visibleIds));
            };
            container.appendChild(itemDiv);
        });
    });
}

// (renderList e updateWeather permanecem os mesmos das versões anteriores)
function renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg) {
    const container = document.getElementById(containerId);
    const allIds = Object.keys(entities).filter(id => id.startsWith(`${domain}.`));
    const grouped = {};
    allIds.forEach(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id: id, state: entities[id] });
    });
    const activeCount = allIds.filter(id => entities[id].state === 'on').length;
    container.innerHTML = `<div class="summary-header"><span><strong>${activeCount}</strong> ${domain === 'light' ? 'Luzes' : 'Interruptores'} ativos</span>${activeCount > 0 ? `<button class="btn-off" id="off-${domain}">Desligar Tudo</button>` : ''}</div><div id="${containerId}-content" class="list-container"></div>`;
    if(activeCount > 0) document.getElementById(`off-${domain}`).onclick = () => { allIds.forEach(id => { if(entities[id].state === 'on') callService(conn, domain, "turn_off", { entity_id: id }); }); };
    const listContent = document.getElementById(`${containerId}-content`);
    Object.keys(grouped).sort().forEach(room => {
        const roomEntities = grouped[room];
        const activeInRoom = roomEntities.filter(item => item.state.state === 'on');
        const rHeader = document.createElement('div');
        rHeader.className = 'room-section';
        rHeader.innerHTML = `<span>${room}</span>${activeInRoom.length > 0 ? `<button class="btn-off-mini">Desligar Sala</button>` : ''}`;
        listContent.appendChild(rHeader);
        if (activeInRoom.length > 0) rHeader.querySelector('.btn-off-mini').onclick = () => activeInRoom.forEach(item => callService(conn, domain, "turn_off", { entity_id: item.id }));
        roomEntities.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `<span>${item.state.attributes.friendly_name || item.id}</span><label class="switch"><input type="checkbox" ${item.state.state === 'on' ? 'checked' : ''}><span class="slider"></span></label>`;
            itemDiv.querySelector('input').onchange = () => callService(conn, domain, item.state.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: item.id });
            listContent.appendChild(itemDiv);
        });
    });
}

function updateWeather(entities) {
    const w = entities[WEATHER_ENTITY];
    if (!w) return;
    document.getElementById('w-temp').innerText = Math.round(w.attributes.temperature);
    document.getElementById('w-condition').innerText = w.state.replace(/_/g, ' ');
    document.getElementById('w-humidity').innerText = `${w.attributes.humidity}%`;
    document.getElementById('w-rain').innerText = `${entities[RAIN_DAY_1]?.state || 0}%`;
    const icons = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️', 'partlycloudy': '⛅', pouring: '🌧️', 'clear-night': '🌙' };
    document.getElementById('w-icon').innerText = icons[w.state] || '☀️';
}

init();