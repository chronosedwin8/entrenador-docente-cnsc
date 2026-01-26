# Plan de Implementación - Integración de Pagos con Wompi

> **Estado**: ✅ IMPLEMENTACIÓN COMPLETADA (10 de Enero de 2026)  
> **Ambiente Actual**: Sandbox (Pruebas)

---

## 📋 Resumen Ejecutivo

Se ha implementado la integración completa de la pasarela de pagos **Wompi de Bancolombia** para la plataforma Entrenador Docente CNSC. La integración permite:

- ✅ Pago dinámico in-app mediante Widget de Wompi
- ✅ Activación automática de usuarios al aprobar pagos (vía webhook)
- ✅ Soporte para todos los métodos de pago (Tarjetas, Nequi, PSE, Bancolombia QR)
- ✅ Integración con el sistema de precios dinámicos (incluye opción de Entrevista)
- ✅ Registro completo de transacciones para auditoría

---

## 🗂️ Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260110_create_transactions_table.sql` | Migración de tabla de transacciones |
| `supabase/functions/create-payment-intent/index.ts` | Edge Function para crear intención de pago |
| `supabase/functions/wompi-webhook/index.ts` | Edge Function para recibir webhooks de Wompi |
| `components/WompiButton.tsx` | Componente de botón de pago con Wompi |
| `deploy-wompi.ps1` | Script de despliegue |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `index.html` | Agregado script del Widget de Wompi |
| `components/PlansView.tsx` | Reemplazados links estáticos por WompiButton dinámico |
| `App.tsx` | Pasando userId a PlansView |

---

## ⚙️ Configuración Requerida

### 1. Variables de Entorno Frontend (`.env.local`)

```bash
# Agregar estas líneas:
VITE_WOMPI_PUBLIC_KEY=pub_test_WzcVDVC12mUQX9BYFQp0hdJnIS69a9Xl
```

### 2. Secrets de Supabase (Backend)

Ejecutar los siguientes comandos:

```bash
supabase secrets set WOMPI_PRIVATE_KEY=prv_test_Jl8PEX6z5g75JQOn3kej52zxuMFmqgvZ --project-ref ipostjjiabsmunnewolt
supabase secrets set WOMPI_EVENTS_SECRET=test_events_EkmH1D9sKpjO3PRlsZuaVZ6EFxXbVzxR --project-ref ipostjjiabsmunnewolt
supabase secrets set WOMPI_INTEGRITY_SECRET=test_integrity_L8R3etJdejhepuVwwxhptc0jjTkDsIxJ --project-ref ipostjjiabsmunnewolt
supabase secrets set WOMPI_ENVIRONMENT=sandbox --project-ref ipostjjiabsmunnewolt
```

### 3. Desplegar Edge Functions

```bash
# Desde la carpeta del proyecto
supabase functions deploy create-payment-intent --project-ref ipostjjiabsmunnewolt
supabase functions deploy wompi-webhook --project-ref ipostjjiabsmunnewolt --no-verify-jwt
```

> ⚠️ **IMPORTANTE**: El webhook debe desplegarse con `--no-verify-jwt` para que Wompi pueda enviar eventos sin autenticación JWT.

### 4. Aplicar Migración de Base de Datos

**Opción A - Via CLI:**
```bash
supabase db push --project-ref ipostjjiabsmunnewolt
```

**Opción B - Via Dashboard SQL Editor:**
Copiar el contenido de `supabase/migrations/20260110_create_transactions_table.sql` y ejecutar en el SQL Editor de Supabase.

### 5. Configurar Webhook en Panel Wompi

Ya configurado ✅ en: `https://ipostjjiabsmunnewolt.supabase.co/functions/v1/wompi-webhook`

---

## 🔐 Credenciales de Prueba (Sandbox)

### Llaves del API
- **Llave pública**: `pub_test_WzcVDVC12mUQX9BYFQp0hdJnIS69a9Xl`
- **Llave privada**: `prv_test_Jl8PEX6z5g75JQOn3kej52zxuMFmqgvZ`

### Secretos de Integración
- **Eventos**: `test_events_EkmH1D9sKpjO3PRlsZuaVZ6EFxXbVzxR`
- **Integridad**: `test_integrity_L8R3etJdejhepuVwwxhptc0jjTkDsIxJ`

### Datos de Prueba

| Método | Para APROBAR | Para RECHAZAR |
|--------|--------------|---------------|
| **Tarjeta** | `4242 4242 4242 4242` (CVV: 123, Exp: 12/28) | `4111 1111 1111 1111` |
| **Nequi** | `3991111111` | `3992222222` |
| **PSE** | Banco que aprueba | Banco que rechaza |

---

## 📊 Impacto en el Proyecto

### Impacto en Base de Datos

| Aspecto | Impacto | Detalle |
|---------|---------|---------|
| Nueva tabla | ✅ BAJO | `transactions` - Solo aditiva, no modifica tablas existentes |
| Datos existentes | ✅ NULO | No se modifican usuarios ni simulaciones |
| RLS | ✅ BAJO | Políticas solo para la nueva tabla |
| Downtime | ✅ CERO | Migración online sin reinicio |

### Impacto en Usuarios Actuales

| Aspecto | Antes | Después |
|---------|-------|---------|
| Flujo de Pago | Link externo → Activación manual | Modal in-app → **Activación automática** |
| Tiempo de activación | Horas/días | **Segundos** |
| Usuarios existentes | Sin cambios | Sin cambios (solo afecta nuevos pagos) |

### Impacto en Producción

| Componente | Riesgo | Mitigación |
|------------|--------|------------|
| Frontend | ✅ BAJO | WompiButton es aditivo, no rompe funcionalidad existente |
| Backend | ✅ BAJO | Edge Functions nuevas, no afectan las existentes |
| Base de Datos | ✅ NULO | Tabla nueva, sin modificar esquema existente |
| Rollback | ✅ FÁCIL | Revertir PlansView a usar links estáticos |

---

## ⏱️ Tiempo de Implementación

| Fase | Estado | Tiempo |
|------|--------|--------|
| Diseño y análisis | ✅ Completado | 2h |
| Migración BD | ✅ Código listo | 30min (aplicar) |
| Edge Functions | ✅ Código listo | 30min (desplegar) |
| Frontend | ✅ Modificado | 3h |
| Testing Sandbox | ⏳ Pendiente | 2h |
| Despliegue Producción | ⏳ Pendiente | 1h |

**Total estimado para completar**: 4-6 horas adicionales (pruebas y despliegue)

---

## 🧪 Plan de Pruebas

### Fase 1: Probar Edge Functions

1. **create-payment-intent**
   ```bash
   curl -X POST https://pwhborqdpwmsgkddkjek.supabase.co/functions/v1/create-payment-intent \
     -H "Authorization: Bearer <JWT>" \
     -H "Content-Type: application/json" \
     -d '{"planName":"intermedio","userId":"<user-id>","includesInterview":false}'
   ```

2. **wompi-webhook** (simular evento)
   ```bash
   curl -X POST https://pwhborqdpwmsgkddkjek.supabase.co/functions/v1/wompi-webhook \
     -H "Content-Type: application/json" \
     -d '{"event":"transaction.updated","data":{"transaction":{"id":"test","reference":"PAY_xxx_123","status":"APPROVED","amount_in_cents":18000000}}}'
   ```

### Fase 2: Prueba End-to-End

1. Iniciar sesión como usuario free
2. Ir a PlansView
3. Seleccionar plan Intermedio
4. Usar tarjeta de prueba `4242 4242 4242 4242`
5. Verificar:
   - ✅ Toast de éxito aparece
   - ✅ Página se recarga
   - ✅ Usuario tiene `subscription_tier = 'premium'`
   - ✅ `transactions.status = 'APPROVED'`

---

## 🚀 Pasos Siguientes

1. [ ] **Aplicar migración de base de datos**
2. [ ] **Configurar secrets en Supabase** (ejecutar comandos del script)
3. [ ] **Agregar variable VITE_WOMPI_PUBLIC_KEY a `.env.local`**
4. [ ] **Desplegar Edge Functions**
5. [ ] **Probar flujo completo en Sandbox**
6. [ ] **Cambiar a llaves de PRODUCCIÓN cuando esté listo**

---

## 📞 Soporte

Para problemas con la integración:
- [Documentación Wompi](https://docs.wompi.co/docs/colombia/)
- [Panel de Comercios](https://comercios.wompi.co)
- Logs de Edge Functions: Dashboard Supabase → Edge Functions → Logs
