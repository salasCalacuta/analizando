# Analizando.Version1.68

Esta es la versión 1.68 de la aplicación "Analizando".

## Cambios Recientes

- **Renombrado del Proyecto:** Actualizado a Analizando.Version1.68.
- **Formateo de fechas:** Ajuste a formato dd/mm/yy en todos los campos.
- **Mejoras estéticas:** Títulos centrados y redimensionados, botones de menú con borde celeste.
- **Footer:** Actualización de versión y copyright.
- **Correcciones previas:**
- **Corrección de Login de Pacientes:** Se corrigió el error de validación de ID/Clave en el login de pacientes.
- **Corrección de Edición de Pacientes:** Ahora se actualiza el paciente existente en lugar de crear uno nuevo.
- **Validación de ID Profesional:** Se restringió el ID de acceso de profesionales a un máximo de 3 letras y 3 números.
- **Videollamadas:** Se ha hecho consistente el nombre de la sala Jitsi para que esté linkeado directamente a la cuenta del paciente.
- **Panel de Paciente:** Se agregó la carga de token y se integró con la validación de comprobante para habilitar videollamadas.
- **Panel Profesional:** Se muestra la información del token y comprobante del paciente para habilitar la videollamada.
- **Integración con Supabase:** Migración de datos a Supabase para persistencia en la nube.
- **Notificaciones Push:** Implementación de alertas para turnos próximos.
- **Validación de Turnos:**
    - Se impide la sobreescritura de turnos ya asignados.
    - Se eliminan automáticamente turnos puntuales si se agenda uno no puntual en la misma hora.
- **Exportación de Credenciales:** Funcionalidad para exportar usuarios y claves.
