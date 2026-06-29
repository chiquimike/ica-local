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
    cargarHorariosCMS();
    llenarHorasCMS();

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
    const horForm = document.getElementById('cms-horario-form');
    if (horForm) horForm.style.display = 'block';
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
            alert('Cambios Guardados');
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
    const horForm = document.getElementById('cms-horario-form');
    if (horForm) horForm.style.display = 'none';
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
            alert('Imagen Actualizada');
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

// =============================================================
// 8. CMS — HORARIOS (render dinamico de la rejilla)
// =============================================================
const HOR_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HOR_SALONES = ['CLOUD', 'CAPACITACION'];
const HOR_INICIO = 7 * 60;   // 07:00 (en minutos)
const HOR_FIN = 22 * 60;     // 22:00
const HOR_PASO = 30;         // bloques de 30 min

function horMin(hhmm) {
    const p = (hhmm || '').split(':');
    return (parseInt(p[0], 10) * 60) + parseInt(p[1] || '0', 10);
}
function horEtiqueta(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function cargarHorariosCMS() {
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/horarios')
        .then(res => res.ok ? res.json() : [])
        .then(bloques => {
            if (!Array.isArray(bloques)) bloques = [];
            HOR_SALONES.forEach(salon => renderHorarioSalon(salon, bloques.filter(b => b.salon === salon)));
        })
        .catch(() => { HOR_SALONES.forEach(salon => renderHorarioSalon(salon, [])); });
}

function renderHorarioSalon(salon, bloques) {
    const cont = document.getElementById('grid-horario-' + salon);
    if (!cont) return;
    const nSlots = (HOR_FIN - HOR_INICIO) / HOR_PASO;
    // ocup[dia][slot]: {bloque, span} en el inicio del bloque, 'cubierto' en el resto, null = libre
    const ocup = {};
    HOR_DIAS.forEach(d => { ocup[d] = new Array(nSlots).fill(null); });
    bloques.forEach(b => {
        if (HOR_DIAS.indexOf(b.dia) === -1) return;
        const ini = (horMin(b.hora_inicio) - HOR_INICIO) / HOR_PASO;
        const fin = (horMin(b.hora_fin) - HOR_INICIO) / HOR_PASO;
        if (isNaN(ini) || isNaN(fin) || ini < 0 || fin > nSlots || fin <= ini) return;
        ocup[b.dia][ini] = { bloque: b, span: fin - ini };
        for (let s = ini + 1; s < fin; s++) ocup[b.dia][s] = 'cubierto';
    });
    const tabla = document.createElement('table');
    tabla.className = 'timetable unam-theme-table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Hora'].concat(HOR_DIAS).forEach(t => { const th = document.createElement('th'); th.textContent = t; trh.appendChild(th); });
    thead.appendChild(trh);
    tabla.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (let s = 0; s < nSlots; s++) {
        const tr = document.createElement('tr');
        const tdHora = document.createElement('td');
        tdHora.textContent = horEtiqueta(HOR_INICIO + s * HOR_PASO);
        tr.appendChild(tdHora);
        HOR_DIAS.forEach(d => {
            const cel = ocup[d][s];
            if (cel === 'cubierto') return; // lo cubre el rowspan de arriba
            const td = document.createElement('td');
            if (cel && cel.bloque) {
                if (cel.span > 1) td.rowSpan = cel.span;
                const b = cel.bloque;
                if (b.tipo === 'asesoria') td.className = 'asesoria';
                td.appendChild(document.createTextNode(b.materia || ''));
                if (b.profesor) {
                    td.appendChild(document.createElement('br'));
                    const bo = document.createElement('b');
                    bo.textContent = '(' + b.profesor + ')';
                    td.appendChild(bo);
                }
                // Boton borrar (visible solo en modo edicion)
                const del = document.createElement('button');
                del.className = 'cms-horario-del'; del.textContent = 'Quitar';
                del.addEventListener('click', () => eliminarBloqueHorario(b.id));
                td.appendChild(document.createElement('br'));
                td.appendChild(del);
            } else {
                td.className = 'libre';
                td.textContent = '    ';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);
    cont.innerHTML = '';
    cont.appendChild(tabla);
}

// === CMS: editor de horarios (agregar / borrar bloques) ===
function llenarHorasCMS() {
    const ini = document.getElementById('hor-inicio');
    const fin = document.getElementById('hor-fin');
    if (!ini || !fin || ini.options.length) return;
    for (let m = HOR_INICIO; m <= HOR_FIN; m += HOR_PASO) {
        const t = horEtiqueta(m);
        ini.appendChild(new Option(t, t));
        fin.appendChild(new Option(t, t));
    }
}

function agregarBloqueHorario() {
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    const materia = document.getElementById('hor-materia').value.trim();
    if (!materia) { alert('Pon al menos la materia.'); return; }
    const bloque = {
        salon: document.getElementById('hor-salon').value,
        dia: document.getElementById('hor-dia').value,
        hora_inicio: document.getElementById('hor-inicio').value,
        hora_fin: document.getElementById('hor-fin').value,
        materia: materia,
        profesor: document.getElementById('hor-profesor').value.trim(),
        tipo: document.getElementById('hor-tipo').value
    };
    fetch(base + '/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(bloque)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'Éxito') {
            document.getElementById('hor-materia').value = '';
            document.getElementById('hor-profesor').value = '';
            cargarHorariosCMS();
        } else {
            alert('Error: ' + (data.detail || data.detalle || 'no se pudo agregar'));
        }
    })
    .catch(() => alert('Fallo al conectar con el servidor.'));
}

function eliminarBloqueHorario(id) {
    const token = sessionStorage.getItem('token_ica');
    const base = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
    fetch(base + '/horarios/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => res.json())
    .then(() => cargarHorariosCMS())
    .catch(() => alert('Fallo al eliminar.'));
}