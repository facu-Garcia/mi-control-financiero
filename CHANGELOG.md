# Historial de cambios

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
