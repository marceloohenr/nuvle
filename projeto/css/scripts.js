document.addEventListener("DOMContentLoaded", function () {
    // Função para alternar a visibilidade da sidebar
    const toggleSidebar = () => {
        const sidebar = document.querySelector(".sidebar");
        sidebar.classList.toggle("hidden"); // Alterna a classe "hidden" para esconder/mostrar a sidebar
    };

    // Adicionando a funcionalidade do menu hambúrguer
    const sidebarToggleButton = document.querySelector(".sidebar-toggle");
    if (sidebarToggleButton) {
        sidebarToggleButton.addEventListener("click", toggleSidebar);
    }

    // Funcionalidade das abas de produtos
    const tabButtons = document.querySelectorAll(".tab-button");
    const productContainers = document.querySelectorAll(".product-container");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");

            // Remove a classe ativa de todos os botões de aba
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Esconde todos os containers de produtos
            productContainers.forEach(container => container.classList.remove("active"));

            // Adiciona a classe ativa no botão da aba clicada
            button.classList.add("active");

            // Exibe o container de produto correspondente
            document.getElementById(targetTab).classList.add("active");
        });
    });
});
