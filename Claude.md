# 🤖 CLAUDE.md — Histórico de Desenvolvimento HAdashglass

> Este arquivo serve para **retomar o contexto** com a IA caso a conversa seja perdida.
> Cole o conteúdo deste arquivo no início de uma nova conversa com Claude.

---

## 🧠 Contexto do Projeto

**Projeto:** HAdashglass — Dashboard HTML para Home Assistant
**Dono:** Demetrius Souza
**Ambiente:** Dashboard web servido pela pasta `www` do próprio Home Assistant
**HA IP:** `http://10.10.0.148:8123`
**Repositório:** GitHub (privado) — editado via `github.dev` no browser

---

## 📱 Dispositivos em Uso

| Dispositivo | URL | Arquivo |
|---|---|---|
| Mac / iPhone 15 | `http://10.10.0.148:8123/local/hadashglass/index.html` | Versão Pro |
| iPad 4ª geração (iOS 10.3.3, MD512LL/A) | `http://10.10.0.148:8123/local/hadashglass/ipad.html` | Versão Legacy |

---

## 🏗️ Infraestrutura

| O que | Detalhe |
|---|---|
| Servidor | Raspberry Pi rodando Home Assistant |
| Pasta no Pi | `/config/www/hadashglass/` (symlink de `/homeassistant/www/`) |
| URL base HA | `http://10.10.0.148:8123/local/hadashglass/` |
| GitHub | Repositório privado — editado via `github.dev` |
| Deploy | Crontab no Pi: `*/5 * * * * cd /config/www/hadashglass && git pull` |
| Log autopull | `/config/www/hadashglass/autopull.log` |
| SSH Pi | `ssh root@10.10.0.148` |
| Mac local | `~/Documents/GitHub/hadashglass` |
| Alias Mac | `hadashglass` → `cd ~/Documents/GitHub/hadashglass` |

---

## 🔑 Arquivos que NÃO vão para o Git

- `config.js` — token da versão Pro
- `config-legacy.js` — token da versão iPad
- Ambos no `.gitignore`
- Precisam ser criados manualmente no Pi após clone

---

## 🏗️ Decisões Técnicas Importantes

### Por que dois arquivos JS?
O iPad 4 roda iOS 10.3.3 — Safari não suporta ES Modules, `import/export`, `Set`, spread `...` ou arrow functions. Por isso:
- `script.js` — versão moderna ES Modules
- `ipad-legacy.js` — JS puro iOS 10 (`var`, `function()`, objetos `{}`)

### Por que hospedar na pasta www do HA?
- Zero configuração extra de servidor
- Mesma origem → sem problemas de CORS com WebSocket
- Acesso externo automático via Nabu Casa (já contratado)
- `git pull` automático via crontab

### Por que NÃO usar iframe no HA?
- iPad 4 não tem app HA para iOS 10
- Frontend do HA é pesado demais para 1GB RAM do iPad 4
- WebSocket duplicado (HA + dashboard)

### WebSocket HA
Usa protocolo nativo `/api/websocket`. Subscribe envia:
- `a` (added) — estado inicial
- `c` (changed) — mudanças, formato diff com `+`
Ambos processados no `ipad-legacy.js`

### Entidades ocultas pelo HA
Quando um `switch` é exposto como `light` via entidade auxiliar, o HA marca o switch original com `hidden_by: "integration"`. O dashboard filtra essas entidades via `isEntityVisible()` (legacy) e checagem inline (Pro) antes de renderizar qualquer lista ou card.

---

## 📋 Funcionalidades Implementadas

### Ambas as versões:
- ✅ Relógio e data em tempo real (pt-BR)
- ✅ Clima via AccuWeather
- ✅ Auto Mapping por Áreas do HA
- ✅ Simplificação de nomes
- ✅ Navegação lateral: apenas **Home** e **Ajustes**
- ✅ Filtro de Áreas com chips (multi-select, persistido)
- ✅ Filtro de Status com chips: On / Off (persistido por página)
- ✅ Ícones SVG: lâmpada amarela (on) / com risco vermelho (off)
- ✅ Nome do card colorido: amarelo = on, cinza = off
- ✅ ⭐ Estrela Favorito nas listas → adiciona/remove do Home
- ✅ Desligar Tudo / Desligar Sala (respeitam ambos os filtros)
- ✅ Reconexão automática WebSocket (5s)
- ✅ LocalStorage para favoritos, filtros de área e filtros de status
- ✅ Ocultar entidades com `hidden_by` / `disabled_by` do entity registry

### Página Ajustes — 3 abas:
- ✅ **💡 Luzes** — lista com filtro de área + filtro de status (Todas/Acesas/Apagadas)
- ✅ **🔌 Tomadas** — lista com filtro de área + filtro de status (Todos/Ligados/Desligados)
- ✅ **⚙️ Sistema** — contadores dinâmicos (só Pro) / info estática (iPad)

### Só versão Pro:
- ✅ Aba Sistema com contadores dinâmicos (entidades, áreas)

### Só versão iPad:
- ✅ Grid responsivo (cards 110px)
- ✅ Sem backdrop-filter
- ✅ Processa campos `a` e `c` do WebSocket

---

## 🗑️ O que foi removido

| O que | Por quê |
|---|---|
| Aba "Config. Home" | Substituída pela ⭐ Estrela Favorito |
| `renderSettings()` Pro | Não chamada no ciclo de render |
| Nav icons 💡 Luzes e 🔌 Tomadas | Movidos para abas dentro de Ajustes |
| Pages `page-lights` e `page-switches` | Conteúdo migrado para tabs em `page-settings` |

---

## 🐛 Bugs Resolvidos

| Bug | Causa | Fix |
|---|---|---|
| iPad tela em branco | `type="module"` não suportado iOS 10 | Criado `ipad-legacy.js` |
| Duplicação no `script.js` | `str_replace` parcial | Arquivo recriado limpo |
| Home vazio Pro | Grid limpo antes do filtro | Filtro renderizado antes do `innerHTML = ''` |
| Cards sobrepostos iPad | `minmax(140px)` largo demais | Override `minmax(110px)` |
| Toggle não atualiza iPad | Só lia campo `a`, ignorava `c` | Handler atualizado |
| Aba Sistema invisível iPad | Classe `tab-content` escondida pelo CSS | Removida a classe |
| 404 no HA | Cache do browser com URL antiga | Aba anônima / limpar cache |
| Git divergente Pi/Mac | Moveu pasta do iCloud para Documentos | `git fetch && git reset --hard origin/main` |
| Git case-sensitive Mac | Mac não detecta maiúscula→minúscula | `git mv` com nome temporário |
| Switch oculto aparecendo como Tomada | `hidden_by` não era verificado | Filtro por `hidden_by` / `disabled_by` no entity registry |

---

## 📂 Estado Atual dos Arquivos

### `index.html`
- Título: `HAdashglass Pro v3.1`
- Pages: `page-home`, `page-settings`
- Settings: abas 💡 Luzes, 🔌 Tomadas, ⚙️ Sistema
- Scripts: `script.js?v=3.0.1` (type="module")

### `script.js` (v3.2.0)
- Funções: `getLightIcon`, `getEntityIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `updateSystemTab`, `init`
- Filtros: `areaFilters` (Set), `stateFilters` (string: 'all'|'on'|'off')
- Funções de filtro: `renderAreaFilter`, `renderStateFilter`, `isRoomVisible`, `isStateVisible`
- Oculta entidades com `hidden_by` / `disabled_by`

### `ipad.html`
- Pages: `page-home`, `page-settings`
- Settings: abas 💡 Luzes, 🔌 Tomadas, ⚙️ Sistema (estático)
- Scripts: `config-legacy.js` + `ipad-legacy.js` (sem type="module")
- CSS override: grid responsivo, header compacto, sem backdrop-filter

### `ipad-legacy.js` (v2.1.0)
- Funções: `isEntityVisible`, `getLightIcon`, `getIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `renderAll`, `connect`
- Funções de filtro: `renderAreaFilter`, `renderStateFilter`, `isRoomVisible`, `isStateVisible`, `hasAnyFilter`
- Nav: `iniciarNavegacao` + `iniciarTabs`
- WebSocket: processa `evt.a` e `evt.c`, formato diff `+`
- `areaFilters`: objetos `{}` (sem Set); `stateFilters`: objetos com string

### `style.css` (v3.2.0)
- `.star-btn`, `.star-btn.star-on`
- `.area-chip`, `.area-filter-bar`
- `.filter-group` — wrapper que empilha filtro de área + filtro de status

---

## 💬 Como Retomar a Conversa

Se precisar continuar em nova conversa, diga ao Claude:

> "Estou desenvolvendo o projeto HAdashglass, um dashboard HTML para Home Assistant.
> Segue o CLAUDE.md com todo o histórico:"
> [cole este arquivo]

---

## 🔮 Próximos Passos

- [ ] Testar iPad na nova URL do HA
- [ ] Criar `config-legacy.js` no Pi para o iPad
- [ ] Salvar bookmark na tela inicial do iPad
- [ ] Detecção automática URL (casa `10.10.0.148` vs Nabu Casa)
- [ ] Card de `climate` no Home (temperatura + setpoint)
- [ ] Card de `cover` no Home (persiana/portão)
- [ ] Página de Câmeras (stream MJPEG)
- [ ] Notificações visuais de sensores
