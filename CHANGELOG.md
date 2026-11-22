# Historial de cambios

## [0.2.2] - 2026-11-21

### Corregido
- Mostrar mensajes y errores de Google Drive dentro de la ventana de Ajustes (antes podían quedar ocultos detrás del diálogo).
- Indicar cuando se está solicitando autorización y deshabilitar temporalmente el botón para evitar pulsaciones repetidas.
- Detectar cierre o bloqueo de ventanas emergentes de Google y mostrar instrucciones para Chrome.
- Informar de ausencia de respuesta de Google y permitir reintentar sin quedarse conectando indefinidamente.

### Actualizado
- Renovar la caché de la PWA para instalar la corrección.


## [0.2.1] - 2026-11-21

### Cambiado
- Actualizar instrucciones de Google Drive a OAuth Personal Mode (un solo usuario, sin verificación).
- Añadir enlace directo desde Ajustes a la creación de credenciales y a la guía de instalación.
- Actualizar versión del caché de la PWA para cargar los cambios.

### Seguridad
- Documentar origen autorizado, permiso mínimo `drive.appdata`, contraseña de cifrado y validación de restauración.

## [0.2.0] - 2026-11-21

### Añadido
- Importación CSV de cuentas y tarjetas sin guardar datos personales en GitHub.
- Importación CSV de movimientos con validación, confirmación y prevención de duplicados.
- Plantillas CSV descargables desde Ajustes.
- Tarjetas visuales con colores por institución y distinción de crédito y débito.
- Iconos visuales por tipo de movimiento y categoría.
- Gráfica de distribución de gastos y límites mensuales globales o por tarjeta/categoría.
- Respaldo cifrado opcional a Google Drive mediante OAuth en navegador (requiere configuración).
- Pruebas de importación CSV y compatibilidad con respaldos 0.1.

### Cambiado
- IndexedDB esquema v2 incorpora presupuestos sin borrar datos existentes.
- Tarjetas con cortes desconocidos pueden configurarse después; no se inventa una fecha.
- Se protege la nube contra sustituciones accidentales si difieren los datos locales.

### Limitaciones
- La sincronización no funciona cuando la PWA está cerrada o el token OAuth expiró.
- Respaldo Drive de una sola versión, sin historial interno ni sincronización multiusuario transaccional.
- Activación de Drive y prueba final requieren tu propio OAuth Client ID de Google Cloud.

## [0.1.0] - 2026-11-21

### Añadido
- PWA móvil sin servidor compatible con GitHub Pages e IndexedDB.
- Panel de patrimonio, ingresos, gastos, cuentas y cajitas.
- Tarjetas de crédito con mes financiero por fecha de corte.
- Compras a meses sin intereses y proyección de mensualidades.
- Ingresos, gastos, transferencias, pagos y rendimientos.
- Informes, exportación CSV/JSON y copias de seguridad.
- Uso offline básico e iconos instalables.
- 26 comprobaciones de lógica y pruebas automáticas con GitHub Actions.

### Limitaciones conocidas
- Los datos permanecen en cada dispositivo y no se sincronizan.
- Los respaldos JSON no están cifrados.
- No hay importación ni conciliación de estados de cuenta.
- Falta validación visual real en Android.
- Los cargos calculados no sustituyen los importes exigibles del banco.

## Convención para próximas versiones
- **Añadido**: funcionalidad nueva.
- **Cambiado**: modificación de comportamiento.
- **Corregido**: error solucionado.
- **Seguridad**: mejora de privacidad o protección.
- **Pruebas**: ampliación de validaciones.

Los siguientes commits seguirán ejemplos como:
- `feat(tarjetas): mostrar cargos del estado de cuenta`
- `fix(msi): corregir mensualidades al cambiar de año`
- `docs: explicar respaldos y restauración`
- `test(finanzas): cubrir transferencias entre cajitas`

Cada versión publicada debe incrementar la constante `VERSION` de `sw.js` para actualizar el caché.
