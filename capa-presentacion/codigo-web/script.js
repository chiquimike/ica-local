// =============================================================
// 1. NAVEGACIÓN ENTRE SECCIONES (FUNCIONES GLOBALES)
// =============================================================
function showSection(sectionId) {
    console.log("Cambiando a la sección:", sectionId);

    // 1. Ocultar todas las secciones
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active');
    });

    // 2. Quitar el estado activo de todos los enlaces de la navbar
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // 3. Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }

    // 4. Marcar el botón actual como activo
    const activeLink = document.querySelector(`a[onclick*="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// =============================================================
// 2. SCROLL SUAVE A CURSOS
// =============================================================
function scrollToCursos() {
    showSection('cursos'); // Asegura que la sección de cursos esté visible

    setTimeout(() => {
        const cursosSec = document.getElementById('cursos');
        if (cursosSec) {
            cursosSec.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }, 100);
}

// =============================================================
// 3. ANIMACIÓN FADE-IN (INTERSECTION OBSERVER)
// =============================================================
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = 1;
            entry.target.style.transform = "translateY(0)";
        }
    });
}, { threshold: 0.05 }); // Umbral bajo para que se active sutilmente en pantallas chicas

// Función para aplicar la animación de forma segura
function aplicarAnimacionTarjeta(card) {
    card.style.opacity = 0;
    card.style.transform = "translateY(30px)";
    card.style.transition = "0.6s ease";
    observer.observe(card);
}

// =============================================================
// 4. INICIALIZACIÓN PROTEGIDA (CUANDO EL DOM ESTÁ LISTO)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializar animación en todas las tarjetas existentes
    const cards = document.querySelectorAll('.card-unam');
    cards.forEach(card => aplicarAnimacionTarjeta(card));
});