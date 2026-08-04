# Guía: Modo Administrador del Sitio

Para la coordinación / profesor a cargo del portal público del ICA. No
requiere conocimientos técnicos ni acceso al servidor — todo se hace desde
el navegador, en el propio sitio web.

## Qué es el modo administrador

El sitio público (`index.html`) tiene un **gestor de contenidos (CMS)**
integrado: permite editar textos, imágenes, la galería de proyectos, los
horarios de los salones y el carrusel de inicio **sin tocar código**, con
sesión de Google.

## Cómo entrar

1. Baja hasta el final de cualquier página del sitio (el pie de página).
2. Hay un **punto (`.`)** casi invisible junto al resto del contenido del
   pie de página — es intencional, para que no llame la atención de un
   visitante cualquiera. Haz clic ahí.
3. Aparece un botón de inicio de sesión de Google, abajo a la derecha.
   Inicia sesión con tu cuenta de administrador.
4. Si tu cuenta está autorizada, aparece una **barra de herramientas**
   abajo a la derecha, con varios botones. Si no aparece nada, tu cuenta
   no está en la lista de administradores — contacta a quien administra
   el servidor.

## La barra de herramientas

| Botón | Qué hace |
|---|---|
| **Editar página** | Activa el modo edición en toda la página actual |
| **Guardar** | Guarda los cambios de texto que hiciste (aparece solo en modo edición) |
| **Cancelar** | Descarta los cambios sin guardar y sale del modo edición |
| **Respaldo** | Descarga una copia de seguridad de todo el contenido |
| **Restaurar** | Reemplaza todo el contenido actual por el de un respaldo |
| **Salir** | Cierra la sesión de administrador |

## Cómo editar contenido

1. Haz clic en **"Editar página"**.
2. Los textos editables quedan marcados con un **recuadro punteado azul** —
   haz clic dentro y escribe directamente, como en un documento de texto.
3. Las imágenes editables quedan marcadas con un **borde verde** — haz
   clic sobre la imagen para elegir un archivo nuevo desde tu computadora
   y la reemplaza al instante.
4. Cuando termines, haz clic en **"Guardar"**. Si te arrepientes antes de
   guardar, usa **"Cancelar"** — nada se pierde en el sitio, solo se
   descartan tus cambios sin guardar.

> **Cada sección de la página (Inicio, Cursos, Servicios, Servicio Social)
> tiene sus propios textos e imágenes editables** — entra a cada una y
> repite el proceso si quieres editar varias.

### Galería de proyectos

Al activar "Editar página" dentro de la sección **Galería**, aparece un
formulario para publicar un proyecto nuevo: curso, título, descripción
corta, y hasta **5 fotos** (la primera queda como portada). Cada proyecto
publicado muestra un botón **"Quitar"** para eliminarlo.

### Horarios

Dentro de la sección **Horarios**, en modo edición aparece un formulario
para agregar un bloque de clase (salón, día, hora de inicio y fin,
materia, profesor, tipo). Cada bloque ya agregado muestra un botón
**"Quitar"** directamente sobre la celda de la tabla.

### Carrusel de la página de Inicio

Dentro de **Inicio**, en modo edición aparece un panel para subir nuevas
imágenes al carrusel y quitar las existentes. Si el carrusel está vacío,
se muestra una imagen por defecto — el sitio nunca se queda con un espacio
en blanco.

## Respaldo y Restaurar (a detalle)

Estos dos botones **no dependen de estar en modo edición** — están
disponibles apenas inicias sesión como administrador, en cualquier
sección.

### Respaldo

Descarga un archivo `cms-respaldo.zip` con **todo** el contenido editable
del sitio: textos, galería, horarios, carrusel, y las imágenes que hayas
subido. Es una copia de seguridad completa.

**Cuándo usarlo:** antes de hacer cambios grandes, antes de que alguien
haga mantenimiento en el servidor, o simplemente cada cierto tiempo como
buena práctica. Guarda el archivo en un lugar seguro (tu computadora,
Drive, etc.) — no vive en ningún otro lado más que en tu descarga.

### Restaurar

Haz clic en el botón "Restaurar" en la barra de herramientas, selecciona en tu computadora un archivo de respaldo (`.zip`) previamente descargado y el sistema reemplazará todo el contenido actual del sitio por el del respaldo.

> ⚠️ **Es una operación destructiva.** No combina el contenido actual con
> el del respaldo — lo sustituye por completo. El sitio te pedirá
> confirmación explícita antes de continuar porque no se puede deshacer
> una vez hecho.

**Cuándo usarlo:** si algo salió mal después de una edición y quieres
volver a un estado anterior, o si necesitas recuperar el sitio después de
un problema en el servidor.

**Antes de restaurar, considera hacer primero un Respaldo del estado
actual** — así, si te equivocaste de archivo, puedes volver atrás.

## Salir

El botón **"Salir"** cierra tu sesión de administrador en este navegador.
Si tienes cambios de texto sin guardar, te lo advierte antes de continuar
— salir sin guardar los descarta. La barra de edición y el modo
administrador desaparecen; el sitio vuelve a verse como lo ve cualquier
visitante.

## Preguntas frecuentes

**¿Otras personas ven mis cambios mientras edito?**
No hasta que hagas clic en "Guardar". Mientras editas, solo tú ves los
cambios en tu navegador.

**Edité algo pero no aparece en el sitio.**
Verifica que hayas hecho clic en "Guardar" y que haya aparecido el mensaje
"Cambios guardados ✅". Si el mensaje dice "Error", el cambio no se aplicó
— vuelve a intentarlo, y si persiste, contacta a quien administra el
servidor.

**No aparece el botón de inicio de sesión al hacer clic en el punto.**
Recarga la página e inténtalo de nuevo. Si sigue sin aparecer, puede ser
un problema del servidor — ver [`docs/runbooks/06-diagnostico-general.md`](runbooks/06-diagnostico-general.md).
