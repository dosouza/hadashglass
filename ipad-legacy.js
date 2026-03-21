/**
 * HAdashglass - ipad-legacy.js
 * Versão: 2.0.0 — 17/03/2026
 * Compatibilidade: iOS 10 / Safari antigo (iPad 4ª geração)
 * FEATURES: Filtro de Áreas, Status das Entidades, Agrupamento por Área
 * SEM ES Modules, SEM import/export, SEM Set, SEM arrow functions
 */

// Configurações vêm do config-legacy.js carregado antes no HTML
var RAIN_ENTITY = typeof RAIN_DAY_1 !== 'undefined' ? RAIN_DAY_1 : '';

// ── ESTADO GLOBAL ─────────────────────────────────────────────
var ws           = null;
var msgId        = 1;
var allEntities  = {};
var areas        = [];
var entitiesReg  = [];
var devicesReg   = [];
var pendingCalls = {};
var subscribeId  = null;

// Filtros de área por página (objeto simples em vez de Set)
var areaFilters = {
    home:     {},
    lights:   {},
    switches: {},
    settings: {}
};

// Filtros de status por página
var stateFilters = {
    home:     'all',
    lights:   'all',
    switches: 'all'
};

// ── RELÓGIO ───────────────────────────────────────────────────
function tickClock() {
    var now = new Date();
    var hh = now.getHours();   hh = hh < 10 ? '0'+hh : ''+hh;
    var mm = now.getMinutes(); mm = mm < 10 ? '0'+mm : ''+mm;
    var el = document.getElementById('time');
    if (el) el.innerText = hh + ':' + mm;
    var days   = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    var months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var del = document.getElementById('date');
    if (del) del.innerText = days[now.getDay()] + ', ' + now.getDate() + ' de ' + months[now.getMonth()];
}
setInterval(tickClock, 1000);
tickClock();

// ── NAVEGAÇÃO ─────────────────────────────────────────────────
function iniciarTabs() {
    var buttons = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < buttons.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                var allBtns = document.querySelectorAll('.tab-btn');
                var allContents = document.querySelectorAll('.tab-content');
                for (var k = 0; k < allBtns.length; k++) allBtns[k].classList.remove('active');
                for (var k = 0; k < allContents.length; k++) allContents[k].classList.remove('active');
                btn.classList.add('active');
                var target = document.getElementById(btn.getAttribute('data-tab'));
                if (target) target.classList.add('active');
            });
        })(buttons[i]);
    }
}

function iniciarNavegacao() {
    var icons = document.querySelectorAll('.nav-icon');
    for (var i = 0; i < icons.length; i++) {
        (function(icon) {
            icon.addEventListener('click', function() {
                var allIcons = document.querySelectorAll('.nav-icon');
                var allPages = document.querySelectorAll('.page');
                for (var k = 0; k < allIcons.length; k++) allIcons[k].classList.remove('active');
                for (var k = 0; k < allPages.length; k++) allPages[k].classList.remove('active');
                icon.classList.add('active');
                var pg = document.getElementById(icon.getAttribute('data-target'));
                if (pg) pg.classList.add('active');
            });
        })(icons[i]);
    }
}

// ── WEBSOCKET HA ──────────────────────────────────────────────
function sendMsg(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function sendRequest(obj, callback) {
    var id = msgId++;
    obj.id = id;
    pendingCalls[id] = callback;
    sendMsg(obj);
}

function connect() {
    var wsUrl = HA_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/websocket';
    ws = new WebSocket(wsUrl);

    ws.onopen = function() { console.log('[HA] Conectado'); };

    ws.onmessage = function(evt) {
        var data = JSON.parse(evt.data);

        if (data.type === 'auth_required') {
            sendMsg({ type: 'auth', access_token: HA_TOKEN });
            return;
        }
        if (data.type === 'auth_ok') {
            loadRegistries();
            return;
        }
        if (data.type === 'auth_invalid') {
            console.error('[HA] Token inválido!');
            return;
        }
        if (data.type === 'result' && pendingCalls[data.id]) {
            pendingCalls[data.id](data.result);
            delete pendingCalls[data.id];
            return;
        }
        if (data.type === 'event' && data.id === subscribeId) {
            var evt = data.event;

            // 'a' = adicionadas, 'c' = alteradas — ambos precisam ser processados
            var toProcess = {};
            if (evt.a) { for (var k in evt.a) toProcess[k] = evt.a[k]; }
            if (evt.c) { for (var k in evt.c) toProcess[k] = evt.c[k]; }

            for (var key in toProcess) {
                var change = toProcess[key];
                allEntities[key] = allEntities[key] || { attributes: {} };

                // Estado pode vir em '+' (diff) ou direto em 's'
                if (change['+']) {
                    if (change['+'].s !== undefined) allEntities[key].state = change['+'].s;
                    if (change['+'].a) {
                        for (var attr in change['+'].a) {
                            allEntities[key].attributes[attr] = change['+'].a[attr];
                        }
                    }
                } else {
                    if (change.s !== undefined) allEntities[key].state = change.s;
                    if (change.a) {
                        for (var attr in change.a) {
                            allEntities[key].attributes[attr] = change.a[attr];
                        }
                    }
                }
            }
            renderAll();
        }
    };

    ws.onclose = function() {
        console.warn('[HA] Fechado, reconectando em 5s...');
        setTimeout(connect, 5000);
    };
    ws.onerror = function(e) { console.error('[HA] Erro', e); };
}

// ── REGISTROS ─────────────────────────────────────────────────
function loadRegistries() {
    sendRequest({ type: 'config/area_registry/list' }, function(r1) {
        areas = r1 || [];
        sendRequest({ type: 'config/device_registry/list' }, function(r2) {
            devicesReg = r2 || [];
            sendRequest({ type: 'config/entity_registry/list' }, function(r3) {
                entitiesReg = r3 || [];
                sendRequest({ type: 'get_states' }, function(states) {
                    for (var i = 0; i < states.length; i++) {
                        allEntities[states[i].entity_id] = states[i];
                    }
                    loadAreaFilters();
                    renderAll();
                    subscribeToEntities();
                });
            });
        });
    });
}

function subscribeToEntities() {
    subscribeId = msgId++;
    sendMsg({ id: subscribeId, type: 'subscribe_entities' });
}

// ── HELPERS ───────────────────────────────────────────────────
function isEntityVisible(entityId) {
    for (var i = 0; i < entitiesReg.length; i++) {
        if (entitiesReg[i].entity_id === entityId) {
            return !entitiesReg[i].hidden_by && !entitiesReg[i].disabled_by;
        }
    }
    return true; // sem registro = mostrar
}

function getAreaName(entityId) {
    var reg = null;
    for (var i = 0; i < entitiesReg.length; i++) {
        if (entitiesReg[i].entity_id === entityId) { reg = entitiesReg[i]; break; }
    }
    var areaId = null;
    if (reg) {
        if (reg.area_id) {
            areaId = reg.area_id;
        } else if (reg.device_id) {
            for (var j = 0; j < devicesReg.length; j++) {
                if (devicesReg[j].id === reg.device_id && devicesReg[j].area_id) {
                    areaId = devicesReg[j].area_id; break;
                }
            }
        }
    }
    if (!areaId) return 'Sem Área';
    for (var k = 0; k < areas.length; k++) {
        if (areas[k].area_id === areaId) return areas[k].name;
    }
    return 'Sem Área';
}

function simplifyName(friendlyName, areaName, entityId) {
    var name = friendlyName || entityId.split('.')[1].replace(/_/g, ' ');
    var domain = entityId.split('.')[0];
    if (domain === 'light') name = name.replace(/luz\s*|luz$/gi, '');
    if (areaName && areaName !== 'Sem Área') {
        name = name.replace(new RegExp(areaName, 'gi'), '');
    }
    name = name.trim();
    if (!name) name = friendlyName || entityId.split('.')[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getIcon(domain, state) {
    var isOn = state === 'on';
    if (domain === 'light')         return isOn ? '💡' : '🔌'; 
    if (domain === 'switch')        return isOn ? '🟡' : '⚫';
    if (domain === 'cover')         return isOn ? '🔓' : '🔒';
    if (domain === 'sensor')        return '🌡️';
    if (domain === 'binary_sensor') return isOn ? '🟢' : '⚫';
    if (domain === 'climate')       return isOn ? '❄️' : '🌬️';
    if (domain === 'media_player')  return isOn ? '🎵' : '🔇';
    return '📱';
}

// Ícone SVG inline para luz — mais visual que emoji
function getLightIcon(isOn) {
    var color = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    var stroke = isOn ? '#ffb400' : 'rgba(255,255,255,0.25)';
    // Lâmpada simples: acesa (amarela) ou com risco (cinza)
    if (isOn) {
        return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
               '<path d="M9 21h6M12 3a6 6 0 0 1 4 10.47V17H8v-3.53A6 6 0 0 1 12 3z" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round" fill="' + color + '" fill-opacity="0.3"/>' +
               '<line x1="8" y1="19" x2="16" y2="19" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>' +
               '</svg>';
    } else {
        return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
               '<path d="M9 21h6M12 3a6 6 0 0 1 4 10.47V17H8v-3.53A6 6 0 0 1 12 3z" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>' +
               '<line x1="8" y1="19" x2="16" y2="19" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>' +
               '<line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,80,80,0.7)" stroke-width="2" stroke-linecap="round"/>' +
               '</svg>';
    }
}

function getStateColor(state) {
    if (state === 'on')  return '#00e676';
    if (state === 'off') return 'rgba(255,255,255,0.35)';
    return '#6dd5fa';
}

// ── FILTROS DE ÁREA ───────────────────────────────────────────
function loadAreaFilters() {
    var keys = ['home', 'lights', 'switches', 'settings'];
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        try {
            var saved = JSON.parse(localStorage.getItem('area_filter_' + key) || '[]');
            areaFilters[key] = {};
            for (var i = 0; i < saved.length; i++) {
                areaFilters[key][saved[i]] = true;
            }
        } catch(e) { areaFilters[key] = {}; }
    }
    var sKeys = ['home', 'lights', 'switches'];
    for (var s = 0; s < sKeys.length; s++) {
        var sv = localStorage.getItem('state_filter_' + sKeys[s]);
        if (sv) stateFilters[sKeys[s]] = sv;
    }
}

function isStateVisible(state, filterKey) {
    var f = stateFilters[filterKey];
    return f === 'all' || state === f;
}

function renderStateFilter(barId, filterKey, labels, renderCallback) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    bar.innerHTML = '';
    var options = [
        { value: 'all', label: labels.all },
        { value: 'on',  label: labels.on  },
        { value: 'off', label: labels.off }
    ];
    for (var i = 0; i < options.length; i++) {
        var chip = document.createElement('div');
        chip.className = 'area-chip' + (stateFilters[filterKey] === options[i].value ? ' active' : '');
        chip.innerText = options[i].label;
        chip.onclick = (function(fk, val, cb) {
            return function() {
                stateFilters[fk] = val;
                localStorage.setItem('state_filter_' + fk, val);
                cb();
            };
        })(filterKey, options[i].value, renderCallback);
        bar.appendChild(chip);
    }
}

function saveAreaFilter(key) {
    var arr = [];
    for (var room in areaFilters[key]) {
        if (areaFilters[key][room]) arr.push(room);
    }
    localStorage.setItem('area_filter_' + key, JSON.stringify(arr));
}

function isRoomVisible(room, filterKey) {
    var f = areaFilters[filterKey];
    for (var r in f) { if (f[r]) return f[room] === true; }
    return true; // nenhum filtro ativo = mostrar tudo
}

// Versão correta: se nenhum filtro ativo, mostrar tudo
function hasAnyFilter(filterKey) {
    var f = areaFilters[filterKey];
    for (var r in f) { if (f[r]) return true; }
    return false;
}

function renderAreaFilter(filterId, allRooms, filterKey, renderCallback) {
    var bar = document.getElementById(filterId);
    if (!bar) return;
    var scrollLeft = bar.scrollLeft;
    bar.innerHTML = '';

    // Chip "Todas"
    var allChip = document.createElement('div');
    allChip.className = 'area-chip' + (hasAnyFilter(filterKey) ? '' : ' active');
    allChip.innerText = 'Todas';
    allChip.onclick = (function(fk, cb) {
        return function() {
            areaFilters[fk] = {};
            saveAreaFilter(fk);
            cb();
        };
    })(filterKey, renderCallback);
    bar.appendChild(allChip);

    // Chips por área
    var sorted = allRooms.slice().sort();
    for (var i = 0; i < sorted.length; i++) {
        var room = sorted[i];
        var chip = document.createElement('div');
        var isActive = areaFilters[filterKey][room] === true;
        chip.className = 'area-chip' + (isActive ? ' active' : '');
        chip.innerText = room;
        chip.onclick = (function(fk, r, cb) {
            return function() {
                if (areaFilters[fk][r]) {
                    delete areaFilters[fk][r];
                } else {
                    areaFilters[fk][r] = true;
                }
                saveAreaFilter(fk);
                cb();
            };
        })(filterKey, room, renderCallback);
        bar.appendChild(chip);
    }

    bar.scrollLeft = scrollLeft;
}

// ── FAVORITOS — lê da entidade HA (iPad exclusivo) ────────────
function getFavorites() {
    var fav = allEntities['sensor.hadashglass_ipad_favorites'];
    return (fav && fav.attributes && fav.attributes.entities) ? fav.attributes.entities : [];
}

// ── RENDER: HOME ──────────────────────────────────────────────
function renderHome() {
    var grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    var visibleIds = getFavorites();

    var grouped = {};
    for (var i = 0; i < visibleIds.length; i++) {
        var id = visibleIds[i];
        if (!allEntities[id]) continue;
        if (!isEntityVisible(id)) continue;
        var room = getAreaName(id);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(id);
    }

    var allRooms = Object.keys(grouped).sort();

    // Renderiza filtros ANTES de limpar o grid
    renderAreaFilter('filter-home', allRooms, 'home', renderHome);
    renderStateFilter('state-filter-home', 'home',
        { all: 'Todos', on: 'On', off: 'Off' }, renderHome);

    // Agora limpa e renderiza os cards
    grid.innerHTML = '';

    if (allRooms.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px">' +
               '<div style="font-size:40px">⚙️</div>' +
               '<p>Nenhuma entidade visível.</p>' +
               '<p style="font-size:12px">Vá em Configurações e ative as que deseja exibir.</p>' +
               '</div>';
        return;
    }

    var html = '';
    for (var r = 0; r < allRooms.length; r++) {
        var room = allRooms[r];
        if (hasAnyFilter('home') && !areaFilters['home'][room]) continue;

        var roomHtml = '';
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            if (!isStateVisible(ent.state, 'home')) continue;
            var isOn = ent.state === 'on';
            var domain = id.split('.')[0];
            var label = simplifyName(ent.attributes ? ent.attributes.friendly_name : null, room, id);
            var canToggle = (domain === 'light' || domain === 'switch' || domain === 'fan' || domain === 'cover');
            var iconHtml;
            if (domain === 'light') {
                iconHtml = getLightIcon(isOn);
            } else {
                iconHtml = '<div style="font-size:28px">' + getIcon(domain, ent.state) + '</div>';
            }
            roomHtml += '<div class="card' + (isOn ? ' on' : '') + '"' +
                    (canToggle ? ' onclick="callToggle(\'' + domain + '\',\'' + id + '\')"' : '') +
                    ' style="cursor:' + (canToggle ? 'pointer' : 'default') + '">' +
                    iconHtml +
                    '<div style="font-size:11px;margin-top:6px;font-weight:700;color:' + (isOn ? '#ffb400' : 'rgba(255,255,255,0.5)') + '">' + label + '</div>' +
                    '<div style="font-size:10px;opacity:0.5;margin-top:3px">' + ent.state + '</div>' +
                    '</div>';
        }
        if (roomHtml) {
            html += '<div class="room-section">' + room + '</div>' + roomHtml;
        }
    }

    grid.innerHTML = html;
}

// ── RENDER: LISTA (Luzes / Tomadas) ───────────────────────────
function renderList(domain, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var filterKey = domain === 'light' ? 'lights' : 'switches';
    var filterId  = 'filter-' + filterKey;
    var stateFilterId = 'state-filter-' + filterKey;
    var stateLabels = domain === 'light'
        ? { all: 'Todas', on: 'Acesas', off: 'Apagadas' }
        : { all: 'Todos', on: 'Ligados', off: 'Desligados' };

    var allIds = [];
    for (var id in allEntities) {
        if (id.indexOf(domain + '.') === 0 && isEntityVisible(id)) allIds.push(id);
    }
    allIds.sort();

    var grouped = {};
    for (var i = 0; i < allIds.length; i++) {
        var room = getAreaName(allIds[i]);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(allIds[i]);
    }

    var allRooms = Object.keys(grouped).sort();
    renderAreaFilter(filterId, allRooms, filterKey, function() { renderList(domain, containerId); });
    renderStateFilter(stateFilterId, filterKey, stateLabels, function() { renderList(domain, containerId); });

    // Contar ativos respeitando ambos os filtros
    var activeCount = 0;
    var totalActive = 0;
    for (var i = 0; i < allIds.length; i++) {
        var id = allIds[i];
        if (allEntities[id].state === 'on') {
            totalActive++;
            var r = getAreaName(id);
            if ((!hasAnyFilter(filterKey) || areaFilters[filterKey][r]) && isStateVisible(allEntities[id].state, filterKey)) {
                activeCount++;
            }
        }
    }

    var filtradoTxt = ((hasAnyFilter(filterKey) || stateFilters[filterKey] !== 'all') && totalActive !== activeCount) ?
        ' <span style="opacity:0.5;font-size:11px">(filtrado de ' + totalActive + ')</span>' : '';

    var domainLabel = domain === 'light' ? 'Luzes' : 'Interruptores';
    var html = '<div class="summary-header">' +
        '<span><strong>' + activeCount + '</strong> ' + domainLabel + ' ativos' + filtradoTxt + '</span>' +
        (activeCount > 0 ? '<button class="btn-off" onclick="desligarTudo(\'' + domain + '\')">Desligar Tudo</button>' : '') +
        '</div><div class="list-container">';

    for (var r = 0; r < allRooms.length; r++) {
        var room = allRooms[r];
        if (hasAnyFilter(filterKey) && !areaFilters[filterKey][room]) continue;

        var roomHtml = '';
        var activeInRoom = 0;
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            if (!isStateVisible(ent.state, filterKey)) continue;
            var isOn = ent.state === 'on';
            if (isOn) activeInRoom++;
            var label = simplifyName(ent.attributes ? ent.attributes.friendly_name : null, room, id);
            var favIds = getFavorites();
            var isFav = favIds.indexOf(id) >= 0;
            roomHtml += '<div class="list-item">' +
                '<span>' + label + '</span>' +
                '<div style="display:flex;align-items:center;gap:12px">' +
                '<span class="star-btn' + (isFav ? ' star-on' : '') + '" onclick="toggleFavorite(\'' + id + '\',this)">★</span>' +
                '<label class="switch">' +
                '<input type="checkbox"' + (isOn ? ' checked' : '') +
                ' onchange="toggleSwitch(\'' + domain + '\',\'' + id + '\',this)">' +
                '<span class="slider"></span></label>' +
                '</div>' +
                '</div>';
        }
        if (!roomHtml) continue;

        html += '<div class="room-section">' +
            '<span>' + room + '</span>' +
            (activeInRoom > 0 ? '<button class="btn-off-mini" onclick="desligarSala(\'' + domain + '\',\'' + room + '\')">Desligar Sala</button>' : '') +
            '</div>' + roomHtml;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ── RENDER: SETTINGS ──────────────────────────────────────────
function renderSettings() {
    var container = document.getElementById('settings-entities-list');
    if (!container) return;

    var visibleIds = [];
    try { visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || '[]'); } catch(e) {}

    var allIds = [];
    for (var id in allEntities) {
        var dom = id.split('.')[0];
        if (['light','switch','cover','fan','climate','media_player','sensor','binary_sensor'].indexOf(dom) >= 0) {
            allIds.push(id);
        }
    }
    allIds.sort();

    var grouped = {};
    for (var i = 0; i < allIds.length; i++) {
        var room = getAreaName(allIds[i]);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(allIds[i]);
    }

    var allRooms = Object.keys(grouped).sort();
    renderAreaFilter('filter-settings', allRooms, 'settings', renderSettings);

    var html = '<div class="list-container">';
    for (var r = 0; r < allRooms.length; r++) {
        var room = allRooms[r];
        if (hasAnyFilter('settings') && !areaFilters['settings'][room]) continue;

        html += '<div class="room-section">' + room + '</div>';
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            var fname = (ent.attributes && ent.attributes.friendly_name) ? ent.attributes.friendly_name : id;
            var state = ent.state || '';
            var stateColor = getStateColor(state);
            var isVisible = visibleIds.indexOf(id) >= 0;
            html += '<div class="list-item">' +
                '<div style="max-width:70%;display:flex;flex-direction:column;gap:2px">' +
                '<div style="font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
                fname +
                '<span style="font-size:10px;font-weight:700;color:' + stateColor + ';background:rgba(255,255,255,0.06);padding:2px 7px;border-radius:6px;letter-spacing:0.04em">' + state + '</span>' +
                '</div>' +
                '<div style="font-size:10px;opacity:0.5">' + id + '</div>' +
                '</div>' +
                '<label class="switch switch-visibility">' +
                '<input type="checkbox"' + (isVisible ? ' checked' : '') +
                ' onchange="toggleVisibility(\'' + id + '\',this)">' +
                '<span class="slider"></span></label>' +
                '</div>';
        }
    }
    html += '</div>';
    container.innerHTML = html;
}

// ── CLIMA ─────────────────────────────────────────────────────
function updateWeather() {
    var w = allEntities[WEATHER_ENTITY];
    if (!w || !w.attributes) return;
    var icons = { sunny:'☀️', cloudy:'☁️', rainy:'🌧️', partlycloudy:'⛅', pouring:'🌧️', 'clear-night':'🌙', snowy:'❄️', windy:'💨', fog:'🌫️' };
    var tempEl = document.getElementById('w-temp');
    var condEl = document.getElementById('w-condition');
    var humEl  = document.getElementById('w-humidity');
    var rainEl = document.getElementById('w-rain');
    var iconEl = document.getElementById('w-icon');
    if (tempEl) tempEl.innerText = Math.round(w.attributes.temperature || 0);
    if (condEl) condEl.innerText = (w.state || '').replace(/_/g, ' ');
    if (humEl)  humEl.innerText  = (w.attributes.humidity || '--') + '%';
    var rain = allEntities[RAIN_ENTITY];
    if (rainEl) rainEl.innerText = (rain ? rain.state : '0') + '%';
    if (iconEl) iconEl.innerText = icons[w.state] || '☀️';
}

// ── ACTIONS ───────────────────────────────────────────────────
function callToggle(domain, entityId) {
    sendRequest({ type:'call_service', domain:domain, service:'toggle', service_data:{entity_id:entityId} }, function(){});
}

function callService(domain, service, entityId) {
    sendRequest({ type:'call_service', domain:domain, service:service, service_data:{entity_id:entityId} }, function(){});
}

function toggleSwitch(domain, entityId, checkbox) {
    callService(domain, checkbox.checked ? 'turn_on' : 'turn_off', entityId);
}

function toggleFavorite(entityId, starEl) {
    var currentFavs = getFavorites();
    var isFav = currentFavs.indexOf(entityId) >= 0;
    var newList = [];
    if (isFav) {
        for (var i = 0; i < currentFavs.length; i++) {
            if (currentFavs[i] !== entityId) newList.push(currentFavs[i]);
        }
        starEl.classList.remove('star-on');
    } else {
        for (var i = 0; i < currentFavs.length; i++) newList.push(currentFavs[i]);
        newList.push(entityId);
        starEl.classList.add('star-on');
    }

    // Atualiza local imediatamente (otimista)
    if (!allEntities['sensor.hadashglass_ipad_favorites']) {
        allEntities['sensor.hadashglass_ipad_favorites'] = { attributes: {} };
    }
    allEntities['sensor.hadashglass_ipad_favorites'].attributes.entities = newList;

    // Salva no HA via REST (iPad exclusivo)
    var xhr = new XMLHttpRequest();
    xhr.open('POST', HA_URL + '/api/states/sensor.hadashglass_ipad_favorites', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + HA_TOKEN);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ state: 'active', attributes: { entities: newList } }));
}

function desligarTudo(domain) {
    for (var id in allEntities) {
        var room = getAreaName(id);
        if (id.indexOf(domain + '.') === 0 && allEntities[id].state === 'on') {
            var fk = domain === 'light' ? 'lights' : 'switches';
            if (!hasAnyFilter(fk) || areaFilters[fk][room]) {
                callService(domain, 'turn_off', id);
            }
        }
    }
}

function desligarSala(domain, room) {
    for (var id in allEntities) {
        if (id.indexOf(domain + '.') === 0 && allEntities[id].state === 'on' && getAreaName(id) === room) {
            callService(domain, 'turn_off', id);
        }
    }
}

function toggleVisibility(entityId, checkbox) {
    var visibleIds = [];
    try { visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || '[]'); } catch(e) {}
    if (checkbox.checked) {
        if (visibleIds.indexOf(entityId) < 0) visibleIds.push(entityId);
    } else {
        var newIds = [];
        for (var i = 0; i < visibleIds.length; i++) {
            if (visibleIds[i] !== entityId) newIds.push(visibleIds[i]);
        }
        visibleIds = newIds;
    }
    localStorage.setItem('visible_home_entities', JSON.stringify(visibleIds));
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll() {
    renderHome();
    renderList('light',  'lights-list');
    renderList('switch', 'switches-list');
    updateWeather();
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    iniciarNavegacao();
    iniciarTabs();
    connect();
});