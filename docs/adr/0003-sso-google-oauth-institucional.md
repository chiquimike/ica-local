# ADR 0003: SSO institucional con Google OAuth 2.0 y restricción de dominio

**Estado:** Aceptada

## Contexto

El sistema maneja datos personales de alumnos (PII): número de cuenta,
nombre, teléfono, correo, historial académico en PDF. Se necesitaba un
mecanismo de autenticación tanto para el registro de alumnos como para el
panel administrativo, sin construir ni mantener un sistema de credenciales
propio.

## Decisión

Autenticación vía **Google OAuth 2.0 / Google Identity Services**, con el
JWT resultante validado criptográficamente en el backend (no solo
confiado por el frontend). El acceso se restringe a cuentas del dominio
institucional `@aragon.unam.mx`, más una lista blanca de correos
administradores (`CORREOS_ADMIN`) para cubrir cuentas fuera del dominio
que también requieren privilegios de administración.

## Por qué

- Delegar la gestión de credenciales a Google evita almacenar y proteger
  contraseñas propias — una responsabilidad de seguridad significativa
  para un proyecto de este tamaño.
- Restringir por dominio institucional acota el universo de cuentas
  válidas a la comunidad de la facultad, en lugar de aceptar cualquier
  cuenta de Google válida (el estado inicial del proyecto, antes de esta
  decisión).
- Validar el JWT en el backend (no solo ocultar la UI en el frontend)
  seon un modelo de **Confianza Cero**: cualquier petición a la API se
  autentica de forma independiente del cliente que la origina.

## Consecuencias

**Positivas:**
- No se almacena ninguna contraseña de usuario en el sistema.
- Autorización de dos niveles (dominio institucional vs. lista blanca de
  administradores) permite diferenciar quién puede *usar* el sistema de
  quién puede *administrar* el contenido público, sin tablas de roles
  adicionales.

**Negativas / limitaciones aceptadas:**
- Dependencia de un proveedor externo (Google): si el servicio de Google
  Identity no está disponible, nadie puede iniciar sesión, incluyendo
  administradores.
- La lista de administradores (`CORREOS_ADMIN`) se gestiona como variable
  de entorno en el manifiesto de despliegue, no desde una interfaz — 
  agregar o quitar un administrador requiere modificar y volver a
  desplegar el manifiesto.

## Alternativas consideradas

- **Sistema de usuarios y contraseñas propio** — descartado por la carga
  adicional de seguridad (hashing, recuperación de contraseña, protección
  contra fuerza bruta) que no aporta valor sobre delegar en un proveedor
  ya confiable para la comunidad universitaria.
