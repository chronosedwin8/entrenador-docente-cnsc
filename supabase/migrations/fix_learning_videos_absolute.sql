-- =================================================================
-- FIX FINAL: REPARACIÓN ABSOLUTA DE PERMISOS PARA VIDEOS
-- Ejecuta este script en Supabase para solucionar el error 42710
-- =================================================================

-- 1. Bloque anónimo para borrar TODAS las políticas existentes de learning_videos
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'learning_videos' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON learning_videos', pol.policyname); 
    END LOOP; 
END $$;

-- 2. Asegurar RLS habilitado
ALTER TABLE learning_videos ENABLE ROW LEVEL SECURITY;

-- 3. Crear las nuevas políticas (limpias)

-- A) Permitir LECTURA a todos los usuarios autenticados
CREATE POLICY "Enable read access for authenticated users" ON learning_videos
  FOR SELECT TO authenticated USING (true);

-- B) Permitir GESTIÓN (Insertar, Actualizar, Borrar) a usuarios autenticados
CREATE POLICY "Enable full access for authenticated users" ON learning_videos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Asegurar columna display_order y rellenar nulos
ALTER TABLE learning_videos ADD COLUMN IF NOT EXISTS display_order INTEGER;

WITH ordered_videos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM learning_videos
  WHERE display_order IS NULL
)
UPDATE learning_videos lv
SET display_order = ov.row_num
FROM ordered_videos ov
WHERE lv.id = ov.id;
