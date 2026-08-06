# ADR 0001: Kustomize en capas, sin Helm

**Estado:** Aceptada
**Fecha de la decisión original:** previa a este ciclo de documentación (commit raíz, `v0.1.0-alpha`)

## Contexto

Al iniciar el proyecto había que elegir cómo gestionar los manifiestos de
Kubernetes de forma declarativa. Las dos opciones estándar de la industria
son **Helm** (gestor de paquetes con plantillas) y **Kustomize**
(composición declarativa sin plantillas, integrado nativamente en `kubectl`).

## Decisión

Se eligió **Kustomize**, estructurando el proyecto en capas
(`capa-datos`, `capa-logica`, `capa-presentacion`) desde el primer commit.

## Por qué 

La elección no partió de una comparación formal entre ambas herramientas,
sino de la exposición previa a Kustomize durante la preparación para la
certificación **CKA (Certified Kubernetes Administrator)**, que incluye una
sección dedicada a Kustomize. En ese momento no se conocía la existencia de
Helm como alternativa, y **nunca se ha utilizado Helm** en este ni otros
proyectos del equipo.

Es importante documentar esto con honestidad: no fue una decisión derivada
de un análisis comparativo de trade-offs, sino de la herramienta con la que
ya tenía familiaridad práctica en el momento de arrancar el
proyecto.

## Consecuencias

**Positivas (evidentes en retrospectiva, no buscadas originalmente):**
- Kustomize no requiere un motor de plantillas ni un lenguaje adicional
  (a diferencia de Helm, que usa Go templates); los manifiestos siguen
  siendo YAML plano y legible.
- El patrón de `base/` + `overlays/` que se adoptó más adelante (para
  soportar Minikube y el servidor con la misma base) es una capacidad
  nativa de Kustomize, sin necesitar `values.yaml` ni condicionales de
  plantilla.
- Integración directa con `kubectl` (`kubectl apply -k`), sin instalar
  herramientas adicionales en el clúster ni en el equipo de desarrollo.

**Negativas / limitaciones aceptadas:**
- Kustomize no tiene un sistema de *releases* con historial y rollback
  nativo como Helm (`helm rollback`); el versionado de despliegues depende
  enteramente de Git.
- No hay un ecosistema de *charts* públicos reutilizables (como el Helm
  Hub) — cada manifiesto de terceros que se necesite (Argo CD, Sealed
  Secrets) se aplica desde su YAML de instalación directo, no como un
  paquete gestionado.

## Alternativas consideradas

Ninguna de forma activa — ver sección "Por qué" arriba.
