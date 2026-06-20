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

    // CMS: cargar el contenido editable
    cargarContenidoCMS();

    // CMS admin: el toggle "Administrar" muestra/oculta el login de Google
    const adminToggle = document.getElementById('admin-toggle');
    if (adminToggle) {
        adminToggle.addEventListener('click', () => {
            const box = document.getElementById('admin-login-box');
            box.style.display = (box.style.display === 'block') ? 'none' : 'block';
        });
    }
    // Si ya hay sesion activa, verificar (en silencio) si es admin
    if (sessionStorage.getItem('token_ica')) {
        verificarAdminCMS(false);
    }
});

// =============================================================
// 5. CMS — CONTENIDO DINAMICO (lectura con fallback)
// =============================================================
// Pide los textos editados al backend y reemplaza los elementos marcados con
// data-cms="...". Si una clave no existe o el backend falla, se queda el texto
// por defecto del HTML (degradacion elegante: la pagina nunca se rompe).
function cargarContenidoCMS() {
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/contenido')
        .then(res => res.ok ? res.json() : {})
        .then(data => {
            if (!data || typeof data !== 'object') return;
            document.querySelectorAll('[data-cms]').forEach(el => {
                const clave = el.getAttribute('data-cms');
                const valor = data[clave];
                if (valor !== undefined && valor !== null && valor !== '') {
                    el.textContent = valor; // override (textContent = seguro, sin inyeccion HTML)
                }
            });
        })
        .catch(() => { /* backend caido -> se quedan los textos por defecto */ });
}

// =============================================================
// 6. CMS — MODO EDICION (solo administradores)
// =============================================================
function handleCredentialResponseCMS(response) {
    sessionStorage.setItem('token_ica', response.credential);
    verificarAdminCMS(true);
}

function verificarAdminCMS(avisar) {
    const token = sessionStorage.getItem('token_ica');
    if (!token) return;
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/admin/check', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => { if (!res.ok) throw new Error('no-admin'); return res.json(); })
        .then(() => {
            // Es admin: ocultar el login y mostrar la barra de edicion
            const box = document.getElementById('admin-login-box');
            if (box) box.style.display = 'none';
            const bar = document.getElementById('cms-toolbar');
            if (bar) bar.style.display = 'flex';
        })
        .catch(() => {
            if (avisar) alert('Tu cuenta no está autorizada para administrar.');
        });
}

function activarEdicionCMS() {
    document.querySelectorAll('[data-cms]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.classList.add('cms-editando');
    });
    document.getElementById('btn-cms-editar').style.display = 'none';
    document.getElementById('btn-cms-guardar').style.display = 'inline-block';
    document.getElementById('btn-cms-cancelar').style.display = 'inline-block';
}

function guardarEdicionCMS() {
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    const items = [];
    document.querySelectorAll('[data-cms]').forEach(el => {
        const clave = el.getAttribute('data-cms');
        items.push({ clave: clave, valor: el.textContent.trim(), seccion: clave.split('.')[0] });
    });
    fetch(base + '/contenido', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(items)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'Éxito') {
            alert('Cambios guardados ✅');
            terminarEdicionCMS();
        } else {
            alert('Error: ' + (data.detail || data.detalle || 'no se pudo guardar'));
        }
    })
    .catch(() => alert('Fallo al conectar con el servidor.'));
}

function cancelarEdicionCMS() {
    terminarEdicionCMS();
    cargarContenidoCMS(); // recarga los valores guardados (descarta cambios sin guardar)
}

function terminarEdicionCMS() {
    document.querySelectorAll('[data-cms]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('cms-editando');
    });
    document.getElementById('btn-cms-editar').style.display = 'inline-block';
    document.getElementById('btn-cms-guardar').style.display = 'none';
    document.getElementById('btn-cms-cancelar').style.display = 'none';
}