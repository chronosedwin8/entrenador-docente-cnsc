# Informe de Implementación: Agente de Voz ElevenLabs (Entrevista)

## 1. Resumen Ejecutivo
Se implementará un nuevo módulo "Entrevista" accesible para usuarios Premium, que permite realizar un simulacro de entrevista con un agente de IA (ElevenLabs). El sistema incluirá controles estrictos de uso (frecuencia mensual, tiempo límite por sesión) y herramientas de administración para gestionar la disponibilidad de la funcionalidad.

## 2. Detalles de Implementación

### 2.1. Experiencia de Usuario (UX/UI)
- **Acceso**: Se añadirá una nueva pestaña "Entrevista" en el menú lateral, visible exclusivamente para usuarios con suscripción **Premium**.
- **Pantalla de Inicio (Pre-Entrevista)**:
    - Al ingresar, el usuario verá una pantalla informativa con una advertencia clara: *"Este es un simulacro de entrevista. Solo tienes acceso a una (1) sesión por mes. Asegúrate de estar listo antes de iniciar."*
    - Se mostrará la fecha de disponibilidad si el usuario ya gastó su cupo del mes.
- **Modal de Entrevista**:
    - Al confirmar el inicio, se abrirá una ventana emergente (Pop-up).
    - **Temporizador Visible**: Un contador regresivo mostrará el tiempo restante, iniciando en **05:50** minutos.
    - **Cierre Automático**: Al llegar a 00:00, el modal se cerrará automáticamente y se redirigirá al usuario al resumen o menú principal, finalizando la sesión.
- **Widget**: Se integrará el componente `<elevenlabs-convai>` proporcionado.

### 2.2. Panel de Administrador
- Se agregará una nueva sección de "Configuración del Sistema" en el Panel de Admin.
- **Interruptor Global**: Permitirá habilitar o deshabilitar el acceso al módulo de Entrevistas para *todos* los usuarios (incluso Premium).
    - *Estado por defecto*: **Desactivado**.

## 3. Arquitectura Técnica

### 3.1. Base de Datos (Supabase)
Se crearán dos nuevas estructuras:
1.  **Tabla `app_settings`** (o similar): Almacenará configuraciones globales del sistema (ej. `interview_feature_enabled`).
2.  **Tabla `interview_logs`**: Registrará el historial de uso.
    - Campos: `id`, `user_id`, `created_at`.
    - Propósito: Validar si el usuario ha realizado una entrevista en los últimos 30 días.

### 3.2. Lógica de Negocio
- **Frontend**: Controlará el temporizador y el cierre del modal.
- **Backend (Validación)**: Antes de permitir la carga del Widget, se verificará en `interview_logs` si existe un registro del usuario en el mes actual.

## 4. Impacto sobre el Proyecto

### 4.1. Impacto Positivo
- **Valor agregado Premium**: Aumenta significativamente el atractivo del plan Premium con una herramienta de práctica de alto valor.
- **Diferenciación**: Posiciona la plataforma como una herramienta tecnológicamente avanzada frente a competidores.

### 4.2. Consideraciones y Riesgos
- **Consumo de API**: ElevenLabs cobra por uso/tiempo. Limitar a 5:50 minutos y 1 vez al mes es crucial para controlar costos.
    - *Mitigación*: El límite es estricto en el frontend y se registra en backend.
- **Seguridad del Agent ID**: Al ser una integración de frontend (widget JS), el ID del agente es visible en el código fuente del navegador.
    - *Nota*: Esto es estándar para widgets públicos.
- **Experiencia Móvil**: El modal y el widget deben ser responsivos para no afectar la experiencia en celulares.
