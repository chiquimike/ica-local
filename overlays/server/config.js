// URL base del backend para el SERVER (K3s, HP ProLiant).
// Sobreescribe el config.js de la base via Kustomize (behavior: merge).
// window.API_BASE = "http://192.168.0.254:30090"; 
window.API_BASE = "http://192.168.0.254.nip.io:30090"; 
// Debe de ser ".nip.io" porque Google Auth Platform exige un dominio, si nos dan una IP ahi iría.
