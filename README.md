# Analizando.Version1.66

Esta es la versión 1.66 de la aplicación "Analizando".

## Cambios Recientes

- **Renombrado del Proyecto:** Actualizado a Analizando.Version1.66.
- **Videollamadas:** Se ha hecho consistente el nombre de la sala Jitsi para que esté linkeado directamente a la cuenta del paciente.
- **Panel de Paciente:** Se agregó la carga de token y se integró con la validación de comprobante para habilitar videollamadas.
- **Panel Profesional:** Se muestra la información del token y comprobante del paciente para habilitar la videollamada.
- **Integración con Supabase:** Migración de datos a Supabase para persistencia en la nube.
- **Notificaciones Push:** Implementación de alertas para turnos próximos.
- **Validación de Turnos:**
    - Se impide la sobreescritura de turnos ya asignados.
    - Se eliminan automáticamente turnos puntuales si se agenda uno no puntual en la misma hora.
- **Exportación de Credenciales:** Funcionalidad para exportar usuarios y claves.
