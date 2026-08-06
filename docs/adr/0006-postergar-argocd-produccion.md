# ADR 0006: Postergar Argo CD en el servidor de producción

**Estado:** Aceptada (a reevaluar con datos de consumo reales tras el
primer despliegue estable)

## Contexto

Argo CD (variante Core) ya se instaló y validó en Minikube, incluyendo la
resolución de incidentes reales del flujo GitOps. El servidor de
producción tiene **2 GB de RAM totales**, y aún no ha recibido ningún
despliegue del proyecto — el primer despliegue en el servidor está
planeado para una fecha próxima.

## Decisión

**No instalar Argo CD en el servidor de producción por ahora.** El primer
despliegue, y los despliegues subsecuentes hasta nueva evaluación, se
realizan de forma manual (`kubectl apply -k overlays/server`), siguiendo
el runbook documentado.

## Por qué

**Presupuesto de memoria estimado** (no medido empíricamente en este
hardware específico, por lo que se documenta como estimación, no como
hecho verificado):

| Componente | RAM estimada |
|---|---|
| Sistema operativo base | ~300–400 Mi |
| K3s (server + kubelet + containerd + CoreDNS) | ~400–600 Mi |
| Aplicación (MySQL + backend + frontend, en `requests`) | ~350 Mi (hasta ~700 Mi en `limits`) |
| **Subtotal sin Argo CD** | **~1050–1350 Mi de 2048 Mi** |
| Argo CD Core (controller + repo-server + redis) | ~300–600 Mi adicionales |
| **Total con Argo CD** | **~1350–1950 Mi** |

El margen resultante es demasiado estrecho para un sistema que resguarda
datos académicos reales, sin redundancia de hardware.

**Análisis de retorno operativo, más allá de la memoria:** el valor
principal de Argo CD (sincronización y auto-reparación continuas) es mayor
en entornos con múltiples colaboradores y cambios frecuentes. En el estado
actual del proyecto, con una sola persona desplegando de forma ocasional y
un runbook manual ya documentado y validado (que toma segundos en
ejecutarse), el beneficio de automatizar ese paso es bajo en comparación
con el riesgo adicional de una nueva pieza de infraestructura corriendo
permanentemente en un servidor con recursos ajustados — riesgo que además
ya se materializó una vez de forma indirecta: un manifiesto de Argo CD
(`app-stack.yaml`) apuntando al overlay de desarrollo en lugar del de
servidor estuvo a punto de desplegar la configuración de Minikube sobre
producción.

## Consecuencias

**Positivas:**
- Menor superficie de falla en el primer despliegue a producción, que ya
  es de por sí un evento de riesgo elevado (primera vez que el sistema
  completo corre en este hardware).
- Prioriza la estabilidad del sistema que maneja datos reales sobre la
  automatización del proceso de despliegue.

**Negativas / limitaciones aceptadas:**
- El servidor no se auto-repara ante cambios manuales no intencionados
  (drift) mientras Argo CD no esté activo ahí.
- El flujo de trabajo GitOps completo (`git push` → despliegue automático)
  solo existe hoy en el entorno local, no en producción — una limitación
  explícita del alcance actual del proyecto.

## Revisión futura

Esta decisión debe reevaluarse **con datos reales** de consumo
(`kubectl top pods -A`, `free -h`) una vez que el despliegue manual esté
operando de forma estable en el servidor. Si el margen de memoria
observado es consistentemente mayor a lo estimado aquí, la decisión puede
revertirse.
