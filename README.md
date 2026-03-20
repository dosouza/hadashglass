# HAdashglass

Dashboard HTML customizado para Home Assistant, com design glassmorphism, conexão via WebSocket nativo e suporte a dois dispositivos com versões diferentes do Safari.

---

## Versões

| Versão | Arquivo | Dispositivo | Compatibilidade |
|---|---|---|---|
| Pro | `index.html` + `script.js` | Mac / iPhone 15 | Chrome, Safari iOS 17+ |
| Legacy | `ipad.html` + `ipad-legacy.js` | iPad 4ª geração | Safari iOS 10.3.3 |

---

## Funcionalidades

- Relógio e data em tempo real (pt-BR)
- Clima via AccuWeather (temperatura, umidade, chuva)
- Conexão WebSocket nativa com o Home Assistant
- Auto-mapeamento por Áreas do HA
- Simplificação automática de nomes de entidades
- Filtro de Áreas com chips (multi-select, persistido)
- Filtro de Status (On/Off) por página (persistido)
- Ícones SVG de lâmpada: acesa (amarelo) / apagada (com risco vermelho)
- Estrela Favorito ⭐ nas listas → adiciona/remove do Home
- Botões Desligar Tudo / Desligar Sala (respeitam filtros ativos)
- Reconexão automática WebSocket (5s)
- Oculta entidades marcadas como `hidden_by` / `disabled_by` no HA

---

## Navegação

```
🏠 Home      — Cards favoritos, agrupados por área
⚙️ Ajustes   — Abas:
               💡 Luzes    — lista com filtro de área + status
               🔌 Tomadas  — lista com filtro de área + status
               ⚙️ Sistema  — informações e contadores
```

---

## Estrutura de Arquivos

```
hadashglass/
├── index.html          # Dashboard Pro (Mac/iPhone)
├── ipad.html           # Dashboard Legacy (iPad 4)
├── script.js           # Lógica Pro — ES Modules
├── ipad-legacy.js      # Lógica Legacy — ES5 puro
├── style.css           # Estilos compartilhados
├── config.js           # Token Pro (não commitado)
├── config-legacy.js    # Token Legacy (não commitado)
├── config.example.js   # Exemplo de configuração
├── background/
│   ├── fundo.jpg       # Background versão Pro
│   └── fundoipad6.jpg  # Background versão iPad
└── Claude.md           # Histórico de desenvolvimento para IA
```

---

## Configuração

1. Copie `config.example.js` para `config.js` e preencha com a URL e o token do seu HA:

```js
export const HA_CONFIG = {
    URL: 'http://SEU_HA_IP:8123',
    TOKEN: 'SEU_TOKEN_AQUI'
};
export const WEATHER_ENTITY = 'weather.sua_entidade';
export const RAIN_DAY_1 = 'sensor.sua_entidade_chuva';
```

2. Para o iPad, crie `config-legacy.js` (sem `export`):

```js
var HA_URL = 'http://SEU_HA_IP:8123';
var HA_TOKEN = 'SEU_TOKEN_AQUI';
var WEATHER_ENTITY = 'weather.sua_entidade';
var RAIN_DAY_1 = 'sensor.sua_entidade_chuva';
```

---

## Deploy no Home Assistant

Coloque os arquivos em `/config/www/hadashglass/` no seu HA. Acesse via:

```
http://SEU_HA_IP:8123/local/hadashglass/index.html
http://SEU_HA_IP:8123/local/hadashglass/ipad.html
```

Para deploy automático via git:

```bash
# No Pi/servidor do HA
cd /config/www/hadashglass
git clone git@github.com:SEU_USUARIO/hadashglass.git .

# Adicione ao crontab (git pull a cada 5 min)
*/5 * * * * cd /config/www/hadashglass && git pull >> autopull.log 2>&1
```

---

## Por que duas versões JS?

O iPad 4 roda iOS 10.3.3 — o Safari desta versão não suporta ES Modules (`import/export`), `Set`, spread operator (`...`) ou arrow functions (`=>`). Por isso existem dois arquivos JS separados:

- `script.js` — ES Modules modernos, usa a lib `home-assistant-js-websocket`
- `ipad-legacy.js` — ES5 puro, WebSocket nativo implementado manualmente
