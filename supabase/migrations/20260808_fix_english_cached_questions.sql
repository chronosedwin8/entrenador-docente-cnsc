-- =============================================================================
-- LIMPIEZA: preguntas en inglés que quedaron cacheadas por error
-- =============================================================================
-- CONTEXTO DEL BUG
-- En generate-questions, la rama que decide el "modo" de la prueba evaluaba:
--     competency !== 'Pedagógica'
-- pero el valor real del enum es 'Competencias Pedagógicas'. Por eso, para los
-- docentes del área 'Idioma Extranjero Inglés', las Competencias Pedagógicas
-- (y cualquier competencia no contemplada) caían en la rama DISCIPLINAR y se
-- generaban EN INGLÉS.
--
-- Esas preguntas quedaron guardadas en questions_bank; aunque el código ya está
-- corregido, el caché las seguiría entregando. Ejecuta este script COMPLETO.
--
-- NOTA: se usa LIKE 'Idioma Extranjero Ingl%' en vez de '=' para que la
-- comparación no falle por diferencias de codificación del acento en "Inglés".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1 (DIAGNÓSTICO): mira qué hay realmente en el caché.
-- Ejecuta primero esto y revisa el resultado antes de borrar.
-- -----------------------------------------------------------------------------
SELECT
  role,
  area,
  competency,
  count(*) AS total
FROM public.questions_bank
GROUP BY role, area, competency
ORDER BY area, competency;

-- -----------------------------------------------------------------------------
-- PASO 2 (BORRADO): elimina TODO el caché del área de Inglés.
--
-- Se borra todo (incluida 'Conocimientos Específicos') para garantizar que no
-- quede ninguna pregunta contaminada. Las de Conocimientos Específicos se
-- regenerarán en inglés (correcto) y las demás en español, ya con el código
-- corregido. Es la opción más segura.
-- -----------------------------------------------------------------------------
DELETE FROM public.questions_bank
WHERE area LIKE 'Idioma Extranjero Ingl%';

-- -----------------------------------------------------------------------------
-- PASO 3 (RED DE SEGURIDAD): elimina cualquier pregunta cacheada cuyo contenido
-- esté en inglés pero NO sea de Conocimientos Específicos, sin importar el área.
-- Cubre el caso de que el área se haya guardado con otro valor.
-- -----------------------------------------------------------------------------
DELETE FROM public.questions_bank
WHERE (competency IS NULL OR competency <> 'Conocimientos Específicos')
  AND (
        content::text ILIKE '%Pedagogical Competencies%'
     OR content::text ILIKE '%A primary school teacher%'
     OR content::text ILIKE '%the teacher must%'
     OR content::text ILIKE '%Which of the following%'
     OR content::text ILIKE '%According to Decreto%'
  );

-- -----------------------------------------------------------------------------
-- PASO 4 (VERIFICACIÓN): no debe quedar nada del área de Inglés.
-- -----------------------------------------------------------------------------
SELECT
  area,
  competency,
  count(*) AS preguntas_restantes
FROM public.questions_bank
WHERE area LIKE 'Idioma Extranjero Ingl%'
GROUP BY area, competency;
