# Runbook: Diagnóstico General

Guía de **triage** para cuando algo no funciona y no sabes por dónde
empezar. No repite procedimientos completos que ya existen en otros
runbooks — los referencia. Basado en incidentes reales de este proyecto,
no en casos hipotéticos.

## Cómo usar este documento

1. Corre el **triage rápido** (abajo) — casi siempre te dice en qué capa
   está el problema en menos de un minuto.
2. Salta a la sección de esa capa.
3. Si el runbook específico de esa capa ya existe (02–05), este documento
   te manda ahí en vez de repetirlo.

---

## Triage rápido (primeros 60 segundos)

```bash
kubectl get nodes                 # el nodo, sano?
kubectl get pods                  # los pods de la app, en que estado?
kubectl get pvc                   # los volumenes, Bound y con la edad correcta?
kubectl logs deploy/api-backend --tail=30   # el error real casi siempre esta aqui
```

| Lo que ves | Ve a la sección |
|---|---|
| Nodo `NotReady` | [Nivel Nodo](#nivel-nodo--clúster) |
| Pod en `Init:0/1` que no avanza | [Nivel Pod → Init atorado](#init01-atorado) |
| Pod en `CrashLoopBackOff` o `Pending` | [Nivel Pod](#nivel-pod) |
| Pods `Running` pero el sitio se ve vacío o con errores | [Nivel Aplicación](#nivel-aplicación--http) |
| `[ERROR]` en los logs mencionando MySQL | [Nivel Datos](#nivel-datos) |
| No puedes iniciar sesión con Google | [Nivel Aplicación → Auth](#autenticación) |
| `kubectl apply -k` o `kustomize build` falla | [Nivel Despliegue](#nivel-despliegue--gitops) |

**Regla de oro:** cuando el pod `api-backend` está `Running` pero algo se
comporta raro, **el navegador nunca tiene el error real** — el backend
devuelve mensajes genéricos a propósito (para no filtrar detalles internos
a un cliente). El error real está siempre en `kubectl logs`.

---

## Nivel Nodo / Clúster

### Nodo en `NotReady`

**Causa más común: el reloj del sistema se desfasó.** Kubernetes valida
certificados TLS internos por tiempo; si el reloj está mal, el nodo deja
de poder comunicarse consigo mismo aunque el hardware esté sano.

```bash
timedatectl status                          # busca "synchronized: yes"
sudo systemctl restart systemd-timesyncd    # si no lo esta
sudo systemctl status k3s                   # el servicio sigue vivo?
sudo journalctl -u k3s --since "10 min ago" --no-pager | tail -50
```

Procedimiento completo (parches, disco, firewall): ver
[`05-mantenimiento-cold-start.md`](05-mantenimiento-cold-start.md), Fases 1–2.
Especialmente relevante si el servidor estuvo apagado un tiempo.

---

## Nivel Pod

```bash
kubectl get pods -o wide
kubectl describe pod <nombre-del-pod>       # eventos al final: la razon real
```

### `Init:0/1` atorado

El backend tiene un `initContainer` que espera a que MySQL responda antes
de arrancar (hasta 120s). Si se queda atorado más de eso:

```bash
kubectl logs deploy/api-backend -c esperar-mysql
```
> Nota el `-c esperar-mysql` — sin especificar el contenedor, `kubectl logs`
> por defecto muestra el contenedor principal, no el initContainer, y vas
> a ver una lista vacía o un error confuso.

Causa casi siempre: la contraseña del Secret no coincide con la que MySQL
tiene realmente inicializada. Ver
[`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md), sección
"Si ya hay datos".

### `CrashLoopBackOff`

```bash
kubectl logs <pod> --previous     # el log del intento anterior, antes de que muriera
```
Para `mysql-0`: casi siempre disco lleno o el PVC dañado. Para
`api-backend`: revisa que `requirements.txt` no tenga un typo (se instala
en cada arranque, no está "baked" en la imagen — un error aquí rompe el
pod cada vez).

### `Pending`

```bash
kubectl describe pod <pod> | grep -A5 Events
```
Casi siempre: no hay recursos (RAM/CPU) disponibles en el nodo — relevante
en un servidor de 2GB — o un PVC que no puede satisfacerse.

### `kubectl logs deploy/X` muestra algo que no cuadra con lo que acabas de arreglar

Durante un `kubectl rollout restart`, hay dos pods (viejo y nuevo)
conviviendo un momento. `kubectl logs deploy/X` puede mostrarte el pod
**viejo**, que se está apagando — vas a ver el error que ya arreglaste,
como si nada hubiera cambiado.

```bash
kubectl get pods                       # ve el nombre exacto del pod mas nuevo (AGE)
kubectl logs <nombre-del-pod-nuevo> --tail=30
```

---

## Nivel Datos

### `(1045, "Access denied for user 'root'@'...'")`

La contraseña que el backend envía no coincide con la que MySQL tiene
inicializada. **No es un problema del backend** — es que en algún momento
se cambió el Secret sin que MySQL se enterara (los `env` de un pod ya
corriendo no se actualizan solos cuando cambia el Secret referenciado).

```bash
kubectl exec deploy/api-backend -- printenv DB_PASS
kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d
```
Si son iguales entre sí pero el error persiste, el problema está en lo que
MySQL tiene *realmente* guardado — ver
[`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md).

### `(1146, "Table '...' doesn't exist")`

La migración automática de arranque (`_migracion_startup` en
`codigo-backend.yaml`) no alcanzó a correr — reintenta 10 veces cada 3s
(30s de margen) y luego se rinde. En hardware lento eso puede no alcanzar.

```bash
kubectl rollout restart deployment/api-backend
kubectl logs deploy/api-backend -f
```
Si esto se repite seguido, el `initContainer` (ver arriba, `Init:0/1`) ya
debería estar evitándolo — si sigue pasando con el initContainer presente,
es un síntoma nuevo que vale la pena investigar más a fondo, no solo
reiniciar.

### Un PVC se ve "nuevo" cuando no debería

```bash
kubectl get pvc
```
Si el `AGE` de `mysql-data-mysql-0` es de segundos/minutos y esperabas
semanas: **los datos se perdieron**, se recreó un volumen vacío. Causa
típica: se borró el PVC sin bajar antes el pod que lo usaba (el
`pvc-protection` finalizer no protege si el StatefulSet recrea el pod y
vuelve a montar el mismo volumen — pero un `kubectl delete pvc` mal
secuenciado sí puede llevar a una recreación no intencional). Ver el
procedimiento correcto en
[`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md).

---

## Nivel Aplicación / HTTP

### El sitio carga pero las secciones se ven vacías, sin error visible

Esto **no necesariamente está roto**. Los endpoints públicos del CMS
(`/contenido`, `/galeria`, `/horarios`, `/carrusel`) están diseñados para
devolver `200` con `{}` o `[]` cuando la base de datos falla — es
degradación elegante a propósito, no un bug.

**Cómo distinguir "vacío porque no hay datos" de "vacío porque algo está
roto":**
```bash
kubectl logs deploy/api-backend --tail=30 | grep ERROR
```
Si hay líneas `[ERROR]`, está roto (ver Nivel Datos arriba). Si no hay
ninguna, simplemente no hay contenido cargado todavía (normal en una
instalación nueva).

### Autenticación

**Login con Google no funciona:**
- Falta agregar el origen (`http://192.168.0.254:30080` en el servidor) en
  Google Cloud Console → Credentials → Authorized JavaScript origins. Ver
  [`02-primer-despliegue-servidor.md`](02-primer-despliegue-servidor.md), Paso 1.

**"Cuenta no autorizada" al iniciar sesión:**
- El correo no es `@aragon.unam.mx` ni está en `CORREOS_ADMIN`
  (`capa-logica/deploy-backend.yaml`). El mensaje de error del backend
  incluye el correo rechazado — revisa que sea el que esperabas.

**Errores de CORS en la consola del navegador** (`blocked by CORS policy`):
- El origen desde el que accedes no está en `ALLOWED_ORIGINS`
  (`capa-logica/codigo-backend.yaml`). Si accedes desde una URL distinta a
  `192.168.0.254:30080` / `192.168.49.2.nip.io:30080`, hay que agregarla ahí.

---

## Nivel Despliegue / GitOps

### `kustomize build` o `kubectl apply -k` falla

```bash
kubectl kustomize overlays/server    # muestra el error exacto de Kustomize
```
Causa frecuente y ya vivida en este proyecto: el contenido de un
`kustomization.yaml` terminó en la carpeta equivocada al copiar archivos a
mano (por ejemplo, el contenido de `capa-logica/kustomization.yaml`
pegado en `base/kustomization.yaml`). **Antes de hacer commit de cualquier
cambio a un `kustomization.yaml`, verifica localmente:**
```bash
kubectl kustomize overlays/local >/dev/null && echo "OK local"
kubectl kustomize overlays/server >/dev/null && echo "OK server"
```

### Argo CD muestra `OutOfSync` o `Unknown` de forma persistente

- `Unknown` con `InvalidSpecError` → revisa que exista el `AppProject`
  referenciado (`kubectl apply -f argocd/project-default.yaml`).
- `OutOfSync` que no se resuelve solo → puede haber dos `Application`
  distintas apuntando al mismo path (compitiendo entre sí). Ver
  `argocd/README.md`.
- Cambios que tardan en reflejarse (~3 min) → Argo Core sondea el repo
  periódicamente, no tiene webhook. Es esperado, no un fallo.

---

## Comandos de referencia rápida

```bash
# Estado general
kubectl get pods -o wide
kubectl get nodes
kubectl get pvc
kubectl top pods                              # consumo de RAM/CPU (relevante en 2GB)

# Logs
kubectl logs deploy/api-backend --tail=30
kubectl logs deploy/api-backend -c esperar-mysql   # el initContainer, no el principal
kubectl logs <pod> --previous                 # el intento anterior a un crash

# Credenciales en uso ahora mismo
kubectl exec deploy/api-backend -- printenv DB_PASS
kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d

# Verificar antes de desplegar
kubectl kustomize overlays/server >/dev/null && echo OK

# Reiniciar el backend (recarga codigo + reintenta migracion)
kubectl rollout restart deployment/api-backend
```

## Cuándo reiniciar y cuándo investigar

**Reiniciar está bien** (`kubectl rollout restart deployment/api-backend`)
cuando: acabas de corregir un Secret, un `ConfigMap`, o sospechas una
condición de carrera pasajera.

**Investigar antes de reiniciar** cuando: un PVC tiene una edad que no
cuadra (posible pérdida de datos — reiniciar no lo arregla y puede ocultar
la evidencia), o el mismo error vuelve a aparecer después de un reinicio
(un reinicio que "arregla" algo temporalmente pero el problema regresa es
una señal de causa raíz sin resolver, no de que ya esté bien).