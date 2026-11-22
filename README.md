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
