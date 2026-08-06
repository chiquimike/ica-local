# ADR 0007: Migración de esquema automática y casera, sin herramienta formal

**Estado:** Aceptada

## Contexto

El esquema de la base de datos creció de forma incremental a lo largo del
proyecto (de una sola tabla a siete), incluyendo columnas nuevas agregadas
a tablas ya existentes con datos reales. Se necesitaba una forma
confiable de mantener el esquema sincronizado con el código sin depender
de que alguien ejecute SQL manualmente en cada entorno.

## Decisión

Se implementó una función (`inicializar_db` / `_migracion_startup`) que se
ejecuta automáticamente cada vez que arranca el contenedor del backend:
crea las tablas que falten (`CREATE TABLE IF NOT EXISTS`) y agrega las
columnas que falten a tablas existentes (`ALTER TABLE ... ADD COLUMN`,
solo si la columna no existe todavía). No se adoptó una herramienta de
migraciones formal (Alembic, Flyway, etc.).

## Por qué

Dado el tamaño del proyecto y del equipo, introducir una herramienta de
migraciones formal —con su propio sistema de versionado, archivos de
migración incrementales y comando de aplicación— representaba
complejidad adicional desproporcionada al problema real. La necesidad
concreta era: que el esquema nunca requiera intervención manual, y que
instalar el proyecto desde cero o actualizar una instalación existente
produzcan el mismo resultado. Una función idempotente y aditiva, ejecutada
al arranque, cubre ese caso de uso con una fracción de la complejidad.

## Consecuencias

**Positivas:**
- Cero pasos manuales de base de datos en ningún entorno (Minikube o
  servidor): desplegar el backend es suficiente.
- Es segura de ejecutar repetidamente — arrancar el pod cien veces no
  causa ningún efecto adicional sobre un esquema ya actualizado.
- Reduce directamente uno de los riesgos identificados en el
  [ADR 0004](0004-pvc-prune-false.md) y en el runbook de diagnóstico: ya
  no existe la posibilidad de que alguien cree manualmente una tabla con
  un esquema desactualizado, como ocurrió con un procedimiento heredado
  documentado antes de esta decisión.

**Negativas / limitaciones aceptadas, documentadas explícitamente:**
- Es **solo aditiva**: nunca renombra ni elimina una columna o tabla. Un
  cambio de ese tipo requeriría intervención manual fuera de este
  mecanismo — una limitación real, no una garantía completa de gestión de
  esquema.
- No lleva un historial de versiones del esquema ni permite *rollback* a
  un estado anterior, a diferencia de una herramienta de migraciones
  formal.
- No sería un enfoque recomendable si el esquema creciera
  significativamente en complejidad o si el equipo creciera a un punto
  donde varias personas modificaran el esquema en paralelo.

## Alternativas consideradas

- **Alembic / herramienta de migraciones formal** — descartada por la
  complejidad desproporcionada al tamaño actual del proyecto; queda como
  opción a reconsiderar si el esquema o el equipo crecen.
- **SQL manual documentado** (el enfoque original del proyecto, ver
  [`docs/runbooks/04-conn-mysql-workbench.md`](../runbooks/04-conn-mysql-workbench.md))
  — descartado por depender de que una persona específica recuerde
  ejecutarlo, y por quedar desactualizado frente al esquema real (se
  detectó exactamente este problema durante la revisión de un documento
  heredado).
