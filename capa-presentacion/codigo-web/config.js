// URL base del backend (API). Es el ÚNICO punto que cambia entre entornos.
// Los overlays de Kustomize sobreescriben este archivo:
//   - overlays/local  -> Minikube  (este valor por defecto)
//   - overlays/server -> K3s del servidor
window.API_BASE = "http://192.168.49.2.nip.io:30090";