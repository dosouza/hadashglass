# 🏠 HAdashglass — Status do Projeto

---

## 📋 Versões Atuais

| Arquivo | Versão | Alvo |
|---|---|---|
| `script.js` | 3.1.0 | Mac / iPhone (Chrome, Safari iOS 17+) |
| `ipad-legacy.js` | 2.0.0 | iPad 4ª geração (iOS 10, Safari antigo) |
| `style.css` | 3.1.0 | Compartilhado (Pro + iPad) |
| `config.js` | — | Versão Pro (ES Modules) |
| `config-legacy.js` | — | Versão iPad (var, sem export) |

---

## 🗂️ Estrutura de Arquivos

```
HAdashglass/
├── background/
│   ├── fundo.jpg           ← Wallpaper versão Pro
│   └── fundoipad6.jpg      ← Wallpaper versão iPad
├── index.html              ← Versão Pro (Mac / iPhone)
├── script.js               ← Engine Pro (ES Modules, WebSocket)
├── style.css               ← CSS compartilhado (Glassmorphism)
├── config.js               ← Credenciais Pro (export const)
├── ipad.html               ← Versão iPad Legacy
├── ipad-legacy.js          ← Engine iPad (JS puro, iOS 10)
├── config-legacy.js        ← Credenciais iPad (var, sem export)
└── README.md
```

---

## ✅ Funcionalidades Ativas

### 🖥️ Versão Pro — `index.html` + `script.js` (v3.1.0)

- **WebSocket nativo** via `home-assistant-js-websocket`
- **Auto Mapping por Áreas** — agrupa entidades pelas áreas do HA automaticamente
- **Simplificação de Nomes** — remove "Luz" e nome da área do friendly_name
- **Filtro de Áreas** — chips clicáveis em todas as páginas (Home, Luzes, Tomadas, Config)
  - Multi-select: pode filtrar por várias áreas simultaneamente
  - Filtro independente por página
  - Persistido no localStorage entre sessões
- **Status das Entidades** — badge colorido ao lado do nome no Config Home
  - 🟢 Verde = `on` | ⚪ Cinza = `off` | 🔵 Azul = outros estados
- **Desligar Tudo / Desligar Sala** — respeitam o filtro de área ativo
- **Aba Sistema** — exibe: versão, dispositivo, ES Modules, Backdrop-filter, total de entidades, visíveis, áreas mapeadas
- **Clima e Relógio** — header com temperatura, condição, umidade e chuva em tempo real
- **Navegação Lateral** — Home, Luzes, Tomadas, Configurações
- **LocalStorage Sync** — visibilidade de entidades persistida no navegador

### 📱 Versão iPad Legacy — `ipad.html` + `ipad-legacy.js` (v2.0.0)

- **Mesmas funcionalidades da versão Pro**, adaptadas para iOS 10
- **WebSocket nativo** — sem dependências externas
- **Filtro de Áreas** — mesma UX da versão Pro, implementado com objetos `{}` em vez de `Set`
- **Status das Entidades** — badge colorido no Config Home
- **Desligar Sala** — funcional com filtro respeitado
- **Sem ES Modules** — zero `import`/`export`, zero arrow functions complexas
- **Sem backdrop-filter** — desativado via CSS inline para preservar RAM do iPad
- **Reconexão automática** — WebSocket reconecta em 5s se cair

---

## 🔧 Compatibilidade

| Recurso | Pro (index.html) | iPad (ipad.html) |
|---|---|---|
| ES Modules | ✅ | ❌ desativado |
| Arrow functions | ✅ | ❌ usa `function()` |
| `Set` / Spread `...` | ✅ | ❌ usa objetos `{}` |
| Template literals | ✅ | ❌ concatenação |
| `backdrop-filter` | ✅ | ❌ desativado |
| WebSocket | ✅ | ✅ |
| LocalStorage | ✅ | ✅ |
| iOS 10 Safari | ❌ | ✅ |
| iOS 17+ Safari | ✅ | ✅ |
| Chrome Mac | ✅ | ✅ |

---

## ⚙️ Configuração

### Versão Pro (`config.js`)
```js
export const HA_CONFIG = {
    URL: "http://SEU_IP:8123",
    TOKEN: "SEU_TOKEN"
};
export const WEATHER_ENTITY = "weather.casa_accuweather";
export const RAIN_DAY_1 = "sensor.casa_accuweather_thunderstorm_probability_day_1";
export const RAIN_NIGHT_1 = "sensor.casa_accuweather_thunderstorm_probability_night_1";
```

### Versão iPad (`config-legacy.js`)
```js
var HA_URL   = "http://SEU_IP:8123";
var HA_TOKEN = "SEU_TOKEN";
var WEATHER_ENTITY = "weather.casa_accuweather";
var RAIN_DAY_1     = "sensor.casa_accuweather_thunderstorm_probability_day_1";
var RAIN_NIGHT_1   = "sensor.casa_accuweather_thunderstorm_probability_night_1";
```

> ⚠️ Mantenha os dois arquivos de config sincronizados ao alterar IP ou token.

---

## 📜 Histórico de Versões

### v3.1.0 / ipad v2.0.0 — 17/03/2026
- ✨ Filtro de Áreas em todas as páginas (Home, Luzes, Tomadas, Config Home)
- ✨ Badge de status das entidades no Config Home (verde/cinza/azul)
- ✨ "Desligar Sala" e "Desligar Tudo" respeitam filtro ativo
- ✨ Aba Sistema completa na versão Pro
- 🐛 Correção de duplicação de código no script.js (causava tela em branco)
- 📱 Versão iPad portada com paridade de features

### v3.0.1 — anterior
- 🐛 Rollback de instabilidades de navegação e conflitos de abas
- ✅ Estável no Mac (Chrome) e iPhone 15

### v3.0.0 — anterior
- ✨ Auto Mapping por Áreas
- ✨ Simplificação de Nomes
- ✨ LocalStorage Sync
- ✨ Versão iPad Legacy inicial

---

## 🚀 Próximos Passos Sugeridos

- [ ] Suporte a `climate` e `cover` no grid Home (card de temperatura / persiana)
- [ ] Modo escuro/claro alternável
- [ ] Página de Câmeras (stream MJPEG via HA)
- [ ] Notificações de alertas (motion, door sensors)
- [ ] Atualização automática do token ao expirar
