# ADR 0004: `Prune=false` en los volúmenes persistentes

**Estado:** Aceptada

## Contexto

El sistema almacena datos que no se pueden regenerar si se pierden:
historiales académicos en PDF, imágenes subidas desde el CMS, y (desde la
Fase 5) el propio contenido editable del sitio y sus registros en MySQL.
Con la adopción de GitOps (Argo CD), la política de sincronización
automática incluye `prune: true`: cualquier recurso que se elimine de la
declaración en Git es eliminado también del clúster.

## Decisión

Los `PersistentVolumeClaim` (`backend-pdf-pvc`, `cms-uploads-pvc`) se
declaran en manifiestos independientes de los `Deployment` que los usan, y
se anotan con `argocd.argoproj.io/sync-options: Prune=false`.

## Por qué

Un PVC referenciado únicamente dentro del mismo manifiesto que su
`Deployment` corre el riesgo de eliminarse junto con él ante cualquier
cambio en la definición del despliegue, incluyendo un simple
`kubectl delete -k .` durante desarrollo. Separar el PVC en su propio
archivo, y anotarlo explícitamente para que Argo CD nunca lo elimine por
poda automática, hace que el borrado de datos requiera una acción
deliberada y explícita, no un efecto colateral de otro cambio.

## Consecuencias

**Positivas:**
- Reduce drásticamente el riesgo de pérdida accidental de datos reales de
  alumnos durante operaciones rutinarias de despliegue o limpieza.
- El ciclo de vida de los datos queda desacoplado del ciclo de vida del
  cómputo (los pods son desechables; los volúmenes no).

**Negativas / limitaciones aceptadas:**
- `Prune=false` protege únicamente de la poda **automática de Argo CD**.
  **No protege** de un `kubectl delete pvc` manual ejecutado directamente
  contra el clúster — este límite se descubrió de forma práctica durante
  un incidente real documentado en
  [`docs/runbooks/06-diagnostico-general.md`](../runbooks/06-diagnostico-general.md),
  donde una secuencia de comandos mal ordenada remontó un volumen con
  datos y credenciales desactualizados.
- Un PVC "huérfano" (sin `Deployment` que lo use) no se limpia solo; su
  eliminación, cuando corresponde, sigue siendo una decisión manual.

## Alternativas consideradas

- Dejar los PVC dentro del mismo manifiesto que su `Deployment` —
  descartado por el riesgo de borrado accidental descrito arriba.
