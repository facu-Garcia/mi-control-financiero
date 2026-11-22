# Google Drive cifrado — configuración personal (PWA)

## Objetivo y costo
La app se ejecuta en GitHub Pages y guarda primero sus datos en IndexedDB. Cuando está abierta, en línea y autorizada, crea/actualiza un respaldo JSON **cifrado** en Google Drive `appDataFolder`. La API de Drive permite uso estándar sin costo adicional y, en este diseño personal, no requiere base de datos ni servidor de pago. No actives facturación ni añadas tarjeta bancaria para este proyecto.

## 1. Crear una credencial OAuth en Personal Mode
1. Entra a **https://console.cloud.google.com/auth/overview/personal** con la cuenta Google que utilizarás para respaldar tus finanzas.
2. Crea o selecciona un proyecto **Personal Mode**. Este modo está destinado a una sola cuenta Google y no se puede convertir a External/Internal; si en el futuro compartes la app, necesitarás otro proyecto.
3. Selecciona **Web application**, no Android (la PWA es una aplicación web).
4. En **Authorized JavaScript origins** registra exactamente **https://facu-garcia.github.io** (sin la ruta `/mi-control-financiero/`, sin barra final).
5. Nuestro cliente usa una ventana emergente `initTokenClient`, por lo que no necesita configurar una URI de redirección para esta implementación.
6. Termina el asistente y copia **solo OAuth Client ID**, normalmente terminado en `.apps.googleusercontent.com`. **Nunca publiques ni pegues un client secret.**
7. Si usas un proyecto que ya es External, no podrás cambiarlo a Personal; crea un proyecto Personal nuevo.

Fuente oficial para Personal Mode: https://support.google.com/cloud/answer/15544987

## 2. Activar Drive API
1. En el mismo proyecto, abre **https://console.cloud.google.com/apis/library/drive.googleapis.com**.
2. Verifica que se muestre **Google Drive API**, y presiona **Enable / Habilitar** si está deshabilitada.
3. No necesitas habilitar APIs de pagos ni crear credenciales de cuenta de servicio.

Permiso mínimo que usa el código: `https://www.googleapis.com/auth/drive.appdata`. Este permiso está clasificado como no sensible por Google y solo permite acceder a la carpeta de datos de esta app.

## 3. Conectar la PWA
1. Abre **https://facu-garcia.github.io/mi-control-financiero/** en Chrome.
2. Toca **⚙ Ajustes → Google Drive cifrado**.
3. Pega el **OAuth Client ID** de la aplicación web.
4. Elige una contraseña de cifrado **distinta de tu contraseña de Google**, de al menos 12 caracteres, y guárdala en tu gestor de contraseñas. La app no la almacena.
5. Toca **Conectar / recuperar Google Drive**.
6. Autoriza con **la misma cuenta Google que creó el proyecto Personal Mode**.
7. Espera a que el estado muestre **Sincronizado · Drive protegido**.
8. Haz primero una prueba con **datos ficticios**, por ejemplo una cuenta y una compra. Comprueba que se sincroniza y que puedes recuperar desde otro navegador de prueba antes de cargar datos reales.

No es necesario pasar por la pantalla de «usuarios de prueba» de External/Testing si creaste un proyecto Personal Mode.

## ¿Dónde está el archivo en Google Drive?
Se guarda en la carpeta especial **appDataFolder**: **no aparece en la interfaz normal de «Mi unidad»**. La PWA lo consulta a través de Drive API. Si quieres un respaldo visible y descargable desde Drive, se necesita un flujo alternativo usando otro scope, permisos y diseño.

## Límites y seguridad
- La PWA sincroniza al registrar cambios **solo cuando está abierta, conectada, autorizada y en línea**. Si la cierras o expira el token, vuelve a conectar.
- Sin conexión, los cambios permanecen en IndexedDB y se envían después de reconectar, sujeto a resolución de conflictos.
- Si el respaldo remoto y la copia local difieren, la app no mezcla movimientos automáticamente: te solicita conservar una versión. Exporta antes una copia local para evitar perder registros.
- La copia de Drive está cifrada en el navegador con AES-GCM y clave derivada de tu contraseña con PBKDF2. **Perder la contraseña de cifrado significa perder el acceso al respaldo.**
- El sistema actual conserva una copia remota activa, no copias históricas. Mantén respaldos alternativos; Drive no es un sistema de control de versiones financiero.
- No almacenes CSV personales, PDF bancarios, contraseñas, respaldos ni tokens en GitHub.
- Personal Mode permite autorizar exclusivamente al creador del proyecto; no sirve para distribuir la aplicación a otras cuentas Google.
- El uso estándar de Drive API no tiene costo adicional según Google, pero las políticas y cuotas pueden cambiar; no habilites facturación para este proyecto.
- Si aparece `origin_mismatch`, verifica el origen **https://facu-garcia.github.io**; si aparece `access_denied`, verifica la cuenta Google y el tipo Personal Mode; si aparece `Google Drive respondió 403`, verifica que Drive API esté habilitada en el mismo proyecto del Client ID.

## Documentación oficial
- Personal Mode: https://support.google.com/cloud/answer/15544987
- Crear cliente OAuth: https://developers.google.com/workspace/guides/create-credentials
- Activar APIs: https://developers.google.com/workspace/guides/enable-apis
- Carpeta appDataFolder: https://developers.google.com/workspace/drive/api/guides/appdata
- Cuotas y precios: https://developers.google.com/workspace/drive/api/guides/limits
