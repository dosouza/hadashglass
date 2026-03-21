/**
 * PROJETO: HAdashglass P7 - Tablet Logic
 * VERSÃO: 1.0.0 — 20/03/2026
 * DISPOSITIVO: Samsung Galaxy Tab P7 (Sala de Estar)
 * FEATURES: Página P7 exclusiva, duas estrelas por item (P7 + Home), favoritos no HA
 */

import { HA_CONFIG, WEATHER_ENTITY, RAIN_DAY_1 } from './config.js';
import { createConnection, createLongLivedTokenAuth, subscribeEntities, callService } from "https://unpkg.com/home-assistant-js-websocket?module";

// ── FILTROS ────────────────────────────────────────────────────
const areaFilters = {
    home: new Set(), p7: new Set(), lights: new Set(), switches: new Set()
};

const stateFilters = {
    home: 'all', p7: 'all', lights: 'all', switches: 'all'
};

// ── NAVEGAÇÃO ──────────────────────────────────────────────────
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

// ── RELÓGIO ────────────────────────────────────────────────────
setInterval(() => {
    const now = new Date();
    document.getElementById('time').innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').innerText = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}, 1000);

// ── NOMES ──────────────────────────────────────────────────────
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

// ── ÁREA ───────────────────────────────────────────────────────
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

// ── PERSISTÊNCIA DE FILTROS ────────────────────────────────────
function loadAreaFilters() {
    ['home', 'p7', 'lights', 'switches'].forEach(key => {
        try {
            const saved = JSON.parse(localStorage.getItem('area_filter_' + key) || '[]');
            saved.forEach(r => areaFilters[key].add(r));
        } catch(e) {}
    });
    ['home', 'p7', 'lights', 'switches'].forEach(key => {
        const saved = localStorage.getItem('state_filter_' + key);
        if (saved) stateFilters[key] = saved;
    });
}

function saveAreaFilter(key, filterSet) {
    localStorage.setItem('area_filter_' + key, JSON.stringify([...filterSet]));
}

function isRoomVisible(room, filterKey) {
    const f = areaFilters[filterKey];
    return f.size === 0 || f.has(room);
}

function isStateVisible(state, filterKey) {
    const f = stateFilters[filterKey];
    return f === 'all' || state === f;
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

function renderStateFilter(barId, filterKey, labels, onChangeCallback) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.innerHTML = '';
    [
        { value: 'all', label: labels.all },
        { value: 'on',  label: labels.on  },
        { value: 'off', label: labels.off }
    ].forEach(opt => {
        const chip = document.createElement('div');
        chip.className = 'area-chip' + (stateFilters[filterKey] === opt.value ? ' active' : '');
        chip.innerText = opt.label;
        chip.onclick = () => {
            stateFilters[filterKey] = opt.value;
            localStorage.setItem('state_filter_' + filterKey, opt.value);
            onChangeCallback();
        };
        bar.appendChild(chip);
    });
}

// ── ÍCONES ─────────────────────────────────────────────────────
function getLightIcon(isOn) {
    const color  = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    const stroke = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    return `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 21h6M12 3a6 6 0 0 1 4 10.47V17H8v-3.53A6 6 0 0 1 12 3z"
              stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"
              fill="${color}" fill-opacity="${isOn ? '0.3' : '0'}"/>
        <line x1="8" y1="19" x2="16" y2="19" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>
        ${!isOn ? '<line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,80,80,0.7)" stroke-width="2" stroke-linecap="round"/>' : ''}
    </svg>`;
}

function getLightIconP7(isOn) {
    const color  = isOn ? '#64b4ff' : 'rgba(255,255,255,0.25)';
    const stroke = isOn ? '#64b4ff' : 'rgba(255,255,255,0.25)';
    return `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 21h6M12 3a6 6 0 0 1 4 10.47V17H8v-3.53A6 6 0 0 1 12 3z"
              stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"
              fill="${color}" fill-opacity="${isOn ? '0.3' : '0'}"/>
        <line x1="8" y1="19" x2="16" y2="19" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>
        ${!isOn ? '<line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,80,80,0.7)" stroke-width="2" stroke-linecap="round"/>' : ''}
    </svg>`;
}

function getEntityIcon(domain, state) {
    const isOn = state === 'on';
    if (domain === 'light')         return getLightIcon(isOn);
    if (domain === 'switch')        return `<span style="font-size:30px">${isOn ? '🟡' : '⚫'}</span>`;
    if (domain === 'sensor')        return `<span style="font-size:30px">🌡️</span>`;
    if (domain === 'binary_sensor') return `<span style="font-size:30px">${isOn ? '🟢' : '⚫'}</span>`;
    if (domain === 'climate')       return `<span style="font-size:30px">❄️</span>`;
    if (domain === 'media_player')  return `<span style="font-size:30px">${isOn ? '🎵' : '🔇'}</span>`;
    return `<span style="font-size:30px">📱</span>`;
}

function getEntityIconP7(domain, state) {
    const isOn = state === 'on';
    if (domain === 'light')  return getLightIconP7(isOn);
    if (domain === 'switch') return `<span style="font-size:34px">${isOn ? '🟡' : '⚫'}</span>`;
    return `<span style="font-size:34px">📱</span>`;
}

// ── FAVORITOS ──────────────────────────────────────────────────
function getHomeFavorites(entities) {
    const fav = entities['sensor.hadashglass_favorites'];
    return (fav && fav.attributes && fav.attributes.entities) ? fav.attributes.entities : [];
}

function getP7Favorites(entities) {
    const fav = entities['sensor.hadashglass_p7_favorites'];
    return (fav && fav.attributes && fav.attributes.entities) ? fav.attributes.entities : [];
}

function saveFavorite(entityId, starEl, currentList, haEntityId) {
    const isFav = currentList.includes(entityId);
    const newList = isFav
        ? currentList.filter(v => v !== entityId)
        : [...currentList, entityId];

    isFav ? starEl.classList.remove('star-on') : starEl.classList.add('star-on');

    fetch(`${HA_CONFIG.URL}/api/states/${haEntityId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HA_CONFIG.TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'active', attributes: { entities: newList } })
    });
}

// ── RENDER HOME — favoritos compartilhados (igual ao Pro) ──────
function renderHome(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('dashboard-grid');
    const visibleIds = getHomeFavorites(entities);

    const grouped = {};
    visibleIds.forEach(id => {
        if (!entities[id]) return;
        const reg = entities_reg.find(e => e.entity_id === id);
        if (reg && (reg.hidden_by || reg.disabled_by)) return;
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id, state: entities[id] });
    });

    const allRooms = Object.keys(grouped).sort();
    renderAreaFilter('filter-home', allRooms, 'home', () => renderHome(entities, conn, areas, entities_reg, devices_reg));
    renderStateFilter('state-filter-home', 'home',
        { all: 'Todos', on: 'On', off: 'Off' },
        () => renderHome(entities, conn, areas, entities_reg, devices_reg));

    grid.innerHTML = '';

    if (allRooms.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:60px 20px">' +
            '<div style="font-size:40px;margin-bottom:10px">⚙️</div>' +
            '<p>Nenhum favorito no Home.</p>' +
            '<p style="font-size:12px;margin-top:8px">Vá em Ajustes e clique em ⭐ Home nos dispositivos desejados.</p>' +
            '</div>';
        return;
    }

    allRooms.forEach(room => {
        if (!isRoomVisible(room, 'home')) return;
        const roomEntities = grouped[room].filter(item => isStateVisible(item.state.state, 'home'));
        if (roomEntities.length === 0) return;

        const rDiv = document.createElement('div');
        rDiv.className = 'room-section';
        rDiv.innerText = room;
        grid.appendChild(rDiv);

        roomEntities.forEach(item => {
            const ent = item.state;
            const isOn = ent.state === 'on';
            const domain = item.id.split('.')[0];
            const card = document.createElement('div');
            card.className = `card ${isOn ? 'on' : ''}`;
            const displayName = simplifyName(ent.attributes.friendly_name, room, item.id);
            const nameColor = isOn ? '#ffb400' : 'rgba(255,255,255,0.5)';
            card.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:38px">
                    ${getEntityIcon(domain, ent.state)}
                </div>
                <div style="font-size:12px;margin-top:8px;font-weight:600;color:${nameColor}">${displayName}</div>
                <div style="font-size:10px;opacity:0.5;margin-top:4px">${ent.state}</div>
            `;
            if (['light', 'switch', 'fan'].includes(domain)) {
                card.onclick = () => callService(conn, domain, "toggle", { entity_id: item.id });
            }
            grid.appendChild(card);
        });
    });
}

// ── RENDER P7 — favoritos exclusivos do tablet ─────────────────
function renderP7(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('p7-grid');
    const visibleIds = getP7Favorites(entities);

    const grouped = {};
    visibleIds.forEach(id => {
        if (!entities[id]) return;
        const reg = entities_reg.find(e => e.entity_id === id);
        if (reg && (reg.hidden_by || reg.disabled_by)) return;
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id, state: entities[id] });
    });

    const allRooms = Object.keys(grouped).sort();
    renderAreaFilter('filter-p7', allRooms, 'p7', () => renderP7(entities, conn, areas, entities_reg, devices_reg));
    renderStateFilter('state-filter-p7', 'p7',
        { all: 'Todos', on: 'On', off: 'Off' },
        () => renderP7(entities, conn, areas, entities_reg, devices_reg));

    grid.innerHTML = '';

    if (allRooms.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:60px 20px">' +
            '<div style="font-size:40px;margin-bottom:10px">📱</div>' +
            '<p>Nenhum favorito do P7.</p>' +
            '<p style="font-size:12px;margin-top:8px">Vá em Ajustes e clique em ⭐ P7 nos dispositivos desejados.</p>' +
            '</div>';
        return;
    }

    allRooms.forEach(room => {
        if (!isRoomVisible(room, 'p7')) return;
        const roomEntities = grouped[room].filter(item => isStateVisible(item.state.state, 'p7'));
        if (roomEntities.length === 0) return;

        const rDiv = document.createElement('div');
        rDiv.className = 'room-section';
        rDiv.innerText = room;
        grid.appendChild(rDiv);

        roomEntities.forEach(item => {
            const ent = item.state;
            const isOn = ent.state === 'on';
            const domain = item.id.split('.')[0];
            const card = document.createElement('div');
            card.className = `p7-card ${isOn ? 'on' : ''}`;
            const displayName = simplifyName(ent.attributes.friendly_name, room, item.id);
            card.innerHTML = `
                <div class="p7-state-dot"></div>
                <div class="p7-card-icon">${getEntityIconP7(domain, ent.state)}</div>
                <div class="p7-card-name">${displayName}</div>
                <div class="p7-card-area">${room}</div>
            `;
            if (['light', 'switch', 'fan'].includes(domain)) {
                card.onclick = () => callService(conn, domain, "toggle", { entity_id: item.id });
            }
            grid.appendChild(card);
        });
    });
}

// ── RENDER LISTA — com duas estrelas (P7 + Home) ───────────────
function renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filterKey = domain === 'light' ? 'lights' : 'switches';
    const filterId = 'filter-' + filterKey;
    const stateFilterId = 'state-filter-' + filterKey;
    const stateLabels = domain === 'light'
        ? { all: 'Todas', on: 'Acesas', off: 'Apagadas' }
        : { all: 'Todos', on: 'Ligados', off: 'Desligados' };

    const allIds = Object.keys(entities).filter(id => {
        if (!id.startsWith(`${domain}.`)) return false;
        const reg = entities_reg.find(e => e.entity_id === id);
        return !reg || (!reg.hidden_by && !reg.disabled_by);
    });

    const grouped = {};
    allIds.forEach(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push({ id, state: entities[id] });
    });

    const allRooms = Object.keys(grouped).sort();
    renderAreaFilter(filterId, allRooms, filterKey, () => renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg));
    renderStateFilter(stateFilterId, filterKey, stateLabels, () => renderList(domain, containerId, entities, conn, areas, entities_reg, devices_reg));

    const activeCount = allIds.filter(id => {
        const room = getAreaInfo(id, areas, entities_reg, devices_reg);
        return entities[id].state === 'on' && isRoomVisible(room, filterKey) && isStateVisible(entities[id].state, filterKey);
    }).length;
    const totalActive = allIds.filter(id => entities[id].state === 'on').length;
    const filtrado = (areaFilters[filterKey].size > 0 || stateFilters[filterKey] !== 'all')
        ? `<span style="opacity:0.5;font-size:11px"> (filtrado de ${totalActive})</span>` : '';

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
                if (entities[id].state === 'on' && isRoomVisible(room, filterKey) && isStateVisible(entities[id].state, filterKey)) {
                    callService(conn, domain, "turn_off", { entity_id: id });
                }
            });
        };
    }

    const listContent = document.getElementById(`${containerId}-content`);
    const homeFavList = getHomeFavorites(entities);
    const p7FavList   = getP7Favorites(entities);

    allRooms.forEach(room => {
        if (!isRoomVisible(room, filterKey)) return;
        const roomEntities = grouped[room].filter(item => isStateVisible(item.state.state, filterKey));
        if (roomEntities.length === 0) return;

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
            const isP7Fav   = p7FavList.includes(item.id);
            const isHomeFav = homeFavList.includes(item.id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `
                <span>${displayName}</span>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="item-stars">
                        <div class="star-group">
                            <span class="star-btn star-p7 ${isP7Fav ? 'star-on' : ''}">★</span>
                            <span class="star-label">P7</span>
                        </div>
                        <div class="stars-divider"></div>
                        <div class="star-group">
                            <span class="star-btn star-home ${isHomeFav ? 'star-on' : ''}">★</span>
                            <span class="star-label">Home</span>
                        </div>
                    </div>
                    <label class="switch"><input type="checkbox" ${item.state.state === 'on' ? 'checked' : ''}><span class="slider"></span></label>
                </div>
            `;
            itemDiv.querySelector('input').onchange = () =>
                callService(conn, domain, item.state.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: item.id });
            itemDiv.querySelector('.star-p7').onclick = function() {
                saveFavorite(item.id, this, p7FavList, 'sensor.hadashglass_p7_favorites');
            };
            itemDiv.querySelector('.star-home').onclick = function() {
                saveFavorite(item.id, this, homeFavList, 'sensor.hadashglass_favorites');
            };
            listContent.appendChild(itemDiv);
        });
    });
}

// ── SISTEMA ────────────────────────────────────────────────────
function updateSystemTab(entities, areas) {
    const el = id => document.getElementById(id);
    const homeFavs = getHomeFavorites(entities);
    const p7Favs   = getP7Favorites(entities);
    const allLights   = Object.keys(entities).filter(id => id.startsWith('light.') && entities[id].state === 'on');
    const allSwitches = Object.keys(entities).filter(id => id.startsWith('switch.') && entities[id].state === 'on');

    if (el('sys-total-count'))  el('sys-total-count').innerText  = Object.keys(entities).length;
    if (el('sys-p7-count'))     el('sys-p7-count').innerText     = p7Favs.filter(id => entities[id]).length;
    if (el('sys-home-count'))   el('sys-home-count').innerText   = homeFavs.filter(id => entities[id]).length;
    if (el('sys-areas-count'))  el('sys-areas-count').innerText  = areas.length;
    if (el('sys-lights-on'))    el('sys-lights-on').innerText    = allLights.length;
    if (el('sys-switches-on'))  el('sys-switches-on').innerText  = allSwitches.length;
}

// ── CLIMA ──────────────────────────────────────────────────────
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

// ── INIT ───────────────────────────────────────────────────────
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
            renderP7(entities, conn, areas, entities_reg, devices);
            renderList('light',  'lights-list',   entities, conn, areas, entities_reg, devices);
            renderList('switch', 'switches-list', entities, conn, areas, entities_reg, devices);
            updateWeather(entities);
            updateSystemTab(entities, areas);
        });
    } catch (err) {
        console.error("Erro ao conectar ao HA:", err);
    }
}

init();
