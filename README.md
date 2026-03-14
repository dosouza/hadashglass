# HAdashglass Pro 🏠✨

Este projeto consiste em um dashboard personalizado para o **Home Assistant**, focado em uma estética **Glassmorphism** (efeito de vidro) moderna e minimalista. Ele foi projetado para ser responsivo, organizado por cômodos e integrado via WebSocket para controle em tempo real.

## 📑 Contexto do Projeto (Memória de Sistema)
*Se houver perda de contexto em futuras sessões, utilize estas informações para restaurar o progresso:*

* **Objetivo:** Interface web leve para tablets e telas fixas usando a biblioteca `home-assistant-js-websocket`.
* **Design:** Utiliza transparências (`rgba`), desfoque de fundo (`backdrop-filter`), e cores de destaque em amarelo/ouro (`#ffb400`).
* **Tecnologias:** HTML5, CSS3 (Variables, Grid, Flexbox) e JavaScript ES6.
* **Dispositivos Alvo:** iPhone 15, Mac e tablets dedicados à automação residencial.

## 🚀 Funcionalidades Atuais
* **Navegação SPA:** Sistema de abas (Home, Luzes, Tomadas, Ajustes) sem recarregamento de página.
* **Organização por Cômodos:** Agrupamento automático de dispositivos baseado na propriedade `room` definida no `config.js`.
* **Monitoramento Climático:** Integração com AccuWeather exibindo temperatura, umidade e probabilidade de chuva.
* **Relógio Dinâmico:** Data e hora local formatadas em tempo real.
* **Controles Globais:** Botões para desligar todas as luzes ou interruptores de uma vez em suas respectivas abas.

## 🛠️ Estrutura de Arquivos
* `index.html`: Estrutura principal e containers de página.
* `style.css`: Estilização visual e lógica do efeito glass.
* `script.js`: Lógica de conexão com o HA e renderização de componentes.
* `config.js`: Central de mapeamento de entidades (Luzes da Sala, Quarto Sophia, Quarto Visita, Lavanderia, etc.).
* `background/fundo.jpg`: Papel de parede abstrato para composição do visual.

## 📂 Mapeamento de Entidades (Referência)
Atualmente, o projeto monitora e controla as seguintes áreas:
* **Sala de Estar:** Iluminação de teto.
* **Quarto Visita:** Iluminação de teto.
* **Quarto Sophia:** Closet e iluminação de teto.
* **Lavanderia:** Iluminação de teto.
* **Sensores:** Portão da garagem e status do Wi-Fi.

## 📄 Licença e Uso
Projeto desenvolvido para uso pessoal em ambiente de Home Automation.