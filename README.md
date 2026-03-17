🏠 HAdashglass Pro — Status do Projeto
📋 Resumo da Versão Atual
Versão: 3.0.1 (Stable Rollback)

Status: Funcional e Estável no Mac (Chrome) e iPhone 15

Ambiente: Dashboard integrado ao Home Assistant via WebSockets

Última Alteração: Reversão completa para remover instabilidades de navegação e conflitos de abas.

🛠️ Funcionalidades Ativas (v3.0.1)
Auto Mapping: Mapeamento automático de entidades por áreas (Cozinha, Sala, etc.).

Simplificação de Nomes: Remoção inteligente de termos redundantes (ex: "Luz" e nomes de áreas) nos cards.

Sincronização Local: Preferências de visibilidade de entidades salvas no navegador.

Navegação Lateral: Alternância entre Home, Luzes, Tomadas e Configurações.

Clima e Relógio: Header funcional com dados em tempo real.

🚀 Planejamento para Amanhã (Foco: iPad 6)
O objetivo é criar uma experiência fluida no iPad 6 sem comprometer a versão Pro que roda no Mac/iPhone.

1. Criação do ipad-lite.html
Versão "Enxuta" com CSS simplificado.

Remoção de backdrop-filter: blur para economizar memória RAM.

Uso de cores sólidas ou gradientes simples em vez de transparência vítrea.

2. Otimização de Performance
Avaliar a necessidade de reduzir a frequência de atualização do relógio ou clima.

Testar a renderização de listas longas (muitas luzes/tomadas) para evitar o fechamento repentino do Safari no iPadOS antigo.

3. Ajuste de Layout (90x90)
Revisar o espaçamento do grid para que os cards fiquem proporcionais à tela do iPad, mantendo a estética moderna.