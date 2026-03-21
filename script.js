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
    home: new Set(), p7: new Set(), ipad: new Set(),
    lights: new Set(), switches: new Set()
};

// Estado dos filtros de status por página
const stateFilters = {
    home: 'all', p7: 'all', ipad: 'all',
    lights: 'all', switches: 'all'
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

// SIDEBAR COLLAPSE
(function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const expandBtn = document.createElement('div');
    expandBtn.className = 'sidebar-collapsed-btn';
    expandBtn.textContent = '❯';
    document.body.appendChild(expandBtn);

    function setSidebarCollapsed(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        expandBtn.classList.toggle('visible', collapsed);
        localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0');
    }

    toggleBtn.onclick = () => setSidebarCollapsed(true);
    expandBtn.onclick = () => setSidebarCollapsed(false);

    if (localStorage.getItem('sidebar_collapsed') === '1') setSidebarCollapsed(true);
})();

// FILTER TOGGLE
document.querySelectorAll('.filter-toggle-btn').forEach(btn => {
    const fgId = btn.dataset.fg;
    const fg = document.getElementById(fgId);
    const storageKey = 'fg_hidden_' + fgId;

    function setHidden(hidden) {
        fg.classList.toggle('fg-hidden', hidden);
        btn.classList.toggle('fg-collapsed', hidden);
        localStorage.setItem(storageKey, hidden ? '1' : '0');
    }

    btn.onclick = () => setHidden(!fg.classList.contains('fg-hidden'));
    if (localStorage.getItem(storageKey) === '1') setHidden(true);
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
    ['home', 'p7', 'ipad', 'lights', 'switches'].forEach(key => {
        try {
            const saved = JSON.parse(localStorage.getItem('area_filter_' + key) || '[]');
            saved.forEach(r => areaFilters[key].add(r));
        } catch(e) {}
    });
    ['home', 'p7', 'ipad', 'lights', 'switches'].forEach(key => {
        const saved = localStorage.getItem('state_filter_' + key);
        if (saved) stateFilters[key] = saved;
    });
}

function isStateVisible(state, filterKey) {
    const f = stateFilters[filterKey];
    return f === 'all' || state === f;
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

// ÍCONE SVG de lâmpada — acesa ou com risco (off)
function getLightIcon(isOn) {
    const color  = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    const stroke = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    const base = `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 21h6M12 3a6 6 0 0 1 4 10.47V17H8v-3.53A6 6 0 0 1 12 3z"
              stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"
              fill="${color}" fill-opacity="${isOn ? '0.3' : '0'}"/>
        <line x1="8" y1="19" x2="16" y2="19" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>
        ${!isOn ? '<line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,80,80,0.7)" stroke-width="2" stroke-linecap="round"/>' : ''}
    </svg>`;
    return base;
}

function getEntityIcon(domain, state) {
    const isOn = state === 'on';
    if (domain === 'light')         return getLightIcon(isOn);
    if (domain === 'switch')        return `<span style="font-size:30px">${isOn ? '🟡' : '⚫'}</span>`;
    if (domain === 'sensor')        return `<span style="font-size:30px">🌡️</span>`;
    if (domain === 'binary_sensor') return `<span style="font-size:30px">${isOn ? '🟢' : '⚫'}</span>`;
    if (domain === 'climate')       return `<span style="font-size:30px">${isOn ? '❄️' : '🌬️'}</span>`;
    if (domain === 'media_player')  return `<span style="font-size:30px">${isOn ? '🎵' : '🔇'}</span>`;
    return `<span style="font-size:30px">📱</span>`;
}

// FAVORITOS — cache local como fonte de verdade
// Evita race condition: subscribeEntities pode não entregar
// atualizações das entidades sensor.hadashglass_* imediatamente.
const favsCache = { home: [], p7: [], ipad: [], pinned: [] };

function syncFavsFromEntities(entities) {
    const map = {
        home:   'sensor.hadashglass_favorites',
        pinned: 'sensor.hadashglass_pinned',
        p7:   'sensor.hadashglass_p7_favorites',
        ipad: 'sensor.hadashglass_ipad_favorites'
    };
    Object.entries(map).forEach(([key, entityId]) => {
        const ent = entities[entityId];
        if (ent && ent.attributes && Array.isArray(ent.attributes.entities)) {
            favsCache[key] = ent.attributes.entities;
        }
    });
}

function getFavorites()     { return favsCache.home; }
function getP7Favorites()   { return favsCache.p7; }
function getIPadFavorites() { return favsCache.ipad; }

// RENDER HOME
function renderHome(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('dashboard-grid');
    const visibleIds = getFavorites();

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

    // Renderiza filtros ANTES de limpar o grid
    renderAreaFilter('filter-home', allRooms, 'home', () => renderHome(entities, conn, areas, entities_reg, devices_reg));
    renderStateFilter('state-filter-home', 'home',
        { all: 'Todos', on: 'On', off: 'Off' },
        () => renderHome(entities, conn, areas, entities_reg, devices_reg));

    // Agora limpa e renderiza os cards
    grid.innerHTML = '';

    if (allRooms.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:60px 20px">' +
            '<div style="font-size:40px;margin-bottom:10px">⚙️</div>' +
            '<p>Nenhuma entidade visível.</p>' +
            '<p style="font-size:12px;margin-top:8px">Vá em Configurações e ative as entidades que deseja exibir.</p>' +
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

// RENDER P7 — favoritos exclusivos do tablet P7
function renderP7(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('p7-grid');
    if (!grid) return;
    const visibleIds = getP7Favorites();

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
            const displayName = simplifyName(ent.attributes.friendly_name, room, item.id);
            const card = document.createElement('div');
            card.className = `p7-card ${isOn ? 'on' : ''}`;
            const iconHtml = domain === 'light'
                ? getLightIcon(isOn).replace('width="38" height="38"', 'width="42" height="42"').replace(isOn ? '#ffb400' : 'rgba(255,255,255,0.25)', isOn ? '#64b4ff' : 'rgba(255,255,255,0.25)')
                : `<span style="font-size:34px">${isOn ? '🟡' : '⚫'}</span>`;
            card.innerHTML = `
                <div class="p7-state-dot"></div>
                <div class="p7-card-icon">${iconHtml}</div>
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

// RENDER IPAD — favoritos exclusivos do iPad
function renderIPad(entities, conn, areas, entities_reg, devices_reg) {
    const grid = document.getElementById('ipad-grid');
    if (!grid) return;
    const visibleIds = getIPadFavorites();

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
    renderAreaFilter('filter-ipad', allRooms, 'ipad', () => renderIPad(entities, conn, areas, entities_reg, devices_reg));
    renderStateFilter('state-filter-ipad', 'ipad',
        { all: 'Todos', on: 'On', off: 'Off' },
        () => renderIPad(entities, conn, areas, entities_reg, devices_reg));

    grid.innerHTML = '';

    if (allRooms.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:60px 20px">' +
            '<div style="font-size:40px;margin-bottom:10px">📟</div>' +
            '<p>Nenhum favorito do iPad.</p>' +
            '<p style="font-size:12px;margin-top:8px">Vá em Ajustes e clique em ⭐ iPad nos dispositivos desejados.</p>' +
            '</div>';
        return;
    }

    allRooms.forEach(room => {
        if (!isRoomVisible(room, 'ipad')) return;
        const roomEntities = grouped[room].filter(item => isStateVisible(item.state.state, 'ipad'));
        if (roomEntities.length === 0) return;

        const rDiv = document.createElement('div');
        rDiv.className = 'room-section';
        rDiv.innerText = room;
        grid.appendChild(rDiv);

        roomEntities.forEach(item => {
            const ent = item.state;
            const isOn = ent.state === 'on';
            const domain = item.id.split('.')[0];
            const displayName = simplifyName(ent.attributes.friendly_name, room, item.id);
            const card = document.createElement('div');
            card.className = `ipad-card ${isOn ? 'on' : ''}`;
            const iconHtml = domain === 'light'
                ? getLightIcon(isOn).replace(isOn ? '#ffb400' : 'rgba(255,255,255,0.25)', isOn ? '#a78bfa' : 'rgba(255,255,255,0.25)')
                : `<span style="font-size:30px">${isOn ? '🟡' : '⚫'}</span>`;
            card.innerHTML = `
                <div class="ipad-state-dot"></div>
                <div class="ipad-card-icon">${iconHtml}</div>
                <div class="ipad-card-name">${displayName}</div>
                <div class="ipad-card-area">${room}</div>
            `;
            if (['light', 'switch', 'fan'].includes(domain)) {
                card.onclick = () => callService(conn, domain, "toggle", { entity_id: item.id });
            }
            grid.appendChild(card);
        });
    });
}

// FAVORITO — adiciona/remove, atualiza cache local e salva no HA
function saveFavorite(entityId, starEl, cacheKey, haEntityId) {
    const currentList = favsCache[cacheKey];
    const isFav = currentList.includes(entityId);
    const newList = isFav
        ? currentList.filter(v => v !== entityId)
        : [...currentList, entityId];

    favsCache[cacheKey] = newList;
    isFav ? starEl.classList.remove('star-on') : starEl.classList.add('star-on');

    fetch(`${HA_CONFIG.URL}/api/states/${haEntityId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HA_CONFIG.TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'active', attributes: { entities: newList } })
    });
}

// RENDER LISTA (Luzes / Tomadas)
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
            const isHomeFav   = favsCache.home.includes(item.id);
            const isP7Fav     = favsCache.p7.includes(item.id);
            const isIPadFav   = favsCache.ipad.includes(item.id);
            const isPinned    = favsCache.pinned.includes(item.id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `
                <span>${displayName}</span>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="item-stars">
                        <div class="star-group">
                            <span class="star-btn star-home ${isHomeFav ? 'star-on' : ''}">★</span>
                            <span class="star-label">Home</span>
                        </div>
                        <div class="stars-divider"></div>
                        <div class="star-group">
                            <span class="star-btn star-p7 ${isP7Fav ? 'star-on' : ''}">★</span>
                            <span class="star-label">P7</span>
                        </div>
                        <div class="stars-divider"></div>
                        <div class="star-group">
                            <span class="star-btn star-ipad ${isIPadFav ? 'star-on' : ''}">★</span>
                            <span class="star-label">iPad</span>
                        </div>
                        <div class="stars-divider"></div>
                        <div class="star-group">
                            <span class="star-btn star-pin ${isPinned ? 'star-on' : ''}">📌</span>
                            <span class="star-label">Top</span>
                        </div>
                    </div>
                    <label class="switch"><input type="checkbox" ${item.state.state === 'on' ? 'checked' : ''}><span class="slider"></span></label>
                </div>
            `;
            itemDiv.querySelector('input').onchange = () =>
                callService(conn, domain, item.state.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: item.id });
            itemDiv.querySelector('.star-home').onclick = function() {
                saveFavorite(item.id, this, 'home', 'sensor.hadashglass_favorites');
            };
            itemDiv.querySelector('.star-p7').onclick = function() {
                saveFavorite(item.id, this, 'p7', 'sensor.hadashglass_p7_favorites');
            };
            itemDiv.querySelector('.star-ipad').onclick = function() {
                saveFavorite(item.id, this, 'ipad', 'sensor.hadashglass_ipad_favorites');
            };
            itemDiv.querySelector('.star-pin').onclick = function() {
                saveFavorite(item.id, this, 'pinned', 'sensor.hadashglass_pinned');
            };
            listContent.appendChild(itemDiv);
        });
    });
}

// SISTEMA
function updateSystemTab(entities, areas) {
    const el = id => document.getElementById(id);
    if (el('sys-total-count'))  el('sys-total-count').innerText  = Object.keys(entities).length;
    if (el('sys-home-count'))   el('sys-home-count').innerText   = favsCache.home.filter(id => entities[id]).length;
    if (el('sys-p7-count'))     el('sys-p7-count').innerText     = favsCache.p7.filter(id => entities[id]).length;
    if (el('sys-ipad-count'))   el('sys-ipad-count').innerText   = favsCache.ipad.filter(id => entities[id]).length;
    if (el('sys-areas-count'))  el('sys-areas-count').innerText  = areas.length;
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

// RENDER PINNED — cards especiais no topbar
function renderPinned(entities, conn) {
    const container = document.getElementById('pinned-cards');
    if (!container) return;

    const pinned = favsCache.pinned.filter(id => entities[id]);
    if (pinned.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    pinned.forEach(entityId => {
        const ent = entities[entityId];
        if (!ent) return;
        const state   = ent.state;
        const isOn    = state === 'on';
        const domain  = entityId.split('.')[0];
        const isToggle = domain === 'light' || domain === 'switch';
        const name    = (ent.attributes.friendly_name || entityId).replace(/luz\s*/gi, '').trim() || entityId.split('.')[1];
        const icon    = domain === 'light' ? getLightIcon(isOn) : getEntityIcon(entityId, ent);

        // Para sensores: mostra valor. Para toggles: mostra on/off
        let stateLabel;
        if (isToggle) {
            stateLabel = isOn ? 'Ligado' : 'Desligado';
        } else {
            const unit = ent.attributes.unit_of_measurement || '';
            stateLabel = `${state}${unit ? ' ' + unit : ''}`;
        }

        const card = document.createElement('div');
        card.className = `pinned-card${isToggle && isOn ? ' on' : ''}`;
        card.innerHTML = `
            <div class="pinned-icon">${icon}</div>
            <div class="pinned-info">
                <div class="pinned-name">${name}</div>
                <div class="pinned-state">${stateLabel}</div>
            </div>
        `;
        if (isToggle) {
            card.onclick = () => callService(conn, domain, isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
        }
        container.appendChild(card);
    });
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
            syncFavsFromEntities(entities);
            renderPinned(entities, conn);
            renderHome(entities, conn, areas, entities_reg, devices);
            renderP7(entities, conn, areas, entities_reg, devices);
            renderIPad(entities, conn, areas, entities_reg, devices);
            renderList('light',  'lights-list',   entities, conn, areas, entities_reg, devices);
            renderList('switch', 'switches-list', entities, conn, areas, entities_reg, devices);
            updateWeather(entities);
            updateSystemTab(entities, areas);
        });
    } catch (err) {
        console.error("Erro HA:", err);
    }
}

init();