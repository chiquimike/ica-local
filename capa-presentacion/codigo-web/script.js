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
    cargarGaleriaCMS();

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

    // CMS admin: al elegir una imagen, la subimos para la clave seleccionada
    const fileInput = document.getElementById('cms-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file && cmsImgClaveActual) subirImagenCMS(cmsImgClaveActual, file);
            this.value = '';
        });
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
            // Imagenes editables: el valor guardado es la URL de la imagen subida
            document.querySelectorAll('[data-cms-img]').forEach(el => {
                const valor = data[el.getAttribute('data-cms-img')];
                if (valor) {
                    el.src = (valor.indexOf('/imagenes/') === 0) ? (base + valor) : valor;
                }
            });
        })
        .catch(() => { /* backend caido -> se quedan los textos/imagenes por defecto */ });
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
    // Imagenes: clic para reemplazar
    document.querySelectorAll('[data-cms-img]').forEach(el => {
        el.classList.add('cms-img-editando');
        el.addEventListener('click', cmsClickImagen);
    });
    // Galeria: mostrar el formulario de alta y los botones de borrar
    document.body.classList.add('cms-edicion');
    const galForm = document.getElementById('cms-galeria-form');
    if (galForm) galForm.style.display = 'block';
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
    document.querySelectorAll('[data-cms-img]').forEach(el => {
        el.classList.remove('cms-img-editando');
        el.removeEventListener('click', cmsClickImagen);
    });
    document.body.classList.remove('cms-edicion');
    const galForm = document.getElementById('cms-galeria-form');
    if (galForm) galForm.style.display = 'none';
    document.getElementById('btn-cms-editar').style.display = 'inline-block';
    document.getElementById('btn-cms-guardar').style.display = 'none';
    document.getElementById('btn-cms-cancelar').style.display = 'none';
}

// === CMS: subida de imagenes ===
let cmsImgClaveActual = null;

function cmsClickImagen(e) {
    cmsImgClaveActual = e.currentTarget.getAttribute('data-cms-img');
    document.getElementById('cms-file-input').click();
}

function subirImagenCMS(clave, file) {
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    const fd = new FormData();
    fd.append('clave', clave);
    fd.append('imagen', file);
    fetch(base + '/contenido/imagen', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
    })
    .then(res => res.json())
    .then(data => {
        if (data.url) {
            const el = document.querySelector('[data-cms-img="' + clave + '"]');
            if (el) el.src = base + data.url + '?t=' + Date.now(); // cache-bust para ver el cambio
            alert('Imagen actualizada ✅');
        } else {
            alert('Error: ' + (data.detail || data.detalle || 'no se pudo subir la imagen'));
        }
    })
    .catch(() => alert('Fallo al subir la imagen.'));
}

// =============================================================
// 7. CMS — GALERIA DE PROYECTOS
// =============================================================
const CURSOS_GALERIA = ['modelado-3d', 'impresion-3d', 'corte-laser', 'diseno-videojuegos'];

function cargarGaleriaCMS() {
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/galeria')
        .then(res => res.ok ? res.json() : [])
        .then(items => {
            if (!Array.isArray(items)) return;
            CURSOS_GALERIA.forEach(curso => {
                const grid = document.getElementById('grid-' + curso);
                if (!grid) return;
                grid.innerHTML = '';
                const delCurso = items.filter(it => it.curso === curso);
                if (delCurso.length === 0) {
                    const vacio = document.createElement('p');
                    vacio.style.color = '#888';
                    vacio.textContent = 'Sin Proyectos Aún.';
                    grid.appendChild(vacio);
                    return;
                }
                delCurso.forEach(it => grid.appendChild(crearTarjetaGaleria(it, base)));
            });
        })
        .catch(() => { /* backend caido -> se quedan los placeholders del HTML */ });
}

function crearTarjetaGaleria(it, base) {
    const imgs = (it.imagenes && it.imagenes.length) ? it.imagenes : (it.archivo ? [it.archivo] : []);
    const portada = imgs.length ? ((imgs[0].indexOf('/imagenes/') === 0) ? (base + imgs[0]) : imgs[0]) : '';
    const card = document.createElement('div');
    card.className = 'card-unam gallery-card';
    const img = document.createElement('img');
    img.className = 'gallery-image'; img.src = portada; img.alt = it.titulo || '';
    const info = document.createElement('div'); info.className = 'card-info';
    const h3 = document.createElement('h3'); h3.textContent = it.titulo || '';
    // "Ver Detalles" abre el visor con todas las fotos + la descripcion
    const ver = document.createElement('button');
    ver.className = 'btn-unam'; ver.textContent = 'Ver Detalles';
    ver.addEventListener('click', () => abrirGaleriaModal(it, base));
    const del = document.createElement('button');
    del.className = 'cms-galeria-del'; del.textContent = 'Quitar';
    del.addEventListener('click', () => eliminarProyectoGaleria(it.id));
    info.appendChild(h3); info.appendChild(ver); info.appendChild(del);
    card.appendChild(img); card.appendChild(info);
    return card;
}

function agregarProyectoGaleria() {
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    const titulo = document.getElementById('gal-titulo').value.trim();
    const files = document.getElementById('gal-img').files;
    if (!titulo || !files.length) { alert('Pon al menos título e imagen.'); return; }
    if (files.length > 5) { alert('Máximo 5 imágenes por proyecto.'); return; }
    const fd = new FormData();
    fd.append('curso', document.getElementById('gal-curso').value);
    fd.append('titulo', titulo);
    fd.append('descripcion', document.getElementById('gal-desc').value.trim());
    for (let i = 0; i < files.length; i++) fd.append('imagenes', files[i]);
    fetch(base + '/galeria', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'Éxito') {
            alert('Proyecto Publicado');
            document.getElementById('gal-titulo').value = '';
            document.getElementById('gal-desc').value = '';
            document.getElementById('gal-img').value = '';
            cargarGaleriaCMS();
        } else {
            alert('Error: ' + (data.detail || data.detalle || 'no se pudo publicar'));
        }
    })
    .catch(() => alert('Fallo al conectar con el servidor.'));
}

function eliminarProyectoGaleria(id) {
    if (!confirm('¿Quitar este proyecto de la galería?')) return;
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/galeria/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => res.json())
    .then(() => cargarGaleriaCMS())
    .catch(() => alert('Fallo al eliminar.'));
}

// === Galeria: visor (lightbox) con carrusel ===
let galModalImgs = [];
let galModalIdx = 0;

function abrirGaleriaModal(it, base) {
    const imgs = (it.imagenes && it.imagenes.length) ? it.imagenes : (it.archivo ? [it.archivo] : []);
    galModalImgs = imgs.map(u => (u.indexOf('/imagenes/') === 0) ? (base + u) : u);
    galModalIdx = 0;
    document.getElementById('gal-modal-titulo').textContent = it.titulo || '';
    document.getElementById('gal-modal-desc').textContent = it.descripcion || '';
    galModalRender();
    document.getElementById('galeria-modal').style.display = 'flex';
}

function galModalRender() {
    if (!galModalImgs.length) return;
    document.getElementById('gal-modal-img').src = galModalImgs[galModalIdx];
    const cont = document.getElementById('gal-modal-contador');
    // Las flechas solo tienen sentido si hay mas de una imagen
    const hayVarias = galModalImgs.length > 1;
    document.querySelectorAll('.gal-nav').forEach(b => b.style.display = hayVarias ? 'block' : 'none');
    cont.textContent = hayVarias ? ((galModalIdx + 1) + ' / ' + galModalImgs.length) : '';
}

function galModalNav(d) {
    if (!galModalImgs.length) return;
    galModalIdx = (galModalIdx + d + galModalImgs.length) % galModalImgs.length;
    galModalRender();
}

function cerrarGaleriaModal() {
    document.getElementById('galeria-modal').style.display = 'none';
}