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
});
