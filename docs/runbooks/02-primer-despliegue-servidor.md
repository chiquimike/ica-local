# Runbook: primer despliegue en el servidor (HP ProLiant / K3s)

Guía única y ordenada para llevar el proyecto del estado actual (validado
en Minikube) al servidor físico, la primera vez. Verificado contra el
código real antes de escribir esto — no es teoría.

## Paso 0 — Conectarse al servidor y clonar el repositorio

Para llegar a una terminal del servidor físico, ver
[`01-acceso-ssh-servidor.md`](01-acceso-ssh-servidor.md).

Ya en la terminal del servidor:

```bash
git clone https://github.com/chiquimike/ica-local.git
cd ica-local
```

```bash
kubectl config current-context     # confirma que apunta al K3s real, no a Minikube
kubectl get nodes                  # debe verse el nodo del ProLiant, Ready
```

## Paso 1 — Google OAuth: agregar el origen del servidor

**Esto no se puede verificar desde el código, hazlo tú en Google Cloud Console:**
`APIs & Services → Credentials → tu OAuth Client → Authorized JavaScript origins`
→ agrega:
```
http://192.168.0.254:30080
```
Sin esto, el login con Google **falla silenciosamente** en el servidor aunque
todo lo demás esté bien. `ALLOWED_ORIGINS` (CORS, en el backend) y
`CORREOS_ADMIN` **ya están configurados correctamente en el repo** — no hay
que tocarlos.

## Paso 2 — Copiar las imágenes del portal al host

El frontend las sirve por `hostPath` (`/data/imagenes`), directo del disco
del nodo — no hay que montar nada como en Minikube, es el filesystem real:

```bash
sudo mkdir -p /data/imagenes
sudo cp -r imagenes/* /data/imagenes/
```

## Paso 3 — Firewall

```bash
sudo ufw allow 30080/tcp   # frontend
sudo ufw allow 30090/tcp   # backend
```

## Paso 4 — Generar el Secret real de MySQL (bloqueante)

**El archivo `overlays/server/mysql-secret-sealed.yaml` en el repo hoy es
un template — no es un secreto real.** Si aplicas el overlay tal cual, el
`initContainer` que agregamos anoche se va a quedar esperando a MySQL para
siempre (`Init:0/1`), porque el controlador no puede descifrar un
placeholder.

Sigue **[`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md)**
completo (instalar el controlador, generar el cifrado real con `kubeseal`,
commitear el resultado). Resumen de los comandos, una vez que tengas
`kubeseal` instalado:

```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.38.4/controller.yaml
kubectl -n kube-system get pods -l name=sealed-secrets-controller   # espera a que este Running

kubectl create secret generic mysql-secret --namespace default \
  --from-literal=mysql-root-password='<CONTRASEÑA-NUEVA-Y-FUERTE>' \
  --dry-run=client -o yaml | kubeseal --format yaml > overlays/server/mysql-secret-sealed.yaml

# Verifica que YA NO diga el placeholder:
grep encryptedData -A1 overlays/server/mysql-secret-sealed.yaml
```

**No reutilices `1ca_01`** — está comprometida (quedó expuesta en el
historial de git antes de este endurecimiento).

## Paso 5 — Desplegar

```bash
kubectl apply -k overlays/server
kubectl get pods -w
```

Qué esperar, en orden:
1. `mysql-0` → `Running` (StatefulSet, tarda un poco en inicializar).
2. `api-backend-...` → primero `Init:0/1` (el `initContainer` esperando a
   MySQL, hasta 120s), luego `Running`.
3. `frontend-app-...` → `Running` casi de inmediato.

## Paso 6 — Verificar de punta a punta

```bash
kubectl get pvc                 # AGE en minutos, no reutilizando nada viejo
kubectl logs deploy/api-backend -c esperar-mysql   # log del initContainer (nota el -c)
kubectl logs deploy/api-backend --tail=20           # sin [ERROR]

curl http://192.168.0.254:30090/contenido           # {} o datos, no error de conexion
```

Abre `http://192.168.0.254:30080` en un navegador, prueba el login de
administrador (con la cuenta de `CORREOS_ADMIN`), y registra un alumno de
prueba para confirmar que se guarda en la base de datos.

## Troubleshooting (aprendido anoche en Minikube, aplica igual aquí)

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Pod backend atorado en `Init:0/1` | El `initContainer` no logra conectar a MySQL — casi siempre contraseña del Secret desincronizada con la que MySQL tiene inicializada | `kubectl logs deploy/api-backend -c esperar-mysql`; ver `runbook-servidor-mysql-secret.md` sección "Si ya hay datos" |
| `kubectl logs deploy/api-backend` muestra `[ERROR] 1045 Access denied` pero parece viejo | Puede ser el pod anterior muriendo durante un rollout, no el actual | `kubectl get pods` primero, y agrega `--tail=20` a los logs del pod específico más nuevo |
| El sitio carga pero las secciones se ven vacías, sin error visible | Degradación elegante: los endpoints públicos devuelven `200` con `{}`/`[]` si la BD falla | El error real solo está en `kubectl logs deploy/api-backend`, no en el navegador |
| Login de Google falla | Falta el origen del servidor en Google Cloud Console | Ver Paso 1 |
| SealedSecret no descifra / Secret `mysql-secret` nunca aparece | El archivo sigue siendo el template, o el controlador no está `Running` | `kubectl -n kube-system get pods`; revisar Paso 4 |

## Después de que todo funcione

- [ ] Confirmar con `kubectl get pvc` que los volúmenes (`mysql-data`,
      `backend-pdf-pvc`, `cms-uploads-pvc`) están sanos.
- [ ] Commitear el `mysql-secret-sealed.yaml` real (es seguro, está cifrado).
- [ ] (Opcional, decidido para después) Fase 2 de Argo CD en el servidor —
      ver `argocd/README.md`.
