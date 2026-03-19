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

---

## 📋 Funcionalidades Implementadas

### Ambas as versões:
- ✅ Relógio e data em tempo real (pt-BR)
- ✅ Clima via AccuWeather
- ✅ Auto Mapping por Áreas do HA
- ✅ Simplificação de nomes
- ✅ Navegação lateral (Home, Luzes, Tomadas, Sistema)
- ✅ Filtro de Áreas com chips (multi-select, persistido)
- ✅ Ícones SVG: lâmpada amarela (on) / com risco vermelho (off)
- ✅ Nome do card colorido: amarelo = on, cinza = off
- ✅ ⭐ Estrela Favorito nas listas → adiciona/remove do Home
- ✅ Desligar Tudo / Desligar Sala (respeitam filtro)
- ✅ Reconexão automática WebSocket (5s)
- ✅ LocalStorage para favoritos e filtros

### Só versão Pro:
- ✅ Aba Sistema com contadores dinâmicos

### Só versão iPad:
- ✅ Grid responsivo (cards 110px)
- ✅ Sem backdrop-filter
- ✅ Processa campos `a` e `c` do WebSocket

---

## 🗑️ O que foi removido

| O que | Por quê |
|---|---|
| Aba "Config. Home" | Substituída pela ⭐ Estrela Favorito |
| `iniciarTabs()` iPad | Sem tabs após remoção |
| `renderSettings()` | Não chamada no ciclo de render |

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

---

## 📂 Estado Atual dos Arquivos

### `index.html`
- Título: `HAdashglass Pro v3.1`
- Pages: `page-home`, `page-lights`, `page-switches`, `page-settings`
- Settings: só Sistema (sem Config Home, sem tabs)
- Scripts: `script.js?v=3.0.1` (type="module")

### `script.js` (v3.2.0)
- Funções: `getLightIcon`, `getEntityIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `updateSystemTab`, `init`
- Removidas: `renderSettings`
- `areaFilters`: Sets para `home`, `lights`, `switches`

### `ipad.html`
- Pages: `page-home`, `page-lights`, `page-switches`, `page-settings`
- Settings: conteúdo direto sem tabs nem Config Home
- Scripts: `config-legacy.js` + `ipad-legacy.js` (sem type="module")
- CSS override: grid responsivo, header compacto, estrela

### `ipad-legacy.js` (v2.1.0)
- Funções: `getLightIcon`, `getIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `renderAll`, `connect`
- Removidas: `renderSettings`, `iniciarTabs`
- WebSocket: processa `evt.a` e `evt.c`, formato diff `+`
- `areaFilters`: objetos `{}` (sem Set)

### `style.css` (v3.2.0)
- Adicionado: `.star-btn`, `.star-btn.star-on`, `.area-chip`, `.area-filter-bar`

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