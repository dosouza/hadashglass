# HAdashglass Pro 🏠✨

Um dashboard elegante, minimalista e responsivo para **Home Assistant**, focado em estética "Glassmorphism" (efeito de vidro) e organização por cômodos.

## 🚀 Funcionalidades
- **Glassmorphism Design**: Interface moderna com transparências e desfoque de fundo (backdrop-filter).
- **Organização por Cômodos**: Agrupamento automático de dispositivos por categorias/quartos.
- **Top Bar Inteligente**: Chips de acesso rápido para sensores e portões.
- **Clima Detalhado**: Integração com AccuWeather exibindo temperatura, umidade e probabilidade de chuva.
- **Relógio em Tempo Real**: Data e hora sempre visíveis com atualização dinâmica.

## 🛠️ Tecnologias
- HTML5 / CSS3 (Variáveis CSS, CSS Grid, Flexbox)
- JavaScript (ES6 Modules)
- [home-assistant-js-websocket](https://github.com/home-assistant-libs/home-assistant-js-websocket)

## 📦 Como Instalar

1.  **Arquivos**: Baixe os arquivos `index.html`, `script.js` e `config.js` e coloque-os em uma pasta no seu servidor ou no diretório `www` do seu Home Assistant.
2.  **Configuração**: Edite o arquivo `config.js`:
    ```javascript
    export const HA_CONFIG = {
        URL: "http://SEU_IP:8123",
        TOKEN: "SEU_LONG_LIVED_ACCESS_TOKEN"
    };
    ```
3.  **Personalização**: Adicione suas entidades no array `MY_ENTITIES` dentro do `config.js`, definindo o `id`, `label`, `icon` e o `room`.

## 📸 Screenshots
*(Dica: Adicione aqui o print do seu dashboard funcionando!)*

## 📄 Licença
Este projeto é para uso pessoal e entusiastas de Home Automation.