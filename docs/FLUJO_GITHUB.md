# Flujo de trabajo de GitHub

## Primera publicación
1. Crear un repositorio independiente `mi-control-financiero`.
2. Subir el contenido de la carpeta a la rama `main`.
3. Confirmar que GitHub Actions ejecutó correctamente `Verificación de la PWA`.
4. En **Settings → Pages**, configurar **Deploy from a branch → main → /(root)**.
5. Abrir la URL de GitHub Pages y probar con **datos ficticios**.
6. Instalar la PWA desde Chrome en Android cuando esté lista.

## Actualizaciones con commits
1. Elegir una corrección o nueva funcionalidad.
2. Modificar únicamente los archivos correspondientes.
3. Actualizar pruebas y `CHANGELOG.md`.
4. Incrementar `VERSION` de `sw.js` al publicar cambios en la PWA.
5. Generar un commit con mensaje descriptivo.
6. Verificar GitHub Actions y la URL desplegada.
7. Comprobar que la app instalada recibe la nueva versión.

## Convención de commits
- `feat(...)`: nueva funcionalidad.
- `fix(...)`: corrección de bug.
- `docs: ...`: documentación.
- `refactor(...)`: código interno sin cambio funcional.
- `test(...)`: pruebas.
- `chore(...)`: mantenimiento, configuración, caché.

## Privacidad y seguridad
- Nunca agregar estados de cuenta, saldos personales, copias JSON o datos bancarios reales al repositorio.
- El código de GitHub Pages es público, pero los datos almacenados en IndexedDB permanecen en el navegador.
- Respaldar antes de modificar estructura de datos, dominio o ruta.
- Verificar importación y exportación antes de depender de la app con datos reales.

## Criterios de aceptación
- Pruebas automáticas en verde.
- Carga móvil, reinicio y comportamiento sin conexión comprobados.
- Se puede registrar y consultar una cuenta y un gasto.
- Corte del día 20: el 21 de octubre pertenece al estado de cuenta de noviembre.
- Compras MSI y pagos sin doble contabilización.
- Exportación y restauración de respaldo funcionales.
