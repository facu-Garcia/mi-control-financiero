# Historial de cambios

## [0.3.0] - 2026-11-21

### Añadido
- Nuevo componente `card-designs.js` con estilos CSS basados en las identidades visuales de Inbursa, Mercado Pago, Nu, BBVA, Revolut y BDESA (diseños ilustrativos, no reproducciones oficiales).
- Nuevo `card-designs.css` para controlar el aspecto sin tocar la lógica de movimientos.
- Nuevo `card-images.js` con validación de tipo, límite de tamaño, compresión y eliminación de metadatos al recrear la imagen.
- Personalización en editar cuenta: estilo y fondo importado desde Android con vista previa.
- Compatibilidad de estilos de tarjetas con CSV mediante nueva columna opcional `diseno`.
- Exportación CSV de cuentas que no incluye imágenes de fondo.

### Cambiado
- `app.js` delega la visualización de tarjetas en un módulo; `logic.js` y `drive-sync.js` no requieren modificaciones.
- Los respaldos JSON y Drive incluyen los estilos e imágenes personalizadas de tarjetas al restaurar.
- Caché PWA actualizado a 0.3.0.

### Seguridad
- No cargar fotos reales de tarjetas que muestren número, nombre completo, vigencia o CVV; solo fondos decorativos sin datos privados.
- Las cuentas financieras se importan mediante CSV privado, no se publican en GitHub.
- El CSV no es un respaldo de imágenes; esas se conservan en JSON/Drive.


## [0.2.4] - 2026-11-21

### Corregido
- Diagnosticar exactamente por qué falla la apertura de IndexedDB, sin borrar registros.
- Detectar bloqueos de actualización por otras pestañas y liberar la conexión al cambiar la versión.
- Mostrar el estado del almacenamiento local en Ajustes y ofrecer un botón seguro de comprobación/reintento.
- Evitar la autorización de Drive hasta confirmar que el almacenamiento local está listo.
- Añadir un tiempo límite para aperturas bloqueadas y permitir reintentar.
- Renovar recursos de caché para evitar scripts de distintas versiones.

### Pruebas
- Comprobar apertura y cierre de IndexedDB y casos de bloqueo mediante pruebas automatizadas.


## [0.2.3] - 2026-11-21

### Corregido
- Evitar el error `Cannot read properties of undefined (reading 'connect')` al pulsar Conectar Google Drive cuando no se inicializó el módulo.
- Inicializar el almacenamiento local independientemente del conector opcional de Google Drive; mostrar la causa real cuando falla.
- Permitir volver a intentar inicializar el conector desde Ajustes sin perder datos.
- Tolerar navegadores que bloquean `localStorage` y usar el Client ID durante la sesión.
- Renovar versiones de los scripts y caché de la PWA para reducir mezclas entre versiones.

### Pruebas
- Ampliar prueba de Drive para un almacenamiento de preferencias restringido.


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
