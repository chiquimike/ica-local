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

    // CONTROL DEL FORMULARIO DE LA GALERÍA (Aquí estaba el error)
    const uploadForm = document.getElementById('upload-project-form');
    
    // Al usar este 'if', si el formulario no está cargado o renderizado, no rompe el JS
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Evita que la página se recargue

            // 1. Obtener los valores ingresados en el formulario
            const title = document.getElementById('project-title').value;
            const category = document.getElementById('project-category').value;
            const desc = document.getElementById('project-desc').value;
            const imageFile = document.getElementById('project-image').files[0];

            if (!imageFile) return;

            // 2. Uso de FileReader para previsualizar la imagen localmente
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageUrl = event.target.result;

                // 3. Crear la estructura HTML de la nueva tarjeta del proyecto
                const newCard = document.createElement('div');
                newCard.className = 'card-unam gallery-card';
                newCard.innerHTML = `
                    <img src="${imageUrl}" alt="Proyecto: ${title}" class="gallery-image">
                    <div class="card-info">
                        <h3>${title}</h3>
                        <p>${desc}</p>
                        <a href="${imageUrl}" target="_blank" class="btn-unam">Ver Detalles</a>
                    </div>
                `;

                // 4. Ubicar el contenedor correspondiente según la categoría seleccionada e inyectarlo
                const targetGrid = document.getElementById(`grid-${category}`);
                if (targetGrid) {
                    // Añadirlo al principio de la cuadrícula de la categoría
                    targetGrid.insertBefore(newCard, targetGrid.firstChild);
                    
                    // También le añadimos la animación Fade-In a la tarjeta recién creada
                    aplicarAnimacionTarjeta(newCard);
                    
                    // 5. Limpiar los campos del formulario tras subirlo exitosamente
                    uploadForm.reset();
                    alert('¡Proyecto subido con éxito a la galería temporal!');
                } else {
                    alert('Error al ubicar la categoría seleccionada en el diseño (Verifica que los contenedores tengan id="grid-category").');
                }
            };

            reader.readAsDataURL(imageFile);
        });
    }
});