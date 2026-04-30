/* ============================================
   Smart Home Dashboard — lógica
   ============================================ */

// ---------- Dados iniciais ----------
const initialRooms = [
  { id: "video",       name: "Vídeo",       icon: "tv",          isOn: false, brightness: 0 },
  { id: "estar",       name: "Estar",       icon: "sofa",        isOn: true,  brightness: 80 },
  { id: "gourmet",     name: "Gourmet",     icon: "chef-hat",    isOn: false, brightness: 0 },
  { id: "rua",         name: "Rua",         icon: "lightbulb",   isOn: false, brightness: 0 },
  { id: "corredor_t",  name: "Corredor T",  icon: "lightbulb",   isOn: true,  brightness: 60 },
  { id: "jantar",      name: "Jantar",      icon: "lightbulb",   isOn: true,  brightness: 70 },
  { id: "despensa",    name: "Despensa",    icon: "lightbulb",   isOn: false, brightness: 0 },
  { id: "wc_social",   name: "WC Social",   icon: "bath",        isOn: false, brightness: 0 },
  { id: "fundos",      name: "Fundos",      icon: "droplets",    isOn: true,  brightness: 100 },
  { id: "garagem",     name: "Garagem",     icon: "car",         isOn: true,  brightness: 100 },
  { id: "escada",      name: "Escada",      icon: "arrow-up-down", isOn: true, brightness: 50 },
  { id: "jardim",      name: "Jardim",      icon: "leaf",        isOn: false, brightness: 0, unavailable: true },
  { id: "corredor_1o", name: "Corredor 1º", icon: "lightbulb",   isOn: false, brightness: 0 },
  { id: "cozinha",     name: "Cozinha",     icon: "utensils-crossed", isOn: true, brightness: 90 },
  { id: "lavanderia",  name: "Lavanderia",  icon: "washing-machine", isOn: false, brightness: 0 },
  { id: "varanda",     name: "Varanda",     icon: "leaf",        isOn: false, brightness: 0, unavailable: true },
];

const initialScenes = [
  { id: "cinema",  name: "Cinema",       icon: "film" },
  { id: "night",   name: "Boa Noite",    icon: "moon" },
  { id: "morning", name: "Bom Dia",      icon: "sun" },
  { id: "away",    name: "Sair de Casa", icon: "door-open" },
  { id: "party",   name: "Festa",        icon: "party-popper" },
];

const statusItems = [
  { icon: "lock",   label: "Fechado" },
  { icon: "home",   label: "Portão fechado" },
  { icon: "user",   label: "2 em casa" },
  { icon: "shield", label: "Alarme ativo" },
  { icon: "wifi",   label: "Online" },
];

// ---------- Estado ----------
let rooms = JSON.parse(JSON.stringify(initialRooms));
let scenes = initialScenes.map(s => ({ ...s, active: false }));
let selectedRoomId = null;

// ---------- Refs DOM ----------
const $ = (id) => document.getElementById(id);
const roomsGrid  = $("rooms-grid");
const scenesEl   = $("scenes");
const statusBar  = $("status-bar");
const overlay    = $("modal-overlay");
const modalTitle = $("modal-title");
const modalState = $("modal-state");
const modalIcon  = $("modal-icon");
const slider     = $("brightness-slider");
const brightVal  = $("brightness-value");
const toggleBtn  = $("toggle-btn");
const activeCount = $("active-count");

// ---------- Render ----------
function renderStatus() {
  statusBar.innerHTML = statusItems.map(s => `
    <div class="status-item">
      <span class="icon"><i data-lucide="${s.icon}"></i></span>
      <span>${s.label}</span>
    </div>`).join("");
}

function renderScenes() {
  scenesEl.innerHTML = scenes.map(s => `
    <button class="scene-btn ${s.active ? "active" : ""}" data-scene="${s.id}">
      <i data-lucide="${s.icon}"></i><span>${s.name}</span>
    </button>`).join("");
}

function renderRooms() {
  roomsGrid.innerHTML = rooms.map(r => `
    <button class="room-card ${r.isOn ? "on" : ""} ${r.unavailable ? "unavailable" : ""}" data-room="${r.id}">
      ${r.unavailable ? `<span class="badge-unavailable">Indisponível</span>` : ""}
      <i data-lucide="${r.icon}"></i>
      <span class="room-name">${r.name}</span>
      ${r.isOn && r.brightness !== undefined ? `
        <div class="brightness-bar"><span style="width:${r.brightness}%"></span></div>` : ""}
    </button>`).join("");
  activeCount.textContent = rooms.filter(r => r.isOn).length;
}

function renderAll() {
  renderStatus();
  renderScenes();
  renderRooms();
  lucide.createIcons();
}

// ---------- Relógio ----------
function tickClock() {
  const d = new Date();
  $("clock-hours").textContent   = String(d.getHours()).padStart(2, "0");
  $("clock-minutes").textContent = String(d.getMinutes()).padStart(2, "0");
  $("clock-date").textContent = d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
setInterval(tickClock, 1000);
tickClock();

// ---------- Interações ----------
function toggleRoom(id) {
  rooms = rooms.map(r => r.id === id
    ? { ...r, isOn: !r.isOn, brightness: !r.isOn ? 100 : 0 }
    : r);
  renderRooms();
  lucide.createIcons();
  if (selectedRoomId === id) syncModal();
}

function activateScene(id) {
  scenes = scenes.map(s => ({ ...s, active: s.id === id ? !s.active : false }));
  renderScenes();
  lucide.createIcons();
}

function openModal(id) {
  const room = rooms.find(r => r.id === id);
  if (!room || room.unavailable) return;
  selectedRoomId = id;
  syncModal();
  overlay.classList.add("open");
}

function closeModal() {
  overlay.classList.remove("open");
  selectedRoomId = null;
}

function syncModal() {
  const room = rooms.find(r => r.id === selectedRoomId);
  if (!room) return;
  modalTitle.textContent = room.name;
  modalState.textContent = room.isOn ? "Ligado" : "Desligado";
  modalIcon.classList.toggle("on", room.isOn);
  slider.value = room.brightness ?? 0;
  brightVal.textContent = `${room.brightness ?? 0}%`;
  toggleBtn.classList.toggle("on", room.isOn);
  toggleBtn.querySelector("span").textContent = room.isOn ? "Desligar" : "Ligar";
}

// ---------- Eventos ----------
let pressTimer = null;
roomsGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-room]");
  if (btn) toggleRoom(btn.dataset.room);
});
roomsGrid.addEventListener("contextmenu", (e) => {
  const btn = e.target.closest("[data-room]");
  if (btn) { e.preventDefault(); openModal(btn.dataset.room); }
});
// long-press para tablets
roomsGrid.addEventListener("touchstart", (e) => {
  const btn = e.target.closest("[data-room]");
  if (!btn) return;
  pressTimer = setTimeout(() => openModal(btn.dataset.room), 500);
}, { passive: true });
roomsGrid.addEventListener("touchend", () => clearTimeout(pressTimer));
roomsGrid.addEventListener("touchmove", () => clearTimeout(pressTimer));

scenesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-scene]");
  if (btn) activateScene(btn.dataset.scene);
});

$("modal-close").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

slider.addEventListener("input", (e) => {
  const v = Number(e.target.value);
  brightVal.textContent = `${v}%`;
  rooms = rooms.map(r => r.id === selectedRoomId
    ? { ...r, brightness: v, isOn: v > 0 } : r);
  renderRooms();
  lucide.createIcons();
  syncModal();
});

toggleBtn.addEventListener("click", () => {
  if (selectedRoomId) toggleRoom(selectedRoomId);
});

// ---------- Init ----------
renderAll();
