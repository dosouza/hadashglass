📌 Visão Geral do Projeto
Este projeto consiste em um Dashboard personalizado para Home Assistant, focado em estética Glassmorphism (efeito de vidro) e alta performance para visualização em tablets e computadores. O sistema utiliza conexões via WebSocket e possui mapeamento automático de áreas e entidades.

🛠️ Tecnologias Utilizadas
Linguagem: HTML5, CSS3 e JavaScript (ES6+).

Conexão: home-assistant-js-websocket para comunicação em tempo real.

Design: Estética de vidro com backdrop-filter: blur, transparências e ícones dinâmicos.

📂 Estrutura de Arquivos Estável
Atualmente, o projeto utiliza três arquivos principais que devem ser mantidos na versão v3.0 - Auto Mapping:

1. index.html (Estrutura de Abas)
Sidebar: Navegação lateral entre Home, Luzes, Interruptores e Configurações.

Header: Relógio digital (24h), data por extenso e widget de clima completo.

Containers: Áreas específicas (grid) para renderização dinâmica via JavaScript.

2. script.js (Lógica e Integração)
Simplificação de Nomes: Função que remove automaticamente termos redundantes como "Luz" e o nome do cômodo do título dos cards (ex: "Luz Sala" na área "Sala" vira apenas "Sala").

Mapeamento por Área: O código consulta o registro do Home Assistant e agrupa as entidades automaticamente por cômodos.

Persistência Local: Utiliza localStorage para salvar quais entidades o usuário deseja fixar na tela inicial (page-home).

3. style.css (Visual e Layout)
Variáveis CSS: Centralização de cores e níveis de transparência (--glass, --active-color).

Responsividade: Grid adaptativo que redimensiona os cards dependendo do tamanho da tela.

Estados Visuais: Cards mudam de borda e brilho (box-shadow) quando a entidade está ligada (on).

⚠️ Status do Dispositivo (iPad 6)
Desafio: O iPad 6 (Safari antigo) apresenta erro de memória ("problema com a página web") ao tentar processar efeitos pesados de blur (vidro embaçado).

Solução Atual: Manter a versão visualmente rica para Mac e iPhone, e tratar o iPad como um caso isolado de otimização de RAM futuramente.

🚀 Como Iniciar uma Nova Conversa
Para retomar o projeto, basta carregar estes três arquivos e informar que o foco deve ser mantido na Versão Estável Glassmorphism, preservando a lógica de simplificação de nomes e o layout de grid.