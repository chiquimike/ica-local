# Guía de Acceso Remoto al Servidor (SSH)

Procedimiento estándar para acceder a la terminal del servidor físico del
Innovation Center Aragón (ICA) para tareas de mantenimiento y despliegue.

## Requisitos previos

1. Estar físicamente en las instalaciones del ICA, o conectado a la red
   local (intranet) de la facultad — el servidor **no** está expuesto a
   internet, solo es alcanzable desde la LAN.
2. Contar con un cliente OpenSSH (nativo en Linux/macOS; en Windows, usar
   PowerShell o WSL).

## Credenciales de acceso

El servidor es un HP ProLiant ML370 G4 que aloja el clúster K3s.

* **Dirección IP (estática):** `192.168.0.254`
* **Usuario:** `ica-aragon`
* **Contraseña:** solicitar al administrador actual o consultar la bitácora
  física del laboratorio.

> ⚠️ **A propósito no se documenta ninguna contraseña aquí, ni siquiera
> como "histórica".** Este repositorio es público: cualquier credencial
> escrita en un archivo, aunque ya esté rotada, queda visible para siempre
> en el historial de Git y es información útil para un atacante (patrones
> de rotación, contraseñas reutilizadas). Si necesitas la contraseña
> actual, pídela por un canal que no sea este repositorio.

## Pasos para la conexión

1. Abre tu terminal.
2. Conéctate por el puerto estándar (22):
   ```bash
   ssh ica-aragon@192.168.0.254
   ```
3. **Primera vez que te conectas desde esa máquina:** SSH te preguntará si
   confías en la huella (*fingerprint*) del servidor. Responde `yes` — es
   normal y solo aparece una vez por cliente.
4. Ingresa la contraseña cuando se te solicite (no se muestra en pantalla
   mientras la escribes, es normal).
5. Ya en la terminal del servidor, para trabajar con el proyecto:
   ```bash
   cd ica-local   # si ya estaba clonado
   # o, la primera vez: ver docs/runbook-primer-despliegue-servidor.md, Paso 0
   ```

## Cerrar la sesión

```bash
exit
```

## Nota de seguridad (trabajo futuro)

Hoy el acceso es por contraseña. Se recomienda a mediano plazo el migrar
a **autenticación por llave SSH** (`ssh-keygen` + `ssh-copy-id`) y
deshabilitar el login por contraseña en `/etc/ssh/sshd_config`
(`PasswordAuthentication no`). Esto elimina por completo el riesgo de que
una contraseña filtrada (por el motivo que sea) sirva para entrar al
servidor — con llaves, quien no tenga la llave privada no puede conectarse
aunque conozca el usuario y la IP (ambos ya son públicos en este repo).
