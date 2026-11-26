# Plan de Reestructuración del Flujo de Reformas e Histórico Normativo — SmartLex Ecuador

> **Propósito de este documento:** Permitir retomar exactamente donde nos quedamos al abrir el proyecto unificado `SmartLexEc`, sin perder el diagnóstico ni las decisiones ya acordadas.
>
> **Cómo continuar en un nuevo chat dentro de `SmartLexEc`:**
> Pide al asistente: *"Lee `PLAN_REESTRUCTURACION_HISTORICO.md` y empecemos con el Paso 1."*

---

## 1. Contexto ya completado (LRTI vigente)

* **Proyecto Supabase:** `kqtjxkblebdcgrepfajh` (`LRTI norm_id = 8277f2f4-8f38-4c9f-a033-7b05d240e24a`).
* **Versión vigente (abril 2026):** Los **260 nodos vigentes** (`is_current = true`) y las **14 tablas vigentes de 2026** ya quedaron 100% estandarizados y verificados contra `docs_normativa/HistoriaLeyRegimenTributario/LRTI202604.pdf`, incluyendo la corrección de numeración de los 29 artículos innumerados / `Art. 97.1` / `Art. 107-A..107-D`.
* **Workflow activo en n8n:** `SmartLex - Ingesta Juridica PDF y Extraccion IA` (ID: `dq7qOSDD9lAFPFGM`, 26 nodos).
* **Insumos ya guardados en Supabase (no hace falta re-leer los 87 PDFs con Gemini desde cero):**
  * `documents`: 87 Registros Oficiales procesados (almacenados en Supabase Storage / Google Drive).
  * `norms` / `normative_structures`: las normas reformatorias (ej. `LEY-2007-242`, `NAC-DGER2006-0843`) ya tienen sus artículos reformatorios literales extraídos en Supabase.
  * `docs_normativa/HistoriaLeyRegimenTributario/`: contiene PDFs consolidados `36`–`60` (2004–2013) **solo como referencia de verificación** (la fuente oficial del histórico son los Registros Oficiales).

---

## 2. Diagnóstico del problema detectado en el histórico de la LRTI

Al auditar la secuencia histórica del **Art. 36** y del resto de la LRTI (`711` versiones históricas) se detectaron fallos sistémicos en la aplicación de reformas:

1. **Reescritura / parafraseo en reformas de solo tabla (ej. 2S R.O. 427 de 29-dic-2006, `v8`):**
   * Aunque la resolución del SRI solo actualizaba la tabla tarifaria de 2007, la IA reescribió frases del artículo y quitó el formato `$`/miles, provocando que el visor muestre múltiples cambios inexistentes.
2. **Duplicación de filas por Registro Oficial y pérdida de estructura (ej. 3S R.O. 242 de 29-dic-2007, Ley de Equidad Tributaria, `v10`):**
   * Al reformarse 4 literales (`a, b, c, d`) en la misma ley, `apply_official_registry_reform` creó **4 filas distintas** en `v10` con ramas paralelas, perdió los marcadores `a)`, `b)`, `c)`, `d)` y repitió `Art. 36.-` dentro del cuerpo.
   * En la reforma siguiente (`v13`), la función tomó como base `v8` (2006) en lugar de `v10` (2007), recortando el artículo de 4.254 a 1.296 caracteres.
3. **Alcance global en toda la LRTI:**
   * **115 filas duplicadas** en **39 artículos** (top: `Art. 36`, `10`, `9`, `55`, `56`, `66`, `13`, `41`, `97.6`).
   * **Más de 20 artículos** con caídas bruscas de longitud entre versiones consecutivas.
   * **118 versiones históricas** con encabezado `Art. X.-` repetido dentro del texto.
   * **33 versiones históricas vencidas** con `valid_until IS NULL`.
   * **1 parche literal** `[Reforma ...]` en `Art. 39.1` y un identificador mal formado (`9, 10, 36`).
4. **Tablas históricas (`normative_tables`):**
   * De 78 tablas de la LRTI, **52 figuran activas (`is_active = true`)**, incluyendo **38 tablas de versiones anteriores a 2026**.
   * Algunas versiones muestran tablas desfasadas (ej. 2022 en 2023, 2023 en 2024) y faltan años intermedios (`2009`, `2015`, `2017`, `2019`, `2025`).

---

## 3. Decisiones de arquitectura ya aprobadas

1. **No hacer parches:** corregir primero el flujo definitivo (n8n + Supabase + frontend) para que sirva de estándar fiable para la **LRTI, Reglamentos y Códigos**.
2. **Fidelidad literal estricta:** la norma tributaria no se interpreta ni se parafrasea; las reformas solo pueden aplicar sustituciones, adiciones o supresiones exactas (y en resoluciones de tabla, clonar la prosa intacta y cambiar únicamente la tabla).
3. **Desglose jerárquico por numerales, literales y párrafos:**
   * Aprovechar que `normative_structures.structure_type` ya soporta `article`, `paragraph`, `numeral`, `literal` e `item` vía `parent_id`.
   * Permitir al usuario seleccionar un **numeral, literal o párrafo** concreto (por ejemplo `Art. 36 → Literal a)` o `Literal d)`) y ver su histórico limpio e independiente, así como vincular cada tabla a su literal correspondiente.
   * Adaptar la interfaz web en `src/` (que hoy muestra un único bloque por artículo) para navegar y consultar también el histórico por sub-niveles sin perder la vista completa del artículo.
4. **Reaprovechar los Registros Oficiales ya extraídos en Supabase** y volver a leer con Gemini únicamente los PDFs puntuales que falten o presenten extracción incompleta.

---

## 4. Secuencia exacta de ejecución (próximos pasos)

### Paso 1 — Auditoría técnica y diseño detallado (solo lectura antes de modificar)
- [x] Inspeccionar el workflow de n8n **`SmartLex - Ingesta Juridica PDF y Extraccion IA`** (`dq7qOSDD9lAFPFGM`) para mapear sus 26 nodos, prompts y payloads hacia Supabase.
- [x] Inspeccionar el frontend en `src/` (cómo consulta `normative_structures`, `normative_changes` y `normative_tables` para mostrar el artículo y su histórico).
- [x] Inspeccionar la función actual `public.apply_official_registry_reform` y los scripts en `supabase/` / `n8n/`.
- [x] Presentar el **diseño exacto** de:
  1. Modelo jerárquico `article → literal / numeral / paragraph` (incluyendo sincronización de texto completo).
  2. Nueva versión de `apply_official_registry_reform` (consolidación única por R.O., cero duplicados, cero parches `[Reforma ...]`, desactivación automática de tablas previas por categoría).
  3. Prompts/nodos actualizados en n8n con regla de cero parafraseo y modo "solo tabla".
  4. Ajustes mínimos en `src/` para desplegar el histórico por numerales/literales/párrafos y comparación de tabla completa (rojo/verde) vs celda a celda.

### Paso 2 — Implementación y prueba piloto en Art. 36 (2 casos reales)
- [x] Aplicar la nueva función en Supabase y actualizar los nodos de n8n.
- [x] Probar el motor sobre **2S R.O. 427 (29-dic-2006)** (debe cambiar únicamente la tabla del literal `a)`) y **3S R.O. 242 (29-dic-2007, Ley de Equidad)** (debe sustituir íntegramente los literales `a)`, `b)`, `c)`, `d)` sin duplicados ni palabras sueltas).
- [ ] Verificar el resultado en la interfaz web de SmartLex junto al usuario.

### Paso 3 — Reconstrucción limpia del histórico completo de la LRTI
- [x] Desactivar las tablas históricas anteriores a 2026 (`is_active = false`), dejando únicamente las **14 tablas vigentes de 2026** activas.
- [x] Reconstruir cronológicamente la historia de la LRTI (Art. 36 completo 2004–2026 con **34 versiones continuas**, **23/23 años de tablas IR Personas Naturales** y **19/19 años de tablas Herencias 2008–2026**, incluyendo 2017 y 2019 procesados con éxito vía n8n; limpieza global de duplicados, mal archivados, comodines vacíos, prefijos y sincronización de 1.677 sub-elementos jerárquicos).
- [x] Preservar intacta la versión vigente de abril 2026 (260 nodos y 14 tablas).

### Paso 4 — Validación final para Reglamentos y Códigos
- [ ] Checklist de pruebas end-to-end del flujo completo (subida de PDF → extracción → consolidación jerárquica → visualización en SmartLex) listo para iniciar la carga del **RALRTI** y el **Código Tributario**.
