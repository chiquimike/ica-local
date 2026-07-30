# Runbook: generar y aplicar el Secret de MySQL en el servidor

**Cuándo usar esto:** la primera vez que despliegues en el servidor físico
(HP ProLiant, K3s), o si en el futuro necesitas rotar la contraseña de MySQL
del servidor. Es el paso que faltaba para cerrar el issue #6 (Sealed Secrets).

**Por qué existe este paso:** el repositorio es público. Ningún Secret de
Kubernetes puede contener la contraseña real en texto plano dentro de Git.
`overlays/server/mysql-secret-sealed.yaml` hoy tiene un **template**, no un
secreto real — este runbook genera el valor real y lo deja listo para commitear.

---

## 0. Antes de empezar

- [ ] Tienes `kubectl` apuntando al K3s del servidor (no a Minikube). Verifica:
      ```bash
      kubectl config current-context
      kubectl get nodes
      ```
- [ ] Es la **primera vez** que MySQL corre en este servidor (PVC vacío). Si no
      estás seguro, revisa: `kubectl get pvc` — si `mysql-data-mysql-0` ya
      existe con datos reales, lee la sección **"Si ya hay datos"** al final
      antes de continuar; el procedimiento normal de abajo solo inicializa
      la contraseña correctamente en un MySQL que arranca desde cero.
- [ ] Ya decidiste la contraseña nueva. **No reutilices `1ca_01`** — quedó
      expuesta en el historial de Git y se considera comprometida.

## 1. Instalar el controlador de Sealed Secrets (una sola vez en este cluster)

```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.38.4/controller.yaml
```

Verifica que quede corriendo antes de seguir:
```bash
kubectl -n kube-system get pods -l name=sealed-secrets-controller
# debe decir Running / 1/1
```

## 2. Instalar el CLI `kubeseal` en el servidor

```bash
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.38.4/kubeseal-0.38.4-linux-amd64.tar.gz
tar -xzf kubeseal-0.38.4-linux-amd64.tar.gz kubeseal
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
kubeseal --version   # confirma que se instaló
```

## 3. Generar el Secret cifrado

```bash
kubectl create secret generic mysql-secret \
  --namespace default \
  --from-literal=mysql-root-password='<TU-CONTRASEÑA-NUEVA-Y-FUERTE>' \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > overlays/server/mysql-secret-sealed.yaml
```

Verifica el resultado **antes de seguir**:
```bash
cat overlays/server/mysql-secret-sealed.yaml
```
Debe decir `kind: SealedSecret` y, bajo `encryptedData:`, un valor largo en
base64 — **no** el texto `REEMPLAZA_ESTO_CON_LA_SALIDA_REAL_DE_KUBESEAL_PASO_3`.
Si sigue diciendo eso, el comando de arriba falló silenciosamente (revisa que
`kubeseal` esté en el PATH y que el `kubectl create secret --dry-run` haya
funcionado).

## 4. Confirmar que el overlay construye bien con el archivo real

```bash
kubectl kustomize overlays/server | grep -A3 "kind: SealedSecret"
```

## 5. Aplicar y verificar de punta a punta

```bash
kubectl apply -k overlays/server
kubectl get pods -w
```
Cuando todo esté `Running`, verifica que el controlador realmente descifró el
secreto (debe existir un Secret normal, generado automáticamente por el
controlador a partir del SealedSecret):
```bash
kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d
# debe imprimir tu contraseña nueva (no el placeholder, no "1ca_01")
```
Y que el backend conecta:
```bash
curl http://192.168.0.254:30090/contenido
# debe responder {} o datos, NO un error de conexión a la base de datos
```

## 6. Commitear el resultado

Solo el archivo `overlays/server/mysql-secret-sealed.yaml` con el cifrado real.
**Es seguro subirlo a un repo público** — solo el controlador de este cluster
específico puede descifrarlo.

```bash
git add overlays/server/mysql-secret-sealed.yaml
git commit -m "fix(overlays/server): generar el SealedSecret real de MySQL"
git push origin <tu-rama>
```

---

## Si ya hay datos (MySQL no arranca desde cero)

MySQL solo lee `MYSQL_ROOT_PASSWORD` **la primera vez** que inicializa un
volumen de datos vacío. Si el PVC `mysql-data-mysql-0` ya tiene datos de un
intento anterior, cambiar el Secret **no** cambia la contraseña real dentro
de la base de datos ya corriendo — el backend fallará al conectar aunque el
Secret esté "bien". Dos opciones:

- **Datos descartables (borrar el volumen y empezar de cero).**
  El orden importa: hay que **bajar el pod antes** de borrar el PVC. Un
  `kubectl delete pvc` sobre un volumen en uso no lo borra — Kubernetes lo
  deja en `Terminating` por su finalizer `pvc-protection`, y si el
  StatefulSet recrea el pod, vuelve a montar el mismo volumen con los datos
  (y la contraseña) viejos. Secuencia correcta:
  ```bash
  kubectl scale statefulset mysql --replicas=0
  kubectl wait --for=delete pod/mysql-0 --timeout=90s
  kubectl delete pvc mysql-data-mysql-0     # ahora si se borra: nadie lo usa
  kubectl scale statefulset mysql --replicas=1
  kubectl rollout restart deployment/api-backend
  ```
  Verifica que quedó limpio: `kubectl get pvc` debe mostrar el PVC con un
  `AGE` de segundos, no de días.

- **Datos reales que no queremos perder:** cambia la contraseña dentro de
  MySQL para que coincida con la del Secret nuevo (no borra nada):
  ```bash
  kubectl exec -it mysql-0 -- mysql -u root -p'<PASSWORD-VIEJA>' \
    -e "ALTER USER 'root'@'%' IDENTIFIED BY '<PASSWORD-NUEVA>'; FLUSH PRIVILEGES;"
  kubectl rollout restart deployment/api-backend
  ```

### Cómo se ve este fallo desde afuera

Síntoma en el navegador: la página carga y las secciones públicas se ven
**vacías** (no roto), y cualquier operación con la base de datos devuelve
"Ocurrió un error procesando la solicitud".

Eso es la degradación elegante funcionando: los endpoints públicos
(`/contenido`, `/galeria`, `/horarios`, `/carrusel`) responden `200` con
`{}` o `[]` cuando la BD falla. **El error real solo está en los logs:**
```bash
kubectl logs deploy/api-backend --tail=40
```
- `(1045, "Access denied for user 'root'...")` → contraseña desincronizada
  entre el Secret y lo que MySQL tiene realmente inicializado (esta sección).
- `(1146, "Table ... doesn't exist")` → la migración de arranque no alcanzó
  a correr; basta `kubectl rollout restart deployment/api-backend`.

## Troubleshooting rápido

| Síntoma | Causa probable |
|---|---|
| `kubeseal: command not found` | Paso 2 no se completó o no está en el PATH |
| `encryptedData` sigue con el texto `REEMPLAZA_ESTO...` | El pipe del paso 3 falló antes de llegar a `kubeseal` |
| El pod `mysql-0` en `CrashLoopBackOff` | El SealedSecret no se descifró (revisa logs del controlador: `kubectl -n kube-system logs -l name=sealed-secrets-controller`) |
| El backend responde error de conexión a BD | Contraseña del Secret no coincide con la que MySQL tiene realmente inicializada — ver sección "Si ya hay datos" arriba |
