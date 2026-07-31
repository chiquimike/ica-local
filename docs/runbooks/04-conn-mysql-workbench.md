# Conexión a MySQL Workbench (K3s / Minikube)

> Esta guía reemplaza una versión anterior que quedó desactualizada tras dos
> cambios de seguridad: MySQL pasó de `NodePort` a `ClusterIP` (ya no está
> expuesto en la red), y la contraseña se gestiona con Sealed Secrets (ya no
> hay una contraseña fija que se pueda escribir aquí).

## Por qué ya no hay una IP:puerto directa

`mysql-nodeport` es un `Service` tipo **ClusterIP**: solo es accesible desde
dentro del cluster (por el backend). Esto es intencional — MySQL nunca debe
estar expuesto a la red del ICA. Para administrarlo desde tu laptop con
Workbench, se abre un túnel temporal con `kubectl port-forward`.

Esto aplica **igual en Minikube y en el servidor** — la única diferencia es
a qué cluster apunta tu `kubectl` en ese momento (`kubectl config current-context`).

## 1. Abrir el túnel

```bash
kubectl port-forward svc/mysql-nodeport 3306:3306
```

Déjalo corriendo en una terminal aparte mientras uses Workbench.

## 2. Obtener la contraseña actual

**No la escribas de memoria ni la copies de un documento viejo** — pídesela
al cluster directamente, así siempre es la que está realmente en uso:

```bash
kubectl get secret mysql-secret -o jsonpath='{.data.mysql-root-password}' | base64 -d
```

- En **Minikube**, este comando devuelve el valor de desarrollo definido en
  `overlays/local/mysql-secret-dev.yaml` (no es sensible, solo úsalo ahí).
- En el **servidor**, devuelve la contraseña real que generaste con
  `kubeseal` (ver [`03-servidor-mysql-secret.md`](03-servidor-mysql-secret.md)).

## 3. Configurar la conexión en Workbench

| Campo | Valor |
|---|---|
| Connection Method | Standard (TCP/IP) |
| Hostname | `127.0.0.1` |
| Port | `3306` |
| Username | `root` |
| Password | la que obtuviste en el paso 2 |
| Default Schema | `gestion_usuarios` |

## 4. Sobre crear las tablas

**No hace falta.** El backend las crea automáticamente al arrancar (ver
`_migracion_startup` en `capa-logica/codigo-backend.yaml`). Workbench aquí
es solo para **consultar** los datos, no para inicializar el esquema — si
corres un `CREATE TABLE` manual con un esquema viejo, lo único que logras
es quedarte atrás de lo que el backend espera.
