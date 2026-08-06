# ADR 0005: Secret de MySQL por overlay, cifrado con Sealed Secrets en producción

**Estado:** Aceptada

## Contexto

Una auditoría del repositorio reveló que era **público** en GitHub, y que
el `Secret` de MySQL contenía la contraseña en texto plano
(`stringData`), visible para cualquiera con el enlace del repositorio.
Adicionalmente, Argo CD opera con `selfHeal: true`: cualquier valor
correcto aplicado manualmente al clúster, si no coincide con lo declarado
en Git, es revertido automáticamente.

## Decisión

El `Secret` de MySQL se eliminó del manifiesto compartido y se provee de
forma independiente **por overlay**, replicando el mismo patrón ya
utilizado para la URL del backend (`config.js`):

- `overlays/local/`: una contraseña de relleno explícitamente marcada como
  no sensible, válida únicamente para desarrollo en Minikube.
- `overlays/server/`: un `SealedSecret` — el valor cifrado con
  [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets), que
  solo el controlador del clúster específico donde se generó puede
  descifrar.

## Por qué

Sustituir la contraseña expuesta por otra en texto plano no resolvía el
problema de fondo: cualquier valor nuevo committeado quedaría igual de
expuesto. Y con `selfHeal: true` activo, aplicar la contraseña real solo
de forma manual en el clúster no era una solución estable — Argo la
revertiría al valor declarado en Git en el siguiente ciclo de
sincronización. Sealed Secrets resuelve ambas restricciones a la vez: el
valor cifrado es seguro de publicar, y sigue siendo un recurso declarado
en Git que Argo CD puede reconciliar normalmente.

## Consecuencias

**Positivas:**
- Ningún secreto vive en texto plano en un historial de Git público.
- Compatible con el modelo GitOps existente (Argo CD sigue gestionando el
  recurso, no hay que excluirlo de la reconciliación).
- El patrón "config por overlay" se reutiliza en lugar de introducir un
  mecanismo distinto solo para secretos.

**Negativas / limitaciones aceptadas:**
- Requiere instalar y operar un componente adicional en el clúster (el
  controlador de Sealed Secrets), con su propio consumo de RAM.
- Generar el valor cifrado requiere acceso al clúster de destino (el
  cifrado está ligado a la llave pública de ese controlador específico) —
  no se puede generar de antemano sin el clúster real, lo cual quedó
  documentado como paso manual pendiente para el primer despliegue en el
  servidor (ver [`docs/runbooks/03-servidor-mysql-secret.md`](../runbooks/03-servidor-mysql-secret.md)).
- La contraseña previamente expuesta (`1ca_01`) permanece visible en el
  historial de Git de forma permanente; se documentó como comprometida en
  lugar de intentar purgarla del historial, decisión tomada para evitar el
  riesgo de reescribir el historial de un repositorio de infraestructura
  en uso real.

## Alternativas consideradas

- **Extraer el Secret a un archivo local ignorado por Git**, inyectado vía
  `secretGenerator` de Kustomize — descartada porque rompe el modelo
  GitOps: el valor real no existiría en el repositorio que Argo CD clona,
  por lo que Argo no podría reconciliar ese recurso de forma autónoma.
- **SOPS** — alternativa viable no explorada a fondo; se eligió Sealed
  Secrets por su integración más directa con el modelo de Kubernetes
  (`SealedSecret` es un CRD nativo, descifrado dentro del clúster).
