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
