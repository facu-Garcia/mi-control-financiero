# Historial de cambios

## [0.8.0] - 2026-11-22
- Estabilizar detección de cambios del respaldo Drive en todas las colecciones.
- Evitar duplicados CSV cuando se reordenan registros y mantener importaciones antiguas.
- Corregir informes históricos y cargos MSI sin día de corte configurado.
- Separar deuda exigible de proyecciones futuras potencialmente incluidas.
- Permitir vínculo a corte base automático y proteger cambios destructivos del saldo inicial.
- Excluir recurrentes pendientes de presupuestos y evitar respuestas HTML a recursos offline.
- Integrar pruebas automatizadas de regresión de auditoría.


## [0.7.3] - 2026-11-22
- Mostrar la deuda inicial automáticamente como importe a pagar del mes financiero base, con fecha de corte y vencimiento prellenados.
- Eliminar casilla redundante y simplificar el formulario de corte a mes, fechas e importe editable.
- Resolver montos del resumen y su pantalla de detalle desde cortes pendientes y MSI previstas; no únicamente compras nuevas.
- Rediseñar historial de cortes con filas compactas, fechas legibles, estado y acciones apropiadas para móvil.
- Mantener compatibilidad con cortes ya guardados y sin duplicar cargos ni modificar saldos iniciales.


## [0.7.2] - 2026-11-21
- Al editar un rendimiento de cajita, impedir cambiar la cuenta receptora, el tipo de movimiento o utilizar una fecha incompatible con la creación de la cajita y el saldo inicial. Esto mantiene alineados el saldo del banco y el saldo del apartado.


## [0.7.1] - 2026-11-21
- Mantener flags de corte originado del saldo inicial y de MSI ya incluidas en deuda al restaurar.
- Proteger cortes vinculados a pagos contra eliminaciones accidentales.
- Restringir fechas de rendimientos al periodo en que existe la cajita.
- Permitir recuperar respaldos con descuadres temporales de ahorro sin bloquear la restauración; el usuario debe corregir el saldo reservado posteriormente.


## [0.7.0] - 2026-11-21
- Convertir detalle de cualquier cuenta a página completa; tarjetas y cuentas mantienen sus diseños.
- Sustituir alertas grandes y duplicadas por filas compactas de crédito con deuda, pago del corte, fecha límite y próximo corte.
- Distinguir importe pendiente de corte y deuda total; permitir asignar la deuda inicial como obligación del corte cuando el usuario lo confirme.
- Vincular pagos a un corte concreto, asignando pagos sin vínculo primero a los cortes más antiguos sin contarlos dos veces.
- Permitir MSI antiguas incluidas o no incluidas en la deuda inicial. En el segundo caso crear un ajuste de deuda único, reversible y sin compras ficticias.
- Gestionar cajitas internas de una cuenta: saldo reservado, traspasos entre apartados y rendimientos reales sin duplicar el patrimonio.
- Conservar sin conversión automática cuentas de ahorro que ya existían.
- Separar interfaces y reglas en módulos de cuentas, tarjetas y ahorros.
- Migra IndexedDB a v6; respaldos cifrados/JSON esquema 6 con colecciones `pockets`, `pocketMoves` y referencias de corte/ajustes.


## [0.6.0] - 2026-11-21

### Tarjetas de crédito y fechas reales
- Configurar fecha de corte y vencimiento exactos para cada mes y tarjeta, con importe del estado de cuenta confirmado por el usuario.
- Mantener el día habitual como una previsión, claramente diferenciado de fechas confirmadas.
- Priorizar fecha del corte real en la asignación financiera de nuevas compras a crédito y proyecciones a MSI.
- Mostrar próximas fechas de corte, pagos confirmados y estimaciones de deuda en Resumen, Cuentas y detalle de cada tarjeta.
- Preseleccionar toda la deuda estimada al registrar un pago a crédito, con elección alternativa de pago oficial del corte.
- Registrar mensualidades de compras anteriores al inicio del seguimiento, por periodo e importe fijo, sin crear compras pasadas ni aumentar la deuda existente.
- Incluir esos compromisos en MSI estimadas e informe mensual, pero mantenerlos fuera de gastos del mes y patrimonio.
- Crear accesos para abrir cajitas, transferir ahorro y registrar rendimientos.
- Corregir visualización excesivamente vacía de la gráfica patrimonial con un único mes.
- Mejorar separación modular: `features/cards/billing.js` para reglas, `billing-view.js` para vistas y `billing.css` para estilo.

### Datos y seguridad
- Migración no destructiva de IndexedDB v4 a v5 agregando `billingCycles` y `legacyInstallments`.
- Respaldo JSON/Drive cifrado v5 con lectura compatible de versiones anteriores, sin subir datos de tarjetas a GitHub.
- Las fechas, importes de estados de cuenta y compromisos no alteran los saldos reales; los movimientos confirmados mantienen el libro contable.


## [0.5.1] - 2026-11-21
- La previsión mensual de nómina se deriva automáticamente del importe por quincena multiplicado por dos, o del importe mensual, cuando la cuenta de nómina está configurada con un monto.
- Al registrar un pago se detecta un ingreso existente con misma fecha, cuenta e importe sin clasificación de nómina y se sugiere clasificarlo para no duplicar dinero.
- Actualización del número de versión usado por el test de selector de tarjetas.


## [0.5.0] - 2026-11-21

### Nómina privada
- Asociar una cuenta de débito como cuenta de nómina, seleccionable desde la aplicación; ninguna institución se marca como nómina en el código público.
- Configurar frecuencia quincenal (dos pagos por mes) o mensual, fechas habituales y pago neto estimado, todo en IndexedDB privado.
- Mostrar calendario de pagos previstos y depósitos recibidos con cantidades separadas. Los depósitos previstos jamás modifican el balance.
- Registrar ingresos efectivos de sueldo, fondo de ahorro recibido, aguinaldo, prima vacacional, utilidades, bono y otros conceptos.
- Clasificar ingresos existentes con su concepto de nómina sin crear movimientos duplicados ni cambiar su saldo.
- Evitar registrar dos veces una quincena ya vinculada con un identificador estable.
- Añadir «Nómina» a Cuentas y Movimientos, y acceso desde el detalle de una cuenta de débito.
- Los ingresos de nómina se contabilizan como ingresos normales en saldos y reportes; los conceptos se conservan en movimientos y exportaciones.

### Seguridad y migración
- Migrar IndexedDB de v3 a v4 agregando `payrollProfiles` sin borrar cuentas o movimientos.
- Actualizar respaldo cifrado de Drive y exportación JSON a esquema v4; leer respaldos de versiones v1 a v3 como antes.
- Guardar conceptuales de nómina en movimientos y configuración solo en IndexedDB/respaldos privados.
- No contiene nombre de empleador, sueldo personal ni asignación privada de cuentas en el repositorio.


## [0.4.3] - 2026-11-21

### Claridad financiera
- Al tocar la franja «Estimación para gastar», el detalle de Patrimonio ahora explica su cálculo: efectivo y débito, menos deuda estimada de crédito, menos compromisos recurrentes pendientes.
- El filtro por cuenta también limita las reglas recurrentes usadas en el cálculo.
- Se mantiene el resumen principal compacto; la explicación completa se reserva para la pantalla de detalle.


## [0.4.2] - 2026-11-21

### Diseño y experiencia
- Conservar la prioridad de números grandes del resumen, sin añadir nuevos menús inferiores.
- Reemplazar el bloque redundante «Tu dinero en tres respuestas» por una única cifra compacta de disponible estimado para gastar, enlazada al análisis de patrimonio.
- El acceso de Suscripciones permanece en Movimientos, no en la pantalla principal.
- Añadir un selector visual de cuentas y tarjetas reutilizable: tarjeta en miniatura con diseño del banco, nombre, tipo, búsqueda y selección por ventana emergente adaptable a Android.
- Mantener los campos select originales como fuente de verdad de los formularios para evitar alterar cuentas, movimientos, límites y suscripciones.
- Separar el selector en `features/ui/account-picker.js` y `features/ui/account-picker.css`, y los nuevos estilos del resumen en `features/dashboard/dashboard.css`.
- No se modifican IndexedDB, reglas financieras, cifrado ni estructura de los respaldos.


## [0.4.1] - 2026-11-21

### Corregido
- La conciliación bancaria ahora calcula el saldo esperado a la fecha que se eligió y no siempre con el saldo actual.
- Evitar conciliaciones con fecha anterior al saldo inicial o posterior a hoy.
- Actualizar el importe esperado en el formulario cuando cambie la fecha.


## [0.4.0] - 2026-11-21

### Nuevas funciones
- El resumen mantiene las cifras principales; ahora los cinco indicadores abren pantallas de análisis con gráficas y filtro por cuenta.
- Panel de tres respuestas: dinero líquido estimado, deuda estimada y margen conservador de gasto.
- Suscripciones mensuales programadas: genera cargos al abrir o reactivar la PWA una vez alcanzado su vencimiento; quedan pendientes hasta confirmar el cobro real.
- Formulario de edición de movimientos y selección automática de tarjeta al abrirlo desde su detalle.
- Conciliación bancaria: compara saldo declarado y calculado sin inventar movimientos.
- Historial básico de modificaciones, con datos anteriores y nuevos.
- Diagnóstico visible de movimientos históricos en la fecha de saldo inicial, evitando duplicaciones.

### Arquitectura
- Separar lógica de recurrencias e indicadores en `features/finance/`.
- Separar gráficas/vistas en `features/dashboard/`.
- Migración no destructiva de IndexedDB de v2 a v3 agregando tiendas de recurrencias, conciliaciones y auditorías.
- Respaldo y restauración v3 con compatibilidad de lectura para v1/v2, incluyendo recurrencias, conciliaciones, historial e indicadores de confirmación.
- Excluir cargos recurrentes pendientes de saldos y gastos contabilizados hasta que se confirmen.

### Limitaciones
- La PWA no puede realizar operaciones mientras está cerrada. Los cargos vencidos se generan al volver a abrirla.
- Las proyecciones de disponibilidad son conservadoras; no sustituyen los importes oficiales de bancos.
- Se requiere comprobar restauración real de Drive antes de depender de ella exclusivamente.


## [0.3.2] - 2026-11-21

### Visual
- Mercado Pago: posición idéntica del chip y contacto NFC para las variantes de débito y crédito.
- BBVA: «A» geométrica reconstruida mediante dos trazos CSS en vez de una letra tipográfica.
- Nu: tonos de morado más saturados para crédito y débito, con muesca lateral CSS.
- Revolut e Inbursa permanecen sin cambios.

### Mantenimiento
- Eliminar BDESA del catálogo, sus referencias CSS y nuevos CSV privados.
- No eliminar automáticamente cuentas que puedan existir en IndexedDB/Drive para no perder información financiera.
- Ampliar pruebas y actualizar la caché de GitHub Pages; no tocar cálculos, pagos ni sincronización.


## [0.3.1] - 2026-11-21

### Diseño
- Recreación visual CSS más fiel de tarjetas Inbursa, Mercado Pago (débito Mastercard y crédito Visa), Nu (débito y crédito), BBVA y Revolut tomando como guía capturas del usuario y referencias públicas. Marcas/logotipos reconstruidos tipográficamente y elementos gráficos dibujados en CSS, no fotografías oficiales.
- Separar cada diseño en `cards/banks/<banco>.css`. Mantener chip, NFC y redes de pago como elementos compartidos en `card-designs.css`.
- Diferenciar expresamente débito/crédito y mostrar el nombre de la cuenta fuera de la cara de la tarjeta para mejorar la fidelidad.
- Añadir `cards-preview.html` con ejemplos públicos sin datos personales para comparar diseños.
- El diseño BDESA es provisional porque no se ha identificado el producto real exacto.

### Ingeniería
- La lógica financiera, almacenamiento, CSV y sincronización Drive no cambian.
- Versionar recursos CSS/JS y renovar caché PWA.
- Mantener personalización por imagen y estilo: los cambios visuales no alteran cuentas ni movimientos.


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
