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

    // 4. Marcar el botón actual como activo (buscando por el texto o el onclick)
    // Buscamos el link que tenga el onclick que contiene el sectionId
    const activeLink = document.querySelector(`a[onclick*="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}
/* ============================================= */
/* LÓGICA DEL FORMULARIO (PETICIÓN AL BACKEND)   */
/* ============================================= */
const apiUrl = 'http://192.168.49.2:30090/usuarios';
            
document.getElementById('form-registro').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const archivoInput = document.getElementById('historial');
    const archivo = archivoInput.files[0];
    const limiteBytes = 1 * 1024 * 1024; // 1 Megabyte
    
    if (archivo.size > limiteBytes) {
        alert("Error: El archivo pesa " + (archivo.size / 1024).toFixed(2) + " KB. El límite es de 1 MB. Por favor, comprime tu PDF.");
        return;
    }

    const formData = new FormData();
    formData.append('numero_cuenta', document.getElementById('cuenta').value);
    formData.append('nombre', document.getElementById('nombre').value.toUpperCase());
    formData.append('telefono', document.getElementById('telefono').value);
    formData.append('correo', document.getElementById('correo').value.toLowerCase());
    formData.append('carrera', document.getElementById('carrera').value.toUpperCase());
    formData.append('semestre', document.getElementById('semestre').value);
    formData.append('historial_pdf', archivo);

    fetch(apiUrl, {
        method: 'POST',
        body: formData 
    }).then(res => res.json()).then(data => {
        if(data.status === "Éxito") { 
            alert("Registro completado y PDF guardado exitosamente."); 
            document.getElementById('form-registro').reset(); 
        } else {
            alert("Error en el servidor: " + data.detalle);
        }
    });
});