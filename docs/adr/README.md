# Architecture Decision Records (ADRs)

Registro de las decisiones de arquitectura del proyecto: **qué** se
decidió, **por qué**, y **qué se aceptó a cambio**. Documentadas solo
cuando nuestro razonamiento real es verificable (en el código, el historial de
Git, o confirmado directamente con quien tomó la decisión) — no se
documenta un "por qué" inventado.

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-kustomize-sobre-helm.md) | Kustomize en capas, sin Helm | Aceptada |
| [0002](0002-mysql-57-restriccion-hardware.md) | MySQL 5.7 en lugar de 8.0 | Aceptada |
| [0003](0003-sso-google-oauth-institucional.md) | SSO institucional con Google OAuth 2.0 | Aceptada |
| [0004](0004-proteccion-pvc-prune-false.md) | `Prune=false` en los volúmenes persistentes | Aceptada |
| [0005](0005-secretos-cifrados-sealed-secrets.md) | Secret de MySQL por overlay, cifrado en producción | Aceptada |
| [0006](0006-postergar-argocd-produccion.md) | Postergar Argo CD en el servidor de producción | Aceptada, a reevaluar |
| [0007](0007-auto-migracion-db-sin-herramientas.md) | Migración de esquema automática y casera | Aceptada |
