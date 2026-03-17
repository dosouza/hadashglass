/**
 * HAdashglass - ipad-legacy.js
 * Versão: 1.0.0
 * Compatibilidade: iOS 10 / Safari antigo (iPad 4ª geração)
 * SEM ES Modules, SEM import/export, SEM arrow functions complexas
 * Usa WebSocket nativo do browser + HA WebSocket API diretamente
 */

// Configurações vêm do config-legacy.js carregado antes no HTML
// HA_URL, HA_TOKEN, WEATHER_ENTITY, RAIN_DAY_1 são vars globais de lá
var RAIN_ENTITY = typeof RAIN_DAY_1 !== 'undefined' ? RAIN_DAY_1 : '';

var ws = null;
var msgId = 1;
var allEntities = {};
var areas = [];
var entitiesReg = [];
var devicesReg  = [];
var pendingCalls = {};   // id -> callback
var subscribeId  = null;

// ── RELÓGIO ──────────────────────────────────────────────────
function tickClock() {
    var now = new Date();
    var h = now.getHours();   var hh = h < 10 ? '0'+h : ''+h;
    var m = now.getMinutes(); var mm = m < 10 ? '0'+m : ''+m;
    var el = document.getElementById('time');
    if (el) el.innerText = hh + ':' + mm;

    var days   = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    var months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var ds = days[now.getDay()] + ', ' + now.getDate() + ' de ' + months[now.getMonth()];
    var del = document.getElementById('date');
    if (del) del.innerText = ds;
}
setInterval(tickClock, 1000);
tickClock();

// ── NAVEGAÇÃO ────────────────────────────────────────────────
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
                var target = icon.getAttribute('data-target');
                var pg = document.getElementById(target);
                if (pg) pg.classList.add('active');
            });
        })(icons[i]);
    }
}

// ── WEBSOCKET HA ─────────────────────────────────────────────
function sendMsg(obj) {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(obj));
    }
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

    ws.onopen = function() {
        console.log('[HA] WebSocket conectado');
    };

    ws.onmessage = function(evt) {
        var data = JSON.parse(evt.data);

        // Autenticação
        if (data.type === 'auth_required') {
            sendMsg({ type: 'auth', access_token: HA_TOKEN });
            return;
        }

        if (data.type === 'auth_ok') {
            console.log('[HA] Autenticado!');
            loadRegistries();
            return;
        }

        if (data.type === 'auth_invalid') {
            console.error('[HA] Token inválido!');
            return;
        }

        // Respostas a chamadas (result)
        if (data.type === 'result' && pendingCalls[data.id]) {
            pendingCalls[data.id](data.result);
            delete pendingCalls[data.id];
            return;
        }

        // Eventos de entidades (subscription)
        if (data.type === 'event' && data.id === subscribeId) {
            var changes = data.event.a || {};  // adicionadas/alteradas
            for (var key in changes) {
                allEntities[key] = allEntities[key] || {};
                allEntities[key].state      = changes[key].s !== undefined ? changes[key].s : (allEntities[key].state || '');
                allEntities[key].attributes = changes[key].a || allEntities[key].attributes || {};
                // friendly_name pode vir separado
                if (changes[key].a && changes[key].a.friendly_name) {
                    allEntities[key].attributes.friendly_name = changes[key].a.friendly_name;
                }
            }
            renderAll();
            return;
        }
    };

    ws.onclose = function() {
        console.warn('[HA] Conexão fechada, reconectando em 5s...');
        setTimeout(connect, 5000);
    };

    ws.onerror = function(e) {
        console.error('[HA] Erro WebSocket', e);
    };
}

// ── CARREGAR REGISTROS ───────────────────────────────────────
function loadRegistries() {
    // 1. Áreas
    sendRequest({ type: 'config/area_registry/list' }, function(result) {
        areas = result || [];

        // 2. Devices
        sendRequest({ type: 'config/device_registry/list' }, function(result2) {
            devicesReg = result2 || [];

            // 3. Entities registry
            sendRequest({ type: 'config/entity_registry/list' }, function(result3) {
                entitiesReg = result3 || [];

                // 4. Buscar estados iniciais
                sendRequest({ type: 'get_states' }, function(states) {
                    for (var i = 0; i < states.length; i++) {
                        allEntities[states[i].entity_id] = states[i];
                    }
                    renderAll();
                    subscribeToEntities();
                });
            });
        });
    });
}

function subscribeToEntities() {
    subscribeId = msgId++;
    sendMsg({
        id: subscribeId,
        type: 'subscribe_entities'
    });
}

// ── HELPERS ──────────────────────────────────────────────────
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
        var re = new RegExp(areaName, 'gi');
        name = name.replace(re, '');
    }
    name = name.trim();
    if (!name) name = friendlyName || entityId.split('.')[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getIcon(domain, state) {
    if (domain === 'light')         return state === 'on' ? '💡' : '🔆';
    if (domain === 'switch')        return state === 'on' ? '🔌' : '🔌';
    if (domain === 'cover')         return '🚪';
    if (domain === 'sensor')        return '🌡️';
    if (domain === 'binary_sensor') return '🛡️';
    if (domain === 'climate')       return '❄️';
    if (domain === 'media_player')  return '🎵';
    return '📱';
}

function callToggle(domain, entityId) {
    sendRequest({
        type: 'call_service',
        domain: domain,
        service: 'toggle',
        service_data: { entity_id: entityId }
    }, function() {});
}

function callService(domain, service, entityId) {
    sendRequest({
        type: 'call_service',
        domain: domain,
        service: service,
        service_data: { entity_id: entityId }
    }, function() {});
}

// ── RENDER: HOME GRID ─────────────────────────────────────────
function renderHome() {
    var grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    var visibleIds = [];
    try { visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || '[]'); } catch(e) {}

    // Agrupar por área
    var grouped = {};
    for (var i = 0; i < visibleIds.length; i++) {
        var id = visibleIds[i];
        if (!allEntities[id]) continue;
        var room = getAreaName(id);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(id);
    }

    var html = '';
    var rooms = Object.keys(grouped).sort();

    if (rooms.length === 0) {
        html = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px">' +
               '<div style="font-size:40px">⚙️</div>' +
               '<p>Nenhuma entidade visível.</p>' +
               '<p style="font-size:12px">Vá em Configurações e ative as que deseja exibir.</p>' +
               '</div>';
    }

    for (var r = 0; r < rooms.length; r++) {
        var room = rooms[r];
        html += '<div class="room-section">' + room + '</div>';
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            var isOn = ent.state === 'on';
            var domain = id.split('.')[0];
            var label = simplifyName(ent.attributes ? ent.attributes.friendly_name : null, room, id);
            var icon = getIcon(domain, ent.state);
            var canToggle = (domain === 'light' || domain === 'switch' || domain === 'fan' || domain === 'cover');
            html += '<div class="card' + (isOn ? ' on' : '') + '"' +
                    (canToggle ? ' onclick="callToggle(\'' + domain + '\',\'' + id + '\')"' : '') +
                    ' style="cursor:' + (canToggle ? 'pointer' : 'default') + '">' +
                    '<div style="font-size:28px">' + icon + '</div>' +
                    '<div style="font-size:11px;margin-top:6px;font-weight:700">' + label + '</div>' +
                    '<div style="font-size:10px;opacity:0.5;margin-top:3px">' + ent.state + '</div>' +
                    '</div>';
        }
    }

    grid.innerHTML = html;
}

// ── RENDER: LISTA (Luzes / Tomadas) ──────────────────────────
function renderList(domain, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var allIds = [];
    for (var id in allEntities) {
        if (id.indexOf(domain + '.') === 0) allIds.push(id);
    }
    allIds.sort();

    // Agrupar por área
    var grouped = {};
    for (var i = 0; i < allIds.length; i++) {
        var room = getAreaName(allIds[i]);
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(allIds[i]);
    }

    var activeCount = 0;
    for (var i = 0; i < allIds.length; i++) {
        if (allEntities[allIds[i]].state === 'on') activeCount++;
    }

    var domainLabel = domain === 'light' ? 'Luzes' : 'Interruptores';
    var html = '<div class="summary-header">' +
        '<span><strong>' + activeCount + '</strong> ' + domainLabel + ' ativas</span>' +
        (activeCount > 0 ? '<button class="btn-off" onclick="desligarTudo(\'' + domain + '\')">Desligar Tudo</button>' : '') +
        '</div><div class="list-container">';

    var rooms = Object.keys(grouped).sort();
    for (var r = 0; r < rooms.length; r++) {
        var room = rooms[r];
        html += '<div class="room-section">' + room + '</div>';
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            var isOn = ent.state === 'on';
            var label = simplifyName(ent.attributes ? ent.attributes.friendly_name : null, room, id);
            html += '<div class="list-item">' +
                '<span>' + label + '</span>' +
                '<label class="switch">' +
                '<input type="checkbox"' + (isOn ? ' checked' : '') +
                ' onchange="toggleSwitch(\'' + domain + '\',\'' + id + '\',this)">' +
                '<span class="slider"></span></label>' +
                '</div>';
        }
    }
    html += '</div>';
    container.innerHTML = html;
}

function toggleSwitch(domain, entityId, checkbox) {
    var svc = checkbox.checked ? 'turn_on' : 'turn_off';
    callService(domain, svc, entityId);
}

function desligarTudo(domain) {
    for (var id in allEntities) {
        if (id.indexOf(domain + '.') === 0 && allEntities[id].state === 'on') {
            callService(domain, 'turn_off', id);
        }
    }
}

// ── RENDER: SETTINGS ─────────────────────────────────────────
function renderSettings() {
    var container = document.getElementById('settings-entities-list');
    if (!container) return;

    var visibleIds = [];
    try { visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || '[]'); } catch(e) {}

    var allIds = [];
    for (var id in allEntities) {
        // Só entidades controláveis
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

    var html = '<div class="list-container">';
    var rooms = Object.keys(grouped).sort();
    for (var r = 0; r < rooms.length; r++) {
        var room = rooms[r];
        html += '<div class="room-section">' + room + '</div>';
        var ids = grouped[room];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            var ent = allEntities[id];
            var fname = (ent.attributes && ent.attributes.friendly_name) ? ent.attributes.friendly_name : id;
            var isVisible = visibleIds.indexOf(id) >= 0;
            html += '<div class="list-item">' +
                '<div style="max-width:75%">' +
                '<div style="font-size:13px">' + fname + '</div>' +
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

function toggleVisibility(entityId, checkbox) {
    var visibleIds = [];
    try { visibleIds = JSON.parse(localStorage.getItem('visible_home_entities') || '[]'); } catch(e) {}
    if (checkbox.checked) {
        if (visibleIds.indexOf(entityId) < 0) visibleIds.push(entityId);
    } else {
        visibleIds = visibleIds.filter(function(v) { return v !== entityId; });
    }
    localStorage.setItem('visible_home_entities', JSON.stringify(visibleIds));
}

// ── RENDER: CLIMA ─────────────────────────────────────────────
function updateWeather() {
    var w = allEntities[WEATHER_ENTITY];
    if (!w || !w.attributes) return;
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

    var icons = { sunny:'☀️', cloudy:'☁️', rainy:'🌧️', partlycloudy:'⛅', pouring:'🌧️', 'clear-night':'🌙', snowy:'❄️', windy:'💨', fog:'🌫️' };
    if (iconEl) iconEl.innerText = icons[w.state] || '☀️';
}

// ── RENDER: TUDO ─────────────────────────────────────────────
function renderAll() {
    renderHome();
    renderList('light', 'lights-list');
    renderList('switch', 'switches-list');
    renderSettings();
    updateWeather();
}

// ── TABS DE SETTINGS ─────────────────────────────────────────
function iniciarTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                var allBtns = document.querySelectorAll('.tab-btn');
                var allTabs = document.querySelectorAll('.tab-content');
                for (var k = 0; k < allBtns.length; k++) allBtns[k].classList.remove('active');
                for (var k = 0; k < allTabs.length; k++) allTabs[k].classList.remove('active');
                btn.classList.add('active');
                var tab = document.getElementById(btn.getAttribute('data-tab'));
                if (tab) tab.classList.add('active');
            });
        })(btns[i]);
    }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    iniciarNavegacao();
    iniciarTabs();
    connect();
});