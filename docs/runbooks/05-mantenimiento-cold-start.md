# Runbook: encendido tras inactividad prolongada (Cold Start)

**Cuándo usar esto:**
- El servidor físico estuvo apagado más de 2 semanas.
- Como mantenimiento preventivo mensual, antes de un despliegue mayor.

**Por qué existe:** un servidor apagado no recibe parches, su reloj se
desfasa, y nadie verificó en ese tiempo que los datos sigan sanos. Encender
y desplegar de inmediato es cómo se convierte una actualización rutinaria
en un incidente.

> **Nota para el primer despliegue:** si el servidor todavía no tiene la
> aplicación del ICA instalada, aplica solo hasta la **Fase 2**; las fases
> de datos y respaldo no tienen nada que verificar aún. Continúa con
> [`02-primer-despliegue-servidor.md`](02-primer-despliegue-servidor.md).

---

## Fase 1 — Sistema operativo (host)

### 1.1 Sincronización de tiempo (hacerlo primero)

Si el reloj del BIOS se atrasó, los certificados TLS de K3s se consideran
inválidos y el nodo queda `NotReady`. **Esto se arregla antes que nada**,
porque muchos otros síntomas son consecuencia de esto.

```bash
timedatectl status
# Busca: "System clock synchronized: yes" y "NTP service: active"

# Si no está sincronizado:
sudo systemctl restart systemd-timesyncd
sleep 10 && timedatectl status
```

> Los certificados de K3s duran ~1 año y se rotan solos al reiniciar el
> servicio si están por expirar; mes y medio no los caduca. Pero un reloj
> **desfasado** los hace parecer inválidos aunque estén bien — de ahí que
> este paso vaya primero.

### 1.2 Parches del sistema

```bash
sudo apt update
sudo apt upgrade -y
cat /var/run/reboot-required 2>/dev/null && echo ">>> REINICIO REQUERIDO"
```

Si pide reinicio (típico tras actualizar el kernel), **reinicia ahora**, no
después de desplegar:
```bash
sudo reboot
# reconectar por SSH y verificar: kubectl get nodes
```

### 1.3 Espacio en disco

```bash
df -h /                        # raíz
df -h /var/lib/rancher         # K3s: imágenes de contenedores Y volúmenes (PVCs)
df -h /data                    # imágenes del portal (hostPath)
```

`/var/lib/rancher` es el más importante: ahí viven tanto las imágenes de
contenedores como los `PersistentVolume` que crea el *local-path
provisioner* de K3s (la base de datos, los PDFs, las imágenes del CMS).
Si ese sistema de archivos se llena, MySQL deja de poder escribir.

### 1.4 Firewall

```bash
sudo ufw status numbered
```
Solo deberían aparecer: **22** (SSH), **30080** (frontend) y **30090**
(backend). Si hay puertos extra que nadie recuerda haber abierto,
investígalo antes de continuar.

---

## Fase 2 — Salud del clúster K3s

```bash
kubectl get nodes
# Debe decir Ready. Si dice NotReady:
#   1. Verifica el reloj (Fase 1.1) — es la causa más común tras un apagón largo
#   2. sudo systemctl status k3s
#   3. sudo journalctl -u k3s --since "10 min ago" --no-pager | tail -50
#   4. Si hace falta: sudo systemctl restart k3s

kubectl get pods -A
# Todo Running o Completed. Un CrashLoopBackOff en kube-system merece
# investigarse antes de desplegar nada encima.
```

Los componentes esperados en `kube-system` dependen de cómo se instaló K3s
(trae CoreDNS, Traefik, metrics-server y local-path-provisioner por
defecto) más el controlador de **Sealed Secrets**, que instalamos nosotros.

> **Nota de recursos:** en 2 GB de RAM, Traefik y metrics-server consumen
> memoria que este proyecto no usa (se expone por NodePort, no por Ingress).
> Si algún día la RAM aprieta, deshabilitarlos es una optimización válida
> — pero es un cambio deliberado, no algo que hacer durante un cold start.

---

## Fase 3 — Integridad de los datos

**Lo más importante de un cold start.** Antes de tocar nada, confirma que
lo que había sigue ahí.

```bash
kubectl get pvc
# Los tres deben estar Bound, y el AGE debe ser de semanas/meses
# (si alguno dice segundos, se recreó vacío: los datos se perdieron):
#   mysql-data-mysql-0   (base de datos)
#   backend-pdf-pvc      (historiales académicos en PDF)
#   cms-uploads-pvc      (imágenes subidas desde el CMS)

kubectl get pods
# mysql-0, api-backend-* y frontend-app-* en Running
```

Verifica que la base de datos realmente tenga los registros:

```bash
kubectl exec -it mysql-0 -- mysql -u root -p"$(kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d)" \
  -e "USE gestion_usuarios; SELECT COUNT(*) AS alumnos FROM usuarios;"
```

Si el conteo no cuadra con lo que esperabas, **detente aquí** y no
despliegues nada encima hasta entender por qué.

---

## Fase 4 — Respaldo antes de cambiar nada

Si vas a actualizar o desplegar, saca primero un respaldo. Es barato y es
la diferencia entre un susto y una pérdida.

**Contenido del CMS** (textos, galería, horarios, carrusel + imágenes) —
desde el sitio, con sesión de administrador: botón **Respaldo** en la barra
del CMS, que descarga `cms-respaldo.zip`. Ver
[`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md) si necesitas
recordar cómo entra un administrador.

**Base de datos completa:**
```bash
kubectl exec mysql-0 -- mysqldump -u root -p"$(kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d)" \
  gestion_usuarios > ~/respaldo-ica-$(date +%F).sql
ls -lh ~/respaldo-ica-*.sql   # verifica que NO pese 0 bytes
```

**Historiales PDF** (no están en la base de datos, viven en un volumen):
desde el panel del profesor, botón **Descargar PDFs** (genera un ZIP).

---

## Fase 5 — Limpieza de imágenes (opcional)

```bash
sudo k3s crictl images          # ver qué hay antes de borrar
sudo k3s crictl rmi --prune     # borra solo las imágenes que ningún pod usa
```

> ⚠️ **Dos advertencias reales:**
> 1. Hazlo **con los pods corriendo**. Si los pods están apagados, `--prune`
>    considerará "sin usar" a `mysql:5.7`, `python:3.9-alpine` y
>    `nginx:alpine`, y las borrará — obligando a re-descargarlas.
> 2. Ese re-descargue necesita **conexión a internet**. Si el servidor está
>    aislado en la intranet, podrías dejar el clúster sin poder arrancar los
>    pods. Sáltate esta fase si el disco no está apretado.

---

## Fase 6 — Revisión de seguridad

```bash
# Intentos fallidos de login SSH
sudo grep "Failed password" /var/log/auth.log | tail -20
# Sesiones exitosas recientes: ¿reconoces todos los accesos?
last -n 15
```

**Rotación de credenciales** — recomendada si pasó mucho tiempo o cambió
el equipo. Son dos contraseñas independientes:
- Usuario del sistema (`ica-aragon`): `passwd`
- MySQL: ver [`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md)

Usa contraseñas **distintas** para cada una.

---

## Fase 7 — Sincronizar y desplegar

```bash
cd ~/ica-local
git status            # confirma que no hay cambios locales sin commitear
git fetch origin
git log --oneline HEAD..origin/main   # qué cambios entrarán
git pull origin main
```

```bash
kubectl apply -k overlays/server
kubectl get pods -w
```

> Si Argo CD ya está operando en el servidor, **no apliques a mano**: haz
> `git push` y deja que reconcilie. Aplicar manualmente sobre un clúster
> gestionado por Argo genera divergencias que `selfHeal` revertirá.

---

## Fase 8 — Verificación final

```bash
kubectl get pods                       # todos Running
kubectl logs deploy/api-backend --tail=20   # sin [ERROR]
curl -s http://192.168.0.254:30090/contenido   # responde {} o datos
```

Y en un navegador dentro de la red: abre `http://192.168.0.254:30080`,
verifica que carguen las secciones (no vacías), y prueba el login de
administrador.

---

## Checklist rápido

- [ ] Reloj sincronizado (`timedatectl`)
- [ ] Parches aplicados; reinicio hecho si se requería
- [ ] Disco con espacio (`/var/lib/rancher` sobre todo)
- [ ] Firewall solo con 22 / 30080 / 30090
- [ ] Nodo `Ready`, pods de `kube-system` sanos
- [ ] Los 3 PVC `Bound` con antigüedad correcta
- [ ] Conteo de registros en la BD verificado
- [ ] Respaldo tomado (CMS + `mysqldump` + PDFs)
- [ ] Repo sincronizado y desplegado
- [ ] App verificada desde el navegador
