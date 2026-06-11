# GitOps con Argo CD — Fase 1 (Minikube)

Instalación **ligera (Core)** de Argo CD en **Minikube** y una `Application` que
reconcilia el **backend** desde GitHub. Objetivo: validar el flujo GitOps
—`git push` → Argo reconcilia— en local, antes de promover al server.

## Estructura del repo (Kustomize base + overlays)

```
base/            -> configuracion comun (las 3 capas)
overlays/local/  -> Minikube  (config.js -> 192.168.49.2)
overlays/server/ -> K3s server (config.js -> 192.168.0.254)
kustomization.yaml (raiz) -> atajo = overlays/local
```

- Desplegar en local:  `kubectl apply -k .`  (o `kubectl apply -k overlays/local`)
- Desplegar en server: `kubectl apply -k overlays/server`
- La URL del backend vive en UN solo punto: `capa-presentacion/codigo-web/config.js`,
  y cada overlay la sobreescribe. Migrar local↔server = cambiar de overlay.

## 1. Preparar Minikube

```bash
minikube start
# Las imagenes se sirven via hostPath (/data/imagenes). En Minikube hay que montarlas:
minikube mount ./imagenes:/data/imagenes      # dejemoslo corriendo en otra terminal
```

## 2. Desplegar la app (estado inicial)

```bash
kubectl apply -k .            # despliega las 3 capas (el overlay local)
kubectl get pods -w
```

## 3. Instalar Argo CD (variante Core, sin UI ni Dex -> menos RAM)

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/core-install.yaml
kubectl -n argocd get pods -w
```

## 4. Registrar la Application (bootstrap)

1. Edita `argocd/app-backend.yaml`: ajusta `repoURL` y `targetRevision` (a la rama de produccion o la que quieras).
2. Aplica:

```bash
kubectl apply -f argocd/app-backend.yaml
kubectl -n argocd get applications
```

## 5. Probar el loop GitOps

1. Cambia algo del backend, `git push` a la rama configurada.
2. Argo CD lo detecta y reconcilia solo (sin `kubectl apply` a mano).

```bash
argocd login --core            # CLI en modo core (opcional)
argocd app get ica-backend     # estado de sync y health
```

## Notas importantes

- **Self-heal:** si alguien cambia algo a mano en el cluster, Argo lo revierte
  al estado declarado en Git (la "auto-reparacion").
- **PVC protegido:** `pvc-backend.yaml` esta anotado con `Prune=false`; Argo
  nunca borra el volumen de los PDFs.
- **Cambios de codigo:** `main.py` se monta via `subPath` y NO se recarga solo.
  Tras un cambio de codigo hay que reiniciar el pod del backend:
  `kubectl rollout restart deployment/api-backend`.
- **RAM:** vigila tu RAM (Tenemos 2GB) con `kubectl top pods -A`.

## Promover al server (cuando estemos listos)

- Instalar Argo CD en el K3s del HP ProLiant (mismo `core-install.yaml`).
- Apuntar la Application a `path: overlays/server` (en vez de `capa-logica`),
  para que Argo gestione todo el stack con la config del server.

## Pendiente para fases siguientes

- [ ] Ampliar Argo para gestionar TODO el stack (apuntar a `overlays/server`).
- [ ] TLS/HTTPS via Ingress.
- [ ] Secretos cifrados en Git (Sealed Secrets / SOPS).
