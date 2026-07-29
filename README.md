# ICA — Sistema de Gestión del Servicio Social

Portal del **Innovation Center Aragón (ICA)**, FES Aragón — UNAM, para
gestionar el registro de prestadores de servicio social y administrar el
contenido del sitio público del ICA. Desplegado como un stack de
microservicios sobre Kubernetes (K3s), gestionado 100% de forma declarativa
con Kustomize y GitOps (Argo CD).

> ⚠️ **Estado actual:** validado en un entorno local (Minikube). La migración
> al servidor físico del ICA está en curso — ver [Roadmap](#roadmap-y-estado-real) más abajo.

## Qué problema resuelve

- **Alumnos:** se registran con Google (cuenta institucional), suben su
  historial académico en PDF y quedan dados de alta para su servicio social.
- **Coordinación / profesor (admin):** administra los registros (ver, editar,
  eliminar, exportar a Excel/ZIP), y además puede **editar el sitio público
  del ICA sin tocar código** — textos, imágenes, galería de proyectos,
  horarios de los salones y el carrusel de la página principal — desde un
  modo de edición integrado en el propio sitio.

## Arquitectura

Kustomize en **tres capas** (datos / lógica / presentación) más **overlays**
por entorno, para que el mismo repositorio despliegue tanto en una laptop con
Minikube como en el servidor físico sin tocar código, solo cambiando de overlay:

```
base/               → configuración común: las 3 capas juntas
├── capa-datos/      → MySQL 5.7 (StatefulSet + Service ClusterIP)
├── capa-logica/     → API FastAPI (Deployment + Service NodePort :30090)
└── capa-presentacion/ → Frontend Nginx (Deployment + Service NodePort :30080)

overlays/
├── local/           → Minikube (config.js + Secret de MySQL de desarrollo)
└── server/          → K3s del servidor (config.js + Secret de MySQL cifrado)

argocd/              → AppProject + Application de Argo CD (GitOps)
docs/                → Runbooks operativos
```

La única diferencia real entre entornos —la URL del backend y la contraseña
de la base de datos— vive en un archivo por overlay. Todo lo demás es
idéntico entre local y servidor.

## Stack

| Componente | Elección | Por qué (evidente en el código) |
|---|---|---|
| Orquestador | K3s (servidor) / Minikube (local) | Distribución ligera de Kubernetes, adecuada para hardware limitado |
| Base de datos | MySQL 5.7 | `requests`/`limits` de memoria muy bajos (256Mi/512Mi) |
| Backend | FastAPI (Python 3.9-alpine) | Código inyectado vía `ConfigMap` + `subPath`, sin build de imagen propia |
| Frontend | Nginx (alpine) | Igual: contenido estático inyectado vía `ConfigMap` |
| Autenticación | Google OAuth 2.0 + JWT | Restringido a `@aragon.unam.mx` + lista blanca de administradores |
| GitOps | Argo CD (variante *Core*) | Sin servidor de API ni UI — huella de memoria mínima |
| Config declarativa | Kustomize | `base` + `overlays`, sin Helm |

## Cómo desplegarlo

### Local (Minikube)

```bash
minikube start
minikube mount ./imagenes:/data/imagenes   # las imágenes se sirven via hostPath
kubectl apply -k .                          # equivale a overlays/local
kubectl get pods -w
```
Accede en `http://192.168.49.2.nip.io:30080` (o el resultado de `minikube ip`).

### Servidor (K3s, HP ProLiant)

Antes de la primera vez, sigue **[`docs/runbook-servidor-mysql-secret.md`](docs/runbook-servidor-mysql-secret.md)**
para generar el Secret cifrado de MySQL (el repo es público; ver sección de
[Seguridad](#seguridad) más abajo). Después:

```bash
kubectl apply -k overlays/server
```

Para el flujo GitOps completo (Argo CD reconciliando automáticamente en vez
de aplicar a mano), ver [`argocd/README.md`](argocd/README.md).

## Restricciones reales de hardware

El servidor de producción es un equipo rescatado, no hardware nuevo dedicado:

| Componente | Detalle |
|---|---|
| Modelo | HP ProLiant ML370 G4 |
| Procesador | Intel Xeon (x86_64) |
| Memoria RAM | **2 GB DDR2** |
| Red | Ethernet Gigabit |

Esta limitación de RAM es la razón detrás de varias decisiones visibles en
los manifiestos: MySQL 5.7 en vez de 8.0, Argo CD en su variante *Core* (sin
UI ni servidor de API), y `requests`/`limits` de memoria deliberadamente
bajos en cada `Deployment` (el backend pide apenas 64Mi, por ejemplo).

## Seguridad

- Autenticación vía Google OAuth 2.0, restringida a cuentas @aragon.unam.mx
  (o lista blanca de administradores). El backend verifica criptográficamente
  la firma del JWT contra las llaves públicas de Google en cada request
  protegido (librería google-auth, id_token.verify_oauth2_token) — no confía
  en el frontend ni decodifica el token sin validar.
- Autorización de dos niveles: cuentas `@aragon.unam.mx` para uso general,
  lista blanca de administradores para editar el CMS.
- MySQL como `Service` tipo `ClusterIP` (no accesible desde fuera del cluster).
- Sanitización de rutas de archivo (anti path-traversal) para PDFs e imágenes.
- Ningún secreto de Kubernetes vive en texto plano en Git: el Secret de MySQL
  se provee por overlay (relleno no-sensible en local, [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
  cifrado en el servidor).
- **Pendiente:** TLS/HTTPS vía Ingress (todo el tráfico hoy es HTTP plano
  dentro de la red local). Ver issue [#6](https://github.com/chiquimike/ica-local/issues/6).

## Roadmap y estado real

- [ ] Migración al servidor físico (Argo CD hoy reconcilia el overlay local).
- [ ] TLS/HTTPS vía Ingress Controller.
- [ ] Completar la sección "Servicios" y horarios de atención del ICA en la
      landing (issue [#8](https://github.com/chiquimike/ica-local/issues/8)).

## Documentación adicional

- [`argocd/README.md`](argocd/README.md) — instalación y operación de Argo CD.
- [`docs/runbook-servidor-mysql-secret.md`](docs/runbook-servidor-mysql-secret.md) — generar el Secret cifrado del servidor.
- ADRs y runbook general de diagnóstico — en construcción.

## Historial de versiones

- `v0.1.0-alpha` — estado inicial del proyecto, antes del rediseño en capas de Kustomize.
- `v0.2.0-pre-argocd` — capas + overlays + endurecimiento de seguridad, justo antes de introducir Argo CD.

(Ver [Releases](https://github.com/chiquimike/ica-local/releases) para las notas completas.)
