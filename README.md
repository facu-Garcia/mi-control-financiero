# Mi Control Financiero · v0.10.1 — Corrección de la agenda financiera

- La **agenda** ahora contiene exclusivamente movimientos efectivamente registrados; no mezcla cortes estimados, ingresos futuros ni cargos automáticos pendientes.
- Las **obligaciones del mes elegido** se muestran según la fecha límite de pago, incluso cuando ésta cae en el mes siguiente al corte. Por ejemplo, los pagos con vencimiento el 1 y el 5 de diciembre aparecen en diciembre, no como pagos de noviembre.
- La estimación de liquidez para **los siguientes 30 días** se muestra separada y con su fecha inicial y final expresas; puede abarcar varios meses independientemente del mes consultado.
- Nómina prevista y fechas de corte están en una sección opcional de **referencias**. No se presentan como transacciones confirmadas.
- El selector presenta el **mes y año completos**; diseño compacto con botón de agregar menos intrusivo.
- Si una deuda no tiene importe o vencimiento asignable, se avisa. No se inventan importes ni se interpretan fechas habituales como confirmaciones bancarias.
- Cambios exclusivamente de consulta; esquema IndexedDB v6, respaldo JSON v6 y Google Drive sin migración.

---

# Mi Control Financiero v0.10.0 — Calendario y capacidad financiera

- Nuevo calendario financiero informativo desde **Resumen** y **Informes**; muestra cortes, pagos de tarjeta, suscripciones y nómina prevista por fecha.
- Capacidad de pago conservadora de los próximos **30 días**: dinero en débito y efectivo a la fecha de hoy, menos cajitas reservadas, pagos exigibles con fecha conocida y cargos fijos todavía no confirmados.
- No se cuentan sueldos futuros ni se suman nuevamente cuotas MSI de tarjetas cuando existen pagos de cortes pendientes; las fechas o deudas sin vencimiento conocido se advierten y no se consideran cubiertas.
- Los eventos del calendario no alteran saldos. Las fechas de corte y nómina no oficiales se marcan como estimaciones.
- Se conservan IndexedDB v6, respaldo JSON v6, Google Drive y la instalación Android sin migración.

---

# Mi Control Financiero · v0.9.2 (propuesta en revisión)

- Edición, confirmación, alta y baja de movimientos mediante transacciones atómicas; las auditorías se guardan en la misma transacción que el movimiento.
- Bloqueo ante edición concurrente de un movimiento abierto con datos desactualizados.
- Conciliación bancaria con captura manual obligatoria del saldo observado y revisión de hasta 20 registros previos por cuenta. Una conciliación se marca para revisión cuando movimientos posteriores cambian su saldo histórico esperado, sin reescribir la observación registrada.
- Se mantiene IndexedDB v6 y el respaldo JSON v6; no se borran ni migran datos.
- Pendientes: pruebas manuales de Android y Google Drive con datos ficticios, así como revisión específica del flujo de auditoría al restaurar.

---

# Mi Control Financiero · PWA v0.9.1 — Controladores de formularios

## Refactorización segura
- Los formularios de cuentas y movimientos se extraen de `app.js` a `features/finance/transaction-forms.js`.
- `app.js` conserva los puntos de entrada y delega la interfaz y la validación; el módulo recibe dependencias explícitas y el estado actualizado en cada apertura.
- El esquema de IndexedDB y respaldo continúa en la versión 6, sin migración de datos ni cambios deliberados en el cálculo de saldos, cortes o MSI.
- Se agregaron comprobaciones de carga, integración y regresiones adaptadas al nuevo módulo.

## Comprobaciones pendientes fuera de CI
- Validación visual y de flujos reales en Android/Chrome: creación/edición de cuentas, tarjetas, movimientos, pagos a corte, transferencias e imágenes.
- Validación contra una cuenta de Google Drive de prueba, especialmente recuperación, conflictos y apertura simultánea en dispositivos.
- Antes de actualizar con datos reales, exportar respaldo JSON y verificar la restauración en un entorno de prueba.

---

# Mi Control Financiero · PWA v0.9.0 — Respaldos históricos y modularización

## Historial de Google Drive
- Al sincronizar una modificación sobre el archivo principal cifrado, el sistema intenta guardar antes una **copia cifrada del respaldo anterior**. Se conserva una copia por día, en el espacio privado de datos de aplicación de Google Drive.
- No se eliminan copias antiguas automáticamente. Las versiones ocupan espacio de tu cuota gratuita de Drive, por lo que conviene revisar el almacenamiento disponible.
- Si no puede completarse el archivado previo, la escritura sobre el respaldo principal se cancela y los datos nuevos permanecen localmente. La interfaz solicita revisar Drive y reconectar.
- **Ajustes → Historial de copias:** consulta versiones, revisa una y, con confirmación explícita, restaura el contenido local de una copia descifrada.
- La recuperación puede reemplazar tus datos locales. **Antes de restaurar, exporta un JSON del estado actual** y conserva la contraseña de cifrado.
- No se instala ninguna contraseña bancaria, client secret ni token en GitHub. No se incorporan costos obligatorios de backend.

## Refactorización
- `features/backup/backup-model.js` se encarga de capturar, validar y reemplazar atómicamente los respaldos de IndexedDB. `app.js` coordina las acciones y las vistas, sin reimplementar esas reglas.
- La estructura de IndexedDB permanece en versión 6. El formato de respaldo JSON conserva el esquema 6.
- Se añadieron pruebas automatizadas para validar cifrado, recuperación, archivado preventivo y comportamiento seguro ante un error de archivado.

## Limitaciones conocidas
- Las copias históricas se crean antes de sobrescribir el respaldo y se limitan a **una por día**, no a una por modificación. No reemplazan tu copia JSON independiente.
- Dos sesiones de Drive con modificaciones exactamente simultáneas todavía necesitan control de escritura condicional en el servidor para garantizar ausencia de carreras. La revisión de `revision` reduce riesgos, pero no es un bloqueo transaccional.
- La PWA cerrada no se sincroniza; para recuperar versiones es necesario reconectar y autorizar Google Drive.
- Esta fase no constituye una auditoría externa de penetración ni una restauración verificada en tu cuenta real.

---

# Mi Control Financiero · PWA v0.8.1

La vista de cuenta avisa cuando el dinero reservado en cajitas es mayor que el saldo bancario. Los pagos realizados en la fecha misma del corte se aplican correctamente. No se modifican datos ni estructura de respaldos.

---

# Mi Control Financiero · PWA v0.8.0 — estabilización

## Correcciones de integridad (sin migración de base de datos)
- Comparación integral de instantáneas cifradas en Drive: cuentas, movimientos, preferencias, presupuestos, suscripciones, conciliaciones, auditorías, nómina, cortes, MSI, cajitas y movimientos internos. Una diferencia fuerza revisión del conflicto en vez de mostrar una sincronización engañosa.
- Importación CSV con identidad estable independiente del orden de filas, referencias bancarias preferentes y compatibilidad con importaciones CSV anteriores. Importar un archivo reordenado no debería volver a crear los mismos cargos.
- Los informes JSON mensuales calculan el saldo a la fecha de cierre del mes solicitado. Cuentas todavía no existentes en esa fecha muestran `balance: null`.
- Cuando falta día de corte, la aplicación calcula temporalmente los cargos por mes calendario en lugar de ignorar mensualidades antiguas.
- En el resumen se prioriza la obligación conocida pendiente sobre las proyecciones de MSI cuando hay saldo sin liquidar, para reducir riesgos de contar dos veces una mensualidad ya incluida en la deuda. Los indicadores de deuda contable permanecen independientes.
- Pagos asociados al corte inicial virtual pueden guardarse y restaurarse, incluso cuando el corte no fue creado explícitamente.
- Aviso antes de cambiar la deuda inicial o fecha base de cuentas con movimientos o compromisos y protección al eliminar cuentas con otras referencias.
- Presupuestos excluyen cargos recurrentes que todavía no se han confirmado.
- La PWA no devuelve HTML al buscar archivos JavaScript/CSS sin conexión; solo usa el documento de inicio como alternativa para navegación.

## Compatibilidad y seguridad
- No cambia el esquema IndexedDB (versión 6) ni la estructura del respaldo JSON (esquema 6).
- No almacena datos financieros reales en GitHub.
- Los datos existentes permanecen en el navegador; antes de actualizar conviene exportar un respaldo JSON privado y comprobar sincronización de Drive.
- Las fechas de vencimiento habituales y la atribución provisional sin corte son estimaciones, no fechas confirmadas por el banco.
- Se agregan pruebas de regresión a GitHub Actions para conflictos, CSV, MSI y saldos históricos.

## Pendientes para próximos ciclos
La sincronización con Drive aún necesita control transaccional de modificaciones simultáneas, historial de versiones, pruebas reales en distintos navegadores y flujos completos de conciliación. No interpretes un resultado verde de CI como prueba de recuperación de tus datos reales.

---

# Mi Control Financiero · PWA v0.7.3

## Correcciones del corte inicial y del historial
- **Primer mes automático:** la deuda inicial de cada tarjeta de crédito corresponde al mes de su fecha base. Aparece en el pago de ese corte sin casillas ni confirmaciones adicionales y sin crear compras o aumentar la deuda.
- **Fechas propuestas:** el corte y fecha límite nacen de los días habituales ya configurados, pero pueden modificarse para cada mes cuando se conozcan las fechas reales.
- **Pago editable:** el importe inicial se puede modificar directamente en «Editar corte». Los siguientes cortes usan la estimación de compras y mensualidades si no se ha registrado un monto.
- **Indicador amarillo:** «Pagos de tarjetas pendientes» muestra deudas de cortes que aún no se han liquidado y proyecciones del mes seleccionado, diferenciándolas de compras nuevas.
- **Historial de cortes:** lista con tarjetas compactas, importe, fechas, estado y acciones sin desbordar en móviles.
- **Datos existentes:** conserva ciclos que ya fueron guardados, pago real y sus fechas; no migra ni reescribe movimientos o saldos privados. La lógica reconoce de forma virtual el mes base cuando falta un corte explícito.
- **Pagos:** cada pago de crédito disminuye el saldo contable y el importe pendiente que corresponda. La proyección nunca vuelve a sumar la deuda a patrimonio.
- **Limitación:** las fechas habituales son estimadas hasta que se cotejen con la app bancaria; el importe inicial puede incluir otros conceptos si se anotó así en la cuenta.

---

# Mi Control Financiero · PWA v0.7.1

### Seguridad de la migración
- El respaldo conserva el origen de un corte (si se capturó como deuda inicial) y si las mensualidades anteriores ya estaban incluidas en la deuda. No se pierden estas decisiones al restaurar Google Drive ni JSON.
- No se elimina un corte con pagos vinculados: primero edita los pagos y desvincúlalos.
- El rendimiento de una cajita no puede registrarse antes de su creación ni con una fecha futura.
- Una copia de seguridad válida se puede restaurar aunque, temporalmente, una cuenta haya gastado parte de dinero reservado: se mantiene la discrepancia para corregirla en vez de bloquear la recuperación. Nuevas asignaciones siguen sujetas al saldo disponible.

---

# Mi Control Financiero · PWA v0.7.0

## Cuenta a pantalla completa
Pulsa cualquier cuenta para navegar a una pantalla completa con su saldo, movimientos, detalle y acciones. Para tarjetas de crédito se distinguen **deuda total** y **pago del corte**, y el botón **Pagar** preselecciona el total de deuda, con atajo opcional al pago del corte.

## Cortes y deuda inicial
- El saldo inicial de la tarjeta es una fotografía de deuda total en su fecha base. No es, por sí mismo, el monto exigible en un corte.
- En **Tarjeta → Cortes y mensualidades → Configurar corte**, indica fecha real, límite y monto. Si **todo** el saldo inicial corresponde al corte de ese mes, activa la casilla para proponerlo como pago del corte, sin contabilizarlo nuevamente.
- Los pagos posteriores al saldo base pueden vincularse a un corte en el formulario; los no vinculados se aplican a los cortes más antiguos, sin asignarse más de una vez.
- Para MSI anteriores, elige si ya se encuentran incluidos en tu deuda total. Si sí, solo se planifican; si no, se crea **una única corrección contable** por las mensualidades restantes, sin registrar compras antiguas.
- Editar o eliminar ese compromiso actualiza/revierte su corrección contable en una sola transacción.

## Cajitas dentro de un banco
- Entra a una cuenta de débito o ahorro y selecciona **Crear cajita**. Es una distribución de ese mismo saldo, no otro activo.
- Apartar y retirar dinero entre el disponible y cajitas no crea gastos ni ingresos, solo movimientos internos.
- Los rendimientos reales sí se contabilizan como movimientos de la cuenta y de la cajita.
- Las cuentas de ahorro antiguas se conservan sin alterar; no se trasladan automáticamente por riesgo de doble contabilización.

## Módulos
- `features/accounts/account-page.js` y `account-page.css`: pantalla completa de cuenta.
- `features/cards/credit-row.js`: componente compacto reutilizable para crédito.
- `features/cards/billing.js`: fechas, pagos por ciclo y obligaciones.
- `features/savings/pockets.js` y `pockets-view.js`: saldo interno de cajitas, reglas y vistas.
- `logic.js`: libro de saldos; admite ajustes explícitos de deuda y no los considera compras.
- `storage.js`: migración IndexedDB v5→v6, **sin borrar datos**.
- Respaldo JSON y Google Drive cifrado actualizado al esquema 6.

Antes de usar la nueva versión con datos reales, **exporta un respaldo JSON local**, valida que Drive haya sincronizado y comprueba operaciones con montos pequeños. No borres los datos del navegador.

---

# Mi Control Financiero · PWA v0.6.0

## Cortes bancarios reales, pagos y MSI anteriores
- Abre **Cuentas → tarjeta de crédito → Cortes y mensualidades** o las nuevas alertas del **Resumen**.
- Registra el **mes**, la **fecha real de corte**, la **fecha límite de pago** y, opcionalmente, el **monto oficial** que informa el banco.
- La fecha real prevalece sobre el día de corte habitual para ese mes. Las fechas estimadas quedan etiquetadas como tales.
- Las alertas del inicio muestran el siguiente corte y, si existe un monto oficial del estado de cuenta, el saldo restante orientativo y el tiempo al vencimiento.
- **Pagar tarjeta** abre el formulario con la deuda total estimada precargada. Usa **Pago oficial del corte** para sugerir el importe confirmado; ambos montos se pueden modificar antes de registrar.
- Para gastos a MSI que empezaron antes de usar la app, abre **Cortes y mensualidades → Agregar mensualidad**. Indica el monto mensual y el primer/último mes que aún falta pagar. Es un compromiso proyectado, no una nueva compra.
- **La deuda inicial debe reflejar TODO lo que efectivamente debes en la fecha base, incluidos MSI pendientes.** Las mensualidades anteriores no incrementan esa deuda: solo distribuyen pagos previstos, evitando doble contabilización.
- El importe oficial es el que te presenta el banco; las estimaciones de cargos no lo sustituyen y podrían omitir ajustes, intereses, abonos y compras históricas. Los pagos parciales se estiman por fecha y conviene cotejarlos con el banco.

## Cómo usar Ahorros
1. En **Cuentas → Nueva cajita o ahorro** crea una cuenta tipo **Cajita/Apartado** o **Ahorro** con su saldo inicial si ya tenías fondos.
2. Para apartar dinero usa **Transferencia** desde débito hacia tu cajita. No se cuenta como gasto, solamente traslada dinero entre saldos.
3. Para agregar intereses o rendimiento recibido selecciona **Rendimiento** sobre esa cuenta. Estos importes sí son ganancias.
4. Desde la pantalla **Ahorros** del resumen existen accesos directos a estas acciones.

## Arquitectura y protección de datos
- `features/cards/billing.js`: fechas variables, obligaciones bancarias reales, MSI heredadas y vencimientos.
- `features/cards/billing-view.js`: formularios y alertas por institución.
- `features/cards/billing.css`: estilos exclusivos de tarjetas.
- `logic.js`: incorpora corte real opcional en la asignación por mes y mensualidades heredadas sin alterar saldos.
- `storage.js`: nueva versión local IndexedDB v5, sin eliminar tablas antiguas.
- Respaldo v5 preserva cortes y compromisos personales cifrados en Drive. **No se registran fechas de corte ni importes reales en el repositorio público.**

Antes de ingresar movimientos nuevos, exporta un JSON y verifica que el respaldo de Google Drive esté actualizado. No borres almacenamiento del navegador ni reinstales la PWA para forzar actualizaciones.

---

# Mi Control Financiero · PWA v0.5.1

El importe neto previsto por pago de la cuenta de nómina ahora alimenta el salario previsto mensual en el Resumen e Informes: dos pagos para calendario quincenal o uno mensual. Si el importe previsto de nómina es cero, permanece el importe general de Ajustes. Esto no crea ningún movimiento.

No se registrará un depósito que coincida exactamente en fecha, cuenta y cantidad con un ingreso existente sin clasificar; en ese caso utiliza **Nómina → Clasificar** para evitar dobles registros.

---

# Mi Control Financiero · PWA v0.5.0

## Módulo privado de nómina
1. Abre **Cuentas → Nómina** o **Movimientos → Nómina**.
2. Selecciona la cuenta **de débito** donde recibes tu salario, ajusta si te pagan **quincenalmente** (dos días fijos por mes) o **mensualmente**, fija las fechas y el neto habitual **por pago**.
3. Los pagos previstos son **proyecciones**, no ingresos reales ni movimientos en la cuenta. Presiona **Registrar** al recibir la quincena.
4. Usa los botones de **Fondo de ahorro, Aguinaldo, Prima vacacional, Utilidades, Bono y Otros** para registrar ingresos realmente recibidos. Si el fondo de ahorro se retuvo de la quincena y aún no se deposita, NO registres ese monto como otro ingreso.
5. Puedes clasificar depósitos ya existentes como conceptos de nómina sin duplicarlos.

### Arquitectura
- `features/payroll/payroll.js`: reglas y conceptos, cálculo de fechas de pago, asociación opcional, validación de datos y prevención de pagos duplicados.
- `features/payroll/payroll-view.js`: pantallas y formularios.
- `features/payroll/payroll.css`: estilos.
- `storage.js`: nueva tienda IndexedDB `payrollProfiles` mediante migración no destructiva a v4.
- `app.js`: orquesta flujo y respaldo JSON v4, compatible con lectura de v1/v2/v3. Drive sigue cifrando el contenido en su flujo existente.

Los bancos predeterminados no quedan marcados como cuentas de nómina en el código público; tu elección se conserva solamente en datos privados del navegador o en tu respaldo cifrado de Google Drive. No borres los datos de Chrome al actualizar. Verifica tu respaldo antes de registrar operaciones importantes.

---

# Mi Control Financiero · PWA v0.4.3

El indicador **Estimación para gastar** abre el detalle de Patrimonio, que desglosa dinero líquido, deuda de tarjetas y próximos pagos recurrentes conocidos. Es una referencia conservadora, no una cantidad garantizada; exige cuentas, deudas y movimientos al día.

---

# Mi Control Financiero · PWA v0.4.2

### Resumen más limpio
Se conservan Patrimonio, Ingresos, Compras, Ahorros y Cargos como cantidades principales y botones. Se retiró «Tu dinero en tres respuestas» por redundante; en su lugar se muestra una banda compacta de **Disponible estimado para gastar** con acceso a su explicación. Las suscripciones se gestionan desde la página **Movimientos**, no desde el resumen.

### Selector visual reusable
- `features/ui/account-picker.js`: ventana adaptativa con búsqueda por nombre o banco, miniaturas de tarjetas, tipo de cuenta y selección accesible; está diseñada como mejora progresiva de los `select` existentes.
- `features/ui/account-picker.css`: estilos visuales del selector, separados de reglas financieras.
- Se integra en los formularios de movimientos, transferencias, límites y suscripciones, además de filtros de las gráficas. Los `select` internos continúan recibiendo el valor real y disparando `change` para conservar validaciones y cálculos.
- Si el módulo no carga, no borres los datos del navegador: recarga y revisa el almacenamiento antes de intentar otra cosa.

El disponible estimado no sustituye el saldo bancario ni equivale a una recomendación de gasto. No cambia los datos de las cuentas ni el respaldo de Google Drive.

---

# Mi Control Financiero · PWA v0.4.0

## Arquitectura v0.4.0 y protección de datos
- `logic.js`: saldos, MSI, estados de cuenta, movimientos confirmados
- `features/finance/insights.js`: tendencias, patrimonio y estimación conservadora de dinero disponible
- `features/finance/recurring.js`: reglas mensuales y creación idempotente de movimientos pendientes
- `features/finance/forms.js`: formularios y pantalla de suscripciones / conciliaciones
- `features/dashboard/dashboard.js` y `dashboard.css`: vistas de detalle y gráficas, sin escribir en IndexedDB
- `app.js`: orquestación de formularios y rutas; se seguirá dividiendo en próximos lanzamientos
- `storage.js`: migración de IndexedDB v2 a v3, **sin borrar tiendas anteriores**
- `drive-sync.js`: mismo flujo OAuth y respaldo cifrado; copia ahora incluye las nuevas colecciones

La página de inicio conserva los importes como centro de atención. Toca patrimonio, ingresos, compras, ahorros o cargos para abrir detalles. Se conservan las cinco pestañas inferiores.

### Configuración de saldos iniciales
No registres dinero que ya existía como ingreso del mes. En **Cuentas → tarjeta → Editar cuenta / saldo inicial** escribe el saldo bancario a una fecha de referencia. Si registraste ese mismo dinero como ingreso, revisa y elimina/corrige el movimiento para no duplicarlo. Los movimientos fechados en o antes de la fecha base son históricos y **no aumentan** el saldo; la aplicación advierte esta situación.

### Suscripciones
Desde **Resumen → Administrar suscripciones**, crea una regla de cargo mensual, día, importe y cuenta. La PWA genera un movimiento **pendiente** al abrirse o reactivarse después del vencimiento. Solo cuando confirmas que el cargo aparece en el banco pasa a afectar los saldos y los reportes. Se generan una sola vez por regla y mes. No se afirma que pueda escribir estando cerrada.

### Conciliación y edición
Desde el detalle de una cuenta, abre **Conciliar saldo** para introducir el saldo real. La diferencia se guarda como diagnóstico, sin alterar movimientos. Desde **Movimientos** puedes editar y consultar un historial de cambios.

### Seguridad
Antes de probar la nueva versión con datos importantes, exporta un JSON en Ajustes y comprueba que tu respaldo de Google Drive esté conectado y sea restaurable. No borres almacenamiento de Chrome ni desinstales la PWA para actualizarla. Las suscripciones y conciliaciones se incluyen en el respaldo v3.

---

# Mi Control Financiero · PWA v0.3.2

### Correcciones por institución
- Mercado Pago: chip y NFC alineados entre débito y crédito.
- BBVA: marca geométrica del fondo refinada con trazos CSS.
- Nu: dos gradientes morados más saturados y pequeña muesca lateral.
- BDESA: retirado del catálogo y del nuevo CSV de importación.

**Seguridad de datos:** actualizar código no elimina cuentas locales. Si previamente importaste BDESA por error, revisa primero si tiene movimientos y elimínala manualmente desde la aplicación. No borres los datos del navegador para quitarla.

---

# Mi Control Financiero · PWA v0.3.1

## Diseños bancarios por archivo

- `card-designs.js`: HTML reutilizable para las tarjetas, sin lógica financiera
- `card-designs.css`: estructura compartida (chip, NFC, redes de pago)
- `cards/banks/inbursa.css`: Inbursa
- `cards/banks/mercado-pago.css`: Mercado Pago Débito y Crédito
- `cards/banks/nu.css`: Nu Débito y Crédito
- `cards/banks/bbva.css`: BBVA
- `cards/banks/revolut.css`: Revolut

Los bancos pueden modificarse de forma independiente; al publicar hay que actualizar la versión de caché en `sw.js` y la referencia CSS en `index.html` para que Android obtenga los cambios. Ningún archivo CSS contiene saldos, contraseñas ni movimientos personales.

Ver [vista previa de tarjetas](cards-preview.html). Los logotipos son aproximaciones CSS/texto y **no implican respaldo o afiliación con los emisores**. Las variantes reales pueden cambiar por modelo, emisión y país. Las imágenes personalizadas se guardan localmente y en respaldo, no en el repositorio.

---

# Mi Control Financiero · PWA v0.3

## Arquitectura modular (JavaScript estático compatible con GitHub Pages)

| Módulo | Responsabilidad |
|---|---|
| `logic.js` | Reglas de movimientos, cortes de tarjeta, MSI y saldos |
| `csv.js` | Importación/exportación CSV, validaciones y deduplicación |
| `storage.js` | Apertura de IndexedDB y diagnóstico del almacenamiento |
| `drive-sync.js` | OAuth y sincronización de respaldo cifrado con Drive |
| `card-designs.js` | Identificación de banco, estilos y HTML de tarjetas |
| `card-designs.css` | Diseño visual de las tarjetas, sin cálculos financieros |
| `card-images.js` | Tratamiento de imágenes personalizadas locales |
| `app.js` | Controlador e integración de pantallas y formularios |

Se mantienen módulos JavaScript globales para una PWA estática sin compilación. La arquitectura está separada **por responsabilidades**, como evolución incremental hacia MVC; `app.js` todavía contiene varios controladores y se puede dividir por pantalla en versiones posteriores.

### Importar tus cuentas
1. Abre **Cuentas → Importar cuentas CSV**.
2. Selecciona el archivo CSV privado proporcionado en el chat.
3. Confirma las ocho cuentas. Los saldos y límites marcados en cero significan **pendientes de capturar**, no saldos verificados.
4. Abre una tarjeta, pulsa **Editar cuenta** y personaliza diseño, límite y fecha de corte.

La columna `diseno` es opcional: `auto`, `classic`, `dark`, `gradient` o `light`. La imagen de fondo se personaliza desde la aplicación y **no puede importarse desde CSV**, para evitar introducir imágenes potencialmente enormes o peligrosas como valores de texto.

### Apariencia de tarjetas
Los diseños son interpretaciones CSS de las marcas, no imágenes oficiales ni copias idénticas de una tarjeta emitida. Si quieres reproducir más fielmente tu versión, puedes importar una imagen decorativa PNG/JPG/WebP **que no revele información sensible**, la app la reescala, comprime y guarda junto a la cuenta. No publica esa imagen en GitHub. Tanto los estilos como la imagen quedan en JSON/Drive.

**Antes de importar datos reales**, confirma que el respaldo cifrado y la restauración funcionen desde un dispositivo de prueba.

---

# Mi Control Financiero · PWA v0.2

Aplicación personal instalable en Android, publicada como sitio estático en GitHub Pages. **El código es público; tus datos personales nunca se suben al repositorio.**

## Principales funciones

- Cuentas de débito, ahorro y cajitas; tarjetas de crédito con corte, fecha de pago, límite y MSI.
- Compras atribuidas al mes financiero del corte; cálculos separados de deuda, efectivo y pagos.
- Importación incremental de cuentas y movimientos en CSV, con validaciones y advertencia antes de guardar.
- Tarjetas estilizadas por institución y categorías visuales; límites de presupuesto por tarjeta y categoría.
- Gráfica de categorías, panel financiero, informes y exportación JSON/CSV.
- IndexedDB offline-first, exportación JSON y opción de respaldo cifrado en Google Drive.

## Tu configuración inicial

Los bancos y tarjetas personales se importan mediante un archivo CSV **fuera de este repositorio**. En la app: **Cuentas → Importar cuentas CSV**. No hay saldos iniciales ni límites de crédito precargados. Tras importar, entra en cada tarjeta para definirlos.

Los estados de cuenta en PDF no se procesan automáticamente. Convierte sus transacciones al CSV normalizado (puedes pedírmelo en ChatGPT) y utiliza **Movimientos → Importar movimientos CSV**. Descarga las plantillas en Ajustes.

## Google Drive cifrado

**Si muestra «No se abrió la base de datos local»:** primero entra en Ajustes → Almacenamiento local → **Comprobar almacenamiento sin borrar datos**. El diagnóstico ahora explica si IndexedDB está bloqueado por otra pestaña, si fallaron scripts o si el navegador rechazó la apertura. Cierra otras pestañas/instancias de la PWA y reintenta sin borrar la información. No desinstales ni borres datos del sitio sin un respaldo.


**Solución al error «Cannot read properties of undefined (reading 'connect')»:** actualizar a la v0.2.3, cargar la PWA directamente en Chrome y recargar. Si el componente de Drive no se carga, la aplicación seguirá permitiendo registrar gastos localmente y mostrará un error recuperable. Nunca borres los datos del sitio para forzar una actualización sin exportar primero un respaldo.


Si pulsas **Conectar / recuperar Google Drive** y no aparece una ventana, utiliza Chrome directamente en `https://facu-garcia.github.io/mi-control-financiero/` (no el navegador integrado de otra app). La PWA muestra ahora el motivo del fallo dentro de Ajustes. Revisa que el Client ID esté completo, que su tipo sea **Web application**, que el origen autorizado sea `https://facu-garcia.github.io` y que Drive API esté habilitada. No compartas nunca el Client Secret.


Consulta [docs/GOOGLE_DRIVE.md](docs/GOOGLE_DRIVE.md). **Para uso individual, elige Google Auth Platform → Personal Mode**, con origen JavaScript `https://facu-garcia.github.io`, y habilita Google Drive API en el mismo proyecto. Hay que habilitar Google Drive API y configurar un OAuth Client ID de aplicación web. La sincronización está disponible únicamente durante una sesión activa y autorizada, con conexión a Internet. La contraseña de cifrado no se almacena; **si se pierde, el respaldo es irrecuperable**. Drive no reemplaza los respaldos independientes.

## Desarrollo

Las pruebas se ejecutan con `node test-logic.cjs`, `node test-csv.cjs` y `node test-drive.cjs`. Revisa [CHANGELOG.md](CHANGELOG.md) y [docs/FLUJO_GITHUB.md](docs/FLUJO_GITHUB.md).

## Publicación

Sitio estático sin build: configura GitHub Pages desde **main** y **/(root)**. Al crear nuevas versiones, incrementa `VERSION` en `sw.js` para que el caché pueda actualizarse.

---

# Mi Control Financiero · PWA v0.1

Primera versión de una aplicación personal, móvil y sin servidor para registrar bancos, tarjetas, cajitas, gastos e ingresos. Todo se guarda en la base local **IndexedDB** del navegador. GitHub Pages solo distribuye los archivos del código.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `mi-control-financiero`.
2. Sube **los archivos dentro de esta carpeta** a la raíz del repositorio: `index.html`, `styles.css`, `app.js`, `logic.js`, `sw.js`, `manifest.webmanifest`, el directorio `assets` y `.nojekyll`.
3. Abre **Settings → Pages → Build and deployment**, selecciona **Deploy from a branch**, la rama principal y `/(root)`. Guarda los cambios.
4. Abre la dirección que GitHub indique, normalmente `https://TU-USUARIO.github.io/mi-control-financiero/`.
5. Desde Chrome en Android, usa el menú **⋮ → Agregar a pantalla principal / Instalar aplicación** (la etiqueta depende de la versión del navegador).
6. Abre la PWA, entra en **⚙ Configuración**, fija tu salario previsto y exporta respaldos periódicos.

**Importante:** no subas a GitHub tu archivo de respaldo JSON ni estados de cuenta, documentos o datos financieros. Solo el **código** de la PWA debe estar en el repositorio. Si tu repositorio es público, cualquier persona puede ver ese código, pero los movimientos no se publican por utilizar la aplicación.

## Cómo empezar correctamente

1. En **Cuentas**, registra cada banco, tarjeta, efectivo o cajita.
2. Introduce un **saldo base al cierre de una fecha concreta**. Por defecto, se utiliza ayer.
3. Los movimientos con fecha **posterior** a esa fecha base actualizarán el saldo actual. Los movimientos con fecha **anterior o igual** serán históricos, pero no modificarán el saldo base. Esto permite cargar movimientos antiguos sin duplicar saldos existentes.
4. Al registrar una compra a crédito, selecciona la tarjeta. La aplicación la atribuye al mes de su corte.
5. Si es una compra a MSI, introduce **el precio total de la compra** y el número de meses. La deuda se registra al completo, pero los cargos de cada corte se distribuyen según las mensualidades.
6. Al pagar la tarjeta, registra **Pago de tarjeta** desde la cuenta de débito a la tarjeta. No registra un nuevo gasto.
7. Para mover dinero a ahorros/cajitas, usa **Transferencia** y no Gasto.

## Reglas financieras

- Tarjeta con corte el día 20: compras del 21/oct al 20/nov → **estado de cuenta de noviembre**.
- El mes de corte se denomina **mes financiero**. El mes de pago bancario puede ser diferente.
- Si el día de corte no existe en determinado mes (p. ej., día 31 en febrero), se usa el último día de ese mes.
- **Compras atribuibles al mes:** compra completa en el mes financiero de su adquisición, aun cuando sea MSI. Es una métrica de consumo/compromisos adquiridos.
- **Cargos estimados del corte:** compras ordinarias del periodo + mensualidades de MSI. No son necesariamente el total exacto exigible por el banco, pues faltan intereses, ajustes, saldos anteriores, pagos mínimos y devoluciones.
- **Salidas bancarias:** compras con débito/efectivo + pagos a tarjetas según su fecha real. No incluye transferencias entre cuentas propias.
- **Patrimonio neto:** saldos de cuentas de dinero/ahorro menos deuda de tarjetas. Las cajitas son subconjuntos de tus activos, no se suman dos veces.
- **Salario previsto:** se usa para comparación; solo los ingresos que registres como movimiento se cuentan como recibidos.

## Respaldos y seguridad

- **Configuración → Exportar respaldo completo JSON**: permite restaurar cuentas, operaciones y preferencias en otro navegador/dispositivo.
- **Configuración → Restaurar respaldo JSON**: **reemplaza todos los datos locales** después de pedir confirmación.
- **Informes → Exportar informe JSON o CSV**: crea reportes para analizar en ChatGPT; puedes revisar y compartir solamente lo que desees.
- **Configuración → Solicitar almacenamiento persistente**: el navegador puede conceder o rechazar esta protección adicional. **No sustituye los respaldos**.
- **Los archivos JSON de esta versión no están cifrados.** Guárdalos privados y protegidos; no los envíes por canales públicos.
- No registres contraseñas, NIP, CVV, números completos de cuenta o de tarjeta.
- El almacenamiento **no se sincroniza automáticamente**. Si pierdes el dispositivo, borras el almacenamiento del sitio o cambias el dominio, puedes perder datos no respaldados.
- Si renombraras el repositorio o cambias de dominio, **exporta un respaldo antes y restáuralo en la nueva URL**.

## Funcionalidades iniciales

- Resumen de patrimonio, ingresos, gastos, saldos y deuda.
- Cuentas de débito, efectivo, ahorros y cajitas; tarjetas de crédito con día de corte, límite y día de pago informativo.
- Registro manual de ingresos, gastos, transferencias, pagos a tarjeta y rendimientos.
- Compras a MSI y proyección de mensualidades a 6 meses.
- Histórico por mes financiero y filtros por tipo de movimiento.
- Informes por categorías, cargos de corte y flujo de efectivo real.
- Respaldo JSON, restauración y exportación JSON/CSV mensual.
- Uso offline tras cargar/instalar correctamente desde GitHub Pages (service worker).

## Pendientes para una futura versión

- Importación asistida de estados de cuenta (CSV/PDF) con deduplicación y revisión.
- Edición directa de movimientos, conciliación bancaria y ajustes/devoluciones.
- Facturación más exacta con saldo anterior, pago para no generar intereses y fechas de vencimiento por periodo.
- Alertas, suscripciones, presupuestos y metas de ahorro automáticas.
- Cifrado del respaldo (p. ej., AES-GCM con contraseña), bloqueo de la app y sincronización opcional.
- Más gráficos y comparativas mes contra mes.

## Pruebas de lógica

Se incluyen `test-logic.cjs` para comprobar periodos de corte, meses, MSI, saldos, transferencias, pagos y mensualidades.

```bash
node test-logic.cjs
```

Nota: esta versión se probó con Node.js a nivel de sintaxis y reglas financieras, pero no se realizó una prueba visual real en Android. Usa primero datos de prueba y revisa que los saldos coincidan con tus bancos antes de depender de ella.

## Desarrollo, pruebas y control de versiones en GitHub

- [Pruebas automáticas](.github/workflows/checks.yml) mediante GitHub Actions.
- [Historial de versiones](CHANGELOG.md).
- [Guía de commits y publicaciones](docs/FLUJO_GITHUB.md).
- En nuevas versiones, actualizar `VERSION` en `sw.js` para invalidar el caché anterior.
- Probar con datos ficticios antes de registrar información financiera real.
