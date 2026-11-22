# Google Drive cifrado — configuración de la PWA

## Qué se guarda

Se almacena **un archivo cifrado JSON** en `appDataFolder` de Drive. No aparece entre los archivos normales de Mi unidad. No se sube ningún dato personal a GitHub. La app guarda localmente en IndexedDB, y mantiene una copia cifrada en Drive.

## Activación personal (requiere Google Cloud)

1. Abre https://console.cloud.google.com/ y crea o selecciona un proyecto propio.
2. En **APIs & Services > Library**, habilita **Google Drive API**.
3. Configura la **OAuth consent screen**. Para uso personal, selecciona la audiencia/usuario de prueba correspondiente y agrega tu dirección de Google como tester si Google te lo solicita.
4. En **Clients / Credentials**, crea un **OAuth Client ID** del tipo **Web application**.
5. En **Authorized JavaScript origins**, registra exactamente `https://facu-garcia.github.io` (sin ruta del repositorio).
6. Copia **solo el OAuth Client ID** (suele terminar en `.apps.googleusercontent.com`). Nunca agregues un client secret a GitHub o al JavaScript.
7. Abre la PWA desde GitHub Pages, entra en **Ajustes → Google Drive cifrado**, pega el Client ID e introduce una **contraseña de cifrado de 12 caracteres o más** (guárdala en un gestor de contraseñas).
8. Toca **Conectar / recuperar Google Drive**, inicia sesión y otorga el permiso limitado a archivos de datos de la aplicación.
9. Confirma que el estado de Drive diga **Sincronizado** después de registrar un movimiento.
10. Comprueba la recuperación en una copia de prueba antes de usar información financiera real.

La PWA no puede crear ni configurar tu proyecto de Google Cloud de forma autónoma. El ID de cliente OAuth **no es secreto**, pero un client secret sí lo es.

## Comportamiento y límites

- La sincronización ocurre **cuando la PWA está abierta, autorizada y en línea**, aproximadamente después de cada cambio. No puede garantizarse con la app cerrada o sin conexión.
- Si el token expira o se pierde la sesión, pulsa **Conectar** nuevamente para continuar; los cambios quedan locales.
- Si las versiones local y remota difieren, la app **pausa la sincronización y solicita resolver el conflicto**. No intentes editar simultáneamente desde varios celulares: Drive no es una base de datos transaccional, y este protocolo no ofrece bloqueo distribuido estricto.
- El respaldo se cifra en el dispositivo con **AES-GCM 256** y una clave derivada por **PBKDF2-SHA256**. Si pierdes la contraseña, no podremos recuperar el respaldo cifrado.
- Drive tiene **una copia activa**, no un historial de versiones dentro de la aplicación. Exporta JSON adicional, guárdalo cifrado y verifica restauraciones periódicamente. No utilices las exportaciones JSON sin cifrar para compartir datos sensibles.
- Google puede solicitar verificación de la aplicación según los ajustes de la pantalla de consentimiento y el tipo de uso.
- El repositorio público jamás debe contener CSV privados, estados de cuenta, respaldos ni contraseñas.

## Referencias

- [Google Drive appDataFolder](https://developers.google.com/workspace/drive/api/guides/appdata)
- [Google Identity Services: authorization](https://developers.google.com/identity/oauth2/web/guides/overview)
- [Google Drive API JavaScript quickstart](https://developers.google.com/workspace/drive/api/quickstart/js)
