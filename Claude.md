# 🤖 CLAUDE.md — Histórico de Desenvolvimento HAdashglass

> Este arquivo serve para **retomar o contexto** com a IA caso a conversa seja perdida.
> Cole o conteúdo deste arquivo no início de uma nova conversa com Claude.

---

## 🧠 Contexto do Projeto

**Projeto:** HAdashglass — Dashboard HTML para Home Assistant
**Dono:** Demetrius Souza
**Ambiente:** Dashboard web servido via Go Live (VSCode) acessado pelo navegador na rede local
**HA IP:** `http://10.10.0.148:8123` (servidor HA)
**Dashboard IP:** `http://10.10.0.145` (servidor Go Live)

---

## 📱 Dispositivos em Uso

| Dispositivo | Acesso | Arquivo |
|---|---|---|
| Mac / iPhone 15 | `http://10.10.0.145/index.html` | Versão Pro |
| iPad 4ª geração (iOS 10.3.3, MD512LL/A) | `http://10.10.0.145/ipad.html` | Versão Legacy |

---

## 🏗️ Decisões Técnicas Importantes

### Por que dois arquivos JS?
O iPad 4 roda iOS 10.3.3, cujo Safari **não suporta ES Modules** (`type="module"`), `import/export`, `Set`, spread operator (`...`) ou arrow functions complexas. Por isso existe:
- `script.js` — versão moderna com ES Modules
- `ipad-legacy.js` — versão iOS 10 com JS puro (`var`, `function()`, objetos `{}`)

### Por que dois arquivos de config?
- `config.js` usa `export const` (ES Modules) → só funciona na versão Pro
- `config-legacy.js` usa `var` simples → funciona no iOS 10
- **Importante:** sempre manter os dois sincronizados ao trocar IP ou token

### WebSocket HA
O projeto usa o protocolo WebSocket nativo do HA (`/api/websocket`), não depende de bibliotecas externas na versão iPad. O `subscribe_entities` envia mudanças em dois campos:
- `a` (added/initial) — entidades novas ou estado inicial
- `c` (changed) — mudanças de estado, pode vir com formato diff `+`

---

## 📋 Funcionalidades Implementadas (estado atual)

### Ambas as versões:
- ✅ Relógio e data em tempo real (pt-BR)
- ✅ Clima via AccuWeather (temperatura, condição, umidade, chuva)
- ✅ Auto Mapping por Áreas do HA (registry)
- ✅ Simplificação de nomes (remove "Luz" e nome da área)
- ✅ Navegação lateral (Home, Luzes, Tomadas, Sistema)
- ✅ Filtro de Áreas com chips clicáveis (multi-select, persistido)
- ✅ Ícones SVG visuais: lâmpada amarela (on) / com risco vermelho (off)
- ✅ Nome do card colorido: amarelo = on, cinza = off
- ✅ ⭐ Estrela Favorito nas listas → adiciona/remove do Home
- ✅ Desligar Tudo / Desligar Sala (respeitam filtro de área)
- ✅ Reconexão automática WebSocket (5s)
- ✅ LocalStorage para favoritos e filtros

### Só versão Pro:
- ✅ Aba Sistema com contadores dinâmicos (total entidades, visíveis, áreas)

### Só versão iPad:
- ✅ Grid responsivo (cards 110px, header compacto)
- ✅ Sem backdrop-filter (preserva RAM do iPad 4)
- ✅ Processamento de campos `a` e `c` do WebSocket

---

## 🗑️ O que foi removido e por quê

| O que | Por quê |
|---|---|
| Aba "Config. Home" nos ajustes | Substituída pela ⭐ Estrela Favorito nas listas |
| `iniciarTabs()` no iPad | Sem tabs para gerenciar após remoção do Config Home |
| `renderSettings()` | Não é mais chamada no ciclo de render |

---

## 🐛 Bugs Resolvidos (histórico)

| Bug | Causa | Fix |
|---|---|---|
| iPad tela em branco | `type="module"` não suportado no iOS 10 | Criado `ipad-legacy.js` sem ES Modules |
| `ipad-legacy.js` vazio | Arquivo nunca foi escrito | Reescrito do zero |
| `ipad.html` apontava para `ipad-lite.js` | Nome errado | Corrigido para `ipad-legacy.js` |
| Duplicação de código no `script.js` | `str_replace` só substituiu o início | Arquivo recriado limpo |
| Home vazio na versão Pro | Grid limpo antes do filtro renderizar | Filtro renderizado antes de `grid.innerHTML = ''` |
| Cards sobrepostos no iPad | `minmax(140px)` largo demais | Override para `minmax(110px)` no `ipad.html` |
| Toggle não atualiza card no iPad | `subscribe_entities` só lia campo `a`, ignorava `c` | Handler atualizado para processar `a` e `c` |
| Aba Sistema invisível no iPad | `div` com classe `tab-content` que CSS esconde | Removida a classe, conteúdo direto em `.page` |
| Estrela acidental aparecendo | Emoji no SVG do getLightIcon | Separado getLightIcon de getIcon |

---

## 📂 Estado Atual dos Arquivos

### `index.html`
- Título: `HAdashglass Pro v3.1`
- Pages: `page-home`, `page-lights`, `page-switches`, `page-settings`
- Settings: só aba Sistema (sem Config Home)
- Scripts: `script.js?v=3.0.1` (type="module")

### `script.js` (v3.2.0)
- Funções principais: `getLightIcon`, `getEntityIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `updateSystemTab`, `init`
- Removidas: `renderSettings`
- `areaFilters`: objeto com Sets para `home`, `lights`, `switches`

### `ipad.html`
- Pages: `page-home`, `page-lights`, `page-switches`, `page-settings`
- Settings: conteúdo direto sem tabs
- Scripts: `config-legacy.js` + `ipad-legacy.js` (sem type="module")
- CSS override inline: grid responsivo, header compacto, estrela

### `ipad-legacy.js` (v2.1.0)
- Funções principais: `getLightIcon`, `getIcon`, `toggleFavorite`, `renderHome`, `renderList`, `updateWeather`, `renderAll`, `connect`, `loadRegistries`
- Removidas: `renderSettings`, `iniciarTabs`
- WebSocket handler: processa `evt.a` e `evt.c`, formato diff com `+`
- `areaFilters`: objeto com objetos `{}` (sem Set)

### `style.css` (v3.2.0)
- Adicionado: `.star-btn`, `.star-btn.star-on`, `.area-chip`, `.area-filter-bar`

### `config.js` / `config-legacy.js`
- Nunca modificados — contêm IP, token e entity IDs do AccuWeather

---

## 💬 Como Retomar a Conversa

Se precisar continuar o desenvolvimento em uma nova conversa, diga ao Claude:

> "Estou desenvolvendo o projeto HAdashglass, um dashboard HTML para Home Assistant. 
> Segue o CLAUDE.md com todo o histórico do projeto para você ter contexto:"
> [cole este arquivo]

---

## 🔮 Próximos Passos Planejados

- [ ] Card de `climate` no Home (temperatura + setpoint, toggle on/off)
- [ ] Card de `cover` no Home (persiana/portão com ícone de posição)
- [ ] Página de Câmeras com stream MJPEG
- [ ] Notificações visuais de sensores (motion, door, smoke)
- [ ] Modo claro/escuro alternável
- [ ] Atualização automática do token HA ao expirar