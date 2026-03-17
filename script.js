/**
 * PROJETO: HAdashglass Pro - Logic Engine
 * VERSÃO: 3.1.0 — 17/03/2026
 * FEATURES: Nome simplificado, Agrupamento por Áreas, LocalStorage Sync, Filtro de Áreas.
 * COMPATIBILIDADE: Chrome (Mac), Safari (iOS 17+).
 */

import { HA_CONFIG, WEATHER_ENTITY, RAIN_DAY_1 } from './config.js';
import { createConnection, createLongLivedTokenAuth, subscribeEntities, callService } from "https://unpkg.com/home-assistant-js-websocket?module";

// Estado dos filtros de área por página
const areaFilters = {
    home: new Set(),
    lights: new Set(),
    switches: new Set(),
    settings: new Set()
};

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

// SIMPLIFICAÇÃO DE NOMES
function simplifyName(friendlyName, areaName, entityId) {
    let name = friendlyName || entityId.split('.')[1].replace(/_/g, ' ');
    const domain = entityId.split('.')[0];
    if (domain === 'light') name = name.replace(/luz\s*|luz$/gi, '');
    if (areaName && areaName !== "Sem Área") {
        name = name.replace(new RegExp(areaName, 'gi'), '');
    }
    name = name.trim();
    if (!name) name = friendlyName || entityId.split('.')[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// RESOLVER ÁREA
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

// FILTROS DE ÁREA
function loadAreaFilters() {
    ['home', 'lights', 'switches', 'settings'].forEach(key => {
        try {
            const saved = JSON.parse(localStorage.getItem('area_filter_' + key) || '[]');
            saved.forEach(r => areaFilters[key].add(r));
        } catch(e) {}
    });
}

function saveAreaFilter(key, filterSet) {
    localStorage.setItem('area_filter_' + key, JSON.stringify([...filterSet]));
}

function isRoomVisible(room, filterKey) {
    const f = areaFilters[filterKey];
    return f.size === 0 || f.has(room);
}

function renderAreaFilter(filterId, availableRooms, filterKey, onChangeCallback) {
    const bar = document.getElementById(filterId);
    if (!bar) return;
    const activeFilters = areaFilters[filterKey];
    const scrollLeft = bar.scrollLeft;
    bar.innerHTML = '';

    const allChip = document.createElement('div');
    allChip.className = 'area-chip' + (activeFilters.size === 0 ? ' active' : '');
    allChip.innerText = 'Todas';
    allChip.onclick = () => { activeFilters.clear(); saveAreaFilter(filterKey, activeFilters); onChangeCallback(); };
    bar.appendChild(allChip);

    availableRooms.sort().forEach(room => {
        const chip = document.createElement('div');
        chip.className = 'area-chip' + (activeFilters.has(room) ? ' active' : '');
        chip.innerText = room;
        chip.onclick = () => {
            activeFilters.has(room) ? activeFilters.delete(room) : activeFilters.add(room);
            saveAreaFilter(filterKey, activeFilters);
            onChangeCallback();
        };
        bar.appendChild(chip);
    });

    bar.scrollLeft = scrollLeft;
}

// RENDER HOME
function renderHome(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = '';
    const visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || "[]");

    const grouped = {};
    visibleIds.forEach(id => {
        if (!entities[id]) return;
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id, state: entities[id] });
    });

    const allRooms = Object.keys(grouped).sort();
    renderAreaFilter('filter-home', allRooms, 'home', () => renderHome(entities, conn, areas, entities_reg, devices_reg));

    allRooms.forEach(room => {
        if (!isRoomVisible(room, 'home')) return;

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

            let icon = '📱';
            if (domain === 'light') icon = '💡';
            else if (domain === 'switch') icon = '🔌';
            else if (domain === 'sensor') icon = '🌡️';
            else if (domain === 'binary_sensor') icon = '🛡️';

            const displayName = simplifyName(ent.attributes.friendly_name, room, item.id);
            card.innerHTML = `
                <div style="font-size:30px">${icon}</div>
                <div style="font-size:12px;margin-top:8px;font-weight:600">${displayName}</div>
                <div style="font-size:10px;opacity:0.5;margin-top:4px">${ent.state}</div>
            `;
            if (['light', 'switch', 'fan'].includes(domain)) {
                card.onclick = () => callService(conn, domain, "toggle", { entity_id: item.id });
            }
            grid.appendChild(card);
        });
    });
}

// RENDER LISTA (Luzes / Tomadas)
function renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filterKey = domain === 'light' ? 'lights' : 'switches';
    const filterId = 'filter-' + filterKey;

    const allIds = Object.keys(entities).filter(id => id.startsWith(`${domain}.`));
    const grouped = {};
    allIds.forEach(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id, state: entities[id] });
    });

    const allRooms = Object.keys(grouped).sort();
    renderAreaFilter(filterId, allRooms, filterKey, () => renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg));

    const activeCount = allIds.filter(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        return entities[id].state === 'on' && isRoomVisible(room, filterKey);
    }).length;
    const totalActive = allIds.filter(id => entities[id].state === 'on').length;
    const filtrado = areaFilters[filterKey].size > 0 ? `<span style="opacity:0.5;font-size:11px"> (filtrado de ${totalActive})</span>` : '';

    container.innerHTML = `
        <div class="summary-header">
            <span><strong>${activeCount}</strong> ${domain === 'light' ? 'Luzes' : 'Interruptores'} ativos${filtrado}</span>
            ${activeCount > 0 ? `<button class="btn-off" id="off-${domain}">Desligar Tudo</button>` : ''}
        </div>
        <div id="${containerId}-content" class="list-container"></div>
    `;

    if (activeCount > 0) {
        document.getElementById(`off-${domain}`).onclick = () => {
            allIds.forEach(id => {
                const room = getAreaInfo(id, areas, entities_reg, devices_reg);
                if (entities[id].state === 'on' && isRoomVisible(room, filterKey)) {
                    callService(conn, domain, "turn_off", { entity_id: id });
                }
            });
        };
    }

    const listContent = document.getElementById(`${containerId}-content`);
    allRooms.forEach(room => {
        if (!isRoomVisible(room, filterKey)) return;

        const roomEntities = grouped[room];
        const activeInRoom = roomEntities.filter(item => item.state.state === 'on');
        const rHeader = document.createElement('div');
        rHeader.className = 'room-section';
        rHeader.innerHTML = `<span>${room}</span>${activeInRoom.length > 0 ? `<button class="btn-off-mini">Desligar Sala</button>` : ''}`;
        if (activeInRoom.length > 0) {
            rHeader.querySelector('.btn-off-mini').onclick = () => {
                activeInRoom.forEach(item => callService(conn, domain, 'turn_off', { entity_id: item.id }));
            };
        }
        listContent.appendChild(rHeader);

        roomEntities.forEach(item => {
            const displayName = simplifyName(item.state.attributes.friendly_name, room, item.id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `
                <span>${displayName}</span>
                <label class="switch"><input type="checkbox" ${item.state.state === 'on' ? 'checked' : ''}><span class="slider"></span></label>
            `;
            itemDiv.querySelector('input').onchange = () =>
                callService(conn, domain, item.state.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: item.id });
            listContent.appendChild(itemDiv);
        });
    });
}

// RENDER SETTINGS
function renderSettings(entities, areas, entities_reg, devices_reg) {
    const container = document.getElementById('settings-entities-list');
    if (!container) return;
    let visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || "[]");
    const allEntities = Object.keys(entities).filter(id => {
        const reg = entities_reg.find(e => e.entity_id === id);
        return reg && !reg.hidden_by && !reg.disabled_by;
    });

    const groupedSettings = {};
    allEntities.forEach(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!groupedSettings[room]) groupedSettings[room] = [];
        groupedSettings[room].push(id);
    });

    const allRooms = Object.keys(groupedSettings).sort();
    renderAreaFilter('filter-settings', allRooms, 'settings', () => renderSettings(entities, areas, entities_reg, devices_reg));

    container.innerHTML = '';
    allRooms.forEach(room => {
        if (!isRoomVisible(room, 'settings')) return;

        const section = document.createElement('div');
        section.className = 'room-section';
        section.innerText = room;
        container.appendChild(section);

        groupedSettings[room].sort().forEach(id => {
            const isVisible = visibleIds.includes(id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            const state = entities[id].state;
            const isOn = state === 'on';
            const stateColor = isOn ? '#00e676' : state === 'off' ? 'rgba(255,255,255,0.35)' : '#6dd5fa';
            itemDiv.innerHTML = `
                <div style="max-width:70%;display:flex;flex-direction:column;gap:2px">
                    <div style="font-size:13px;display:flex;align-items:center;gap:8px">
                        ${entities[id].attributes.friendly_name || id}
                        <span style="font-size:10px;font-weight:700;color:${stateColor};background:rgba(255,255,255,0.06);padding:2px 7px;border-radius:6px;letter-spacing:0.04em">${state}</span>
                    </div>
                    <div style="font-size:10px;opacity:0.5">${id}</div>
                </div>
                <label class="switch switch-visibility">
                    <input type="checkbox" ${isVisible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            itemDiv.querySelector('input').onchange = (e) => {
                if (e.target.checked) { if (!visibleIds.includes(id)) visibleIds.push(id); }
                else { visibleIds = visibleIds.filter(v => v !== id); }
                localStorage.setItem('visible_home_entities', JSON.stringify(visibleIds));
            };
            container.appendChild(itemDiv);
        });
    });
}

// SISTEMA
function updateSystemTab(entities, areas) {
    const visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || "[]");
    const el = id => document.getElementById(id);
    if (el('sys-total-count'))   el('sys-total-count').innerText   = Object.keys(entities).length;
    if (el('sys-visible-count')) el('sys-visible-count').innerText = visibleIds.filter(id => entities[id]).length;
    if (el('sys-areas-count'))   el('sys-areas-count').innerText   = areas.length;
}

// CLIMA
function updateWeather(entities) {
    const w = entities[WEATHER_ENTITY];
    if (!w) return;
    document.getElementById('w-temp').innerText = Math.round(w.attributes.temperature);
    document.getElementById('w-condition').innerText = w.state.replace(/_/g, ' ');
    document.getElementById('w-humidity').innerText = `${w.attributes.humidity}%`;
    document.getElementById('w-rain').innerText = `${entities[RAIN_DAY_1]?.state || 0}%`;
    const icons = { sunny:'☀️', cloudy:'☁️', rainy:'🌧️', partlycloudy:'⛅', pouring:'🌧️', 'clear-night':'🌙' };
    document.getElementById('w-icon').innerText = icons[w.state] || '☀️';
}

// INIT
async function init() {
    loadAreaFilters();
    try {
        const auth = createLongLivedTokenAuth(HA_CONFIG.URL, HA_CONFIG.TOKEN);
        const conn = await createConnection({ auth });

        const areas        = await conn.sendMessagePromise({ type: "config/area_registry/list" });
        const devices      = await conn.sendMessagePromise({ type: "config/device_registry/list" });
        const entities_reg = await conn.sendMessagePromise({ type: "config/entity_registry/list" });

        subscribeEntities(conn, entities => {
            renderHome(entities, conn, areas, entities_reg, devices);
            renderList('light',  'lights-list',   entities, conn, areas, entities_reg, devices);
            renderList('switch', 'switches-list', entities, conn, areas, entities_reg, devices);
            renderSettings(entities, areas, entities_reg, devices);
            updateWeather(entities);
            updateSystemTab(entities, areas);
        });
    } catch (err) {
        console.error("Erro HA:", err);
    }
}

init();
