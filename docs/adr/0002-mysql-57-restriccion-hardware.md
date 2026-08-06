# ADR 0002: MySQL 5.7 en lugar de 8.0

**Estado:** Aceptada

## Contexto

El servidor de producción es un HP ProLiant ML370 G4 con **2 GB de RAM
DDR2** — hardware rescatado, no adquirido para este proyecto. MySQL es el
motor de base de datos elegido para persistir los registros de los
prestadores de servicio social.

## Decisión

Se utiliza **MySQL 5.7** en lugar de la versión 8.0.

## Por qué

Se realizaron pruebas de despliegue con MySQL 8.0 en el hardware
disponible. Se observó una huella de memoria significativamente mayor
desde el arranque, generando latencia perceptible, y el procesador/
arquitectura de disco del servidor no sostenía de forma fluida los nuevos
algoritmos de autenticación y manejo de metadatos introducidos en la
versión 8, resultando en tiempos de conexión lentos.

Bajo esas condiciones, se optó por estandarizar en MySQL 5.7, que en
pruebas posteriores respondió de forma consistente a las peticiones del
backend sin la sobrecarga observada en 8.0.

## Consecuencias

**Positivas:**
- Consumo de memoria compatible con el resto del stack (backend, frontend
  y, potencialmente, componentes de GitOps) dentro de los 2 GB disponibles.
- Estabilidad verificada empíricamente en el hardware real del proyecto,
  no solo en teoría.

**Negativas / limitaciones aceptadas:**
- MySQL 5.7 alcanzó su fin de soporte oficial de Oracle (octubre de 2023);
  no recibe parches de seguridad oficiales. Es un riesgo aceptado
  conscientemente a cambio de viabilidad en el hardware disponible, y debe
  reevaluarse si el proyecto migra a hardware con más memoria.
- No se dispone de mejoras de seguridad y rendimiento introducidas en 8.0
  (nuevos algoritmos de autenticación, funciones de ventana, JSON mejorado,
  etc.), varias de las cuales son precisamente las que generaban la
  sobrecarga observada en este hardware.

## Alternativas consideradas

- **MySQL 8.0** — descartada por las razones de rendimiento arriba
  descritas.
- No se evaluaron motores alternativos (PostgreSQL, MariaDB); la decisión
  se limitó a la versión de MySQL dado que el esquema y las consultas ya
  estaban diseñados sobre ese motor.
