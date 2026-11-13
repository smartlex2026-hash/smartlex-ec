---
name: smartlex-calculators
description: "Genera y actualiza calculadoras tributarias interactivas para Ecuador en SmartLex (Dividendos, Impuesto a la Renta Personas Naturales y Relación de Dependencia, Sociedades, RIMPE Emprendedor/Negocio Popular, Retenciones y Rebaja de Gastos Personales). Úsalo siempre que el usuario pida crear, modificar o conectar una calculadora tributaria leyendo porcentajes, tarifas, fracciones básicas y topes desde la tabla public.tax_rules en Supabase."
---

# SmartLex Calculators Skill (Ecuador)

Este skill guía al agente para construir calculadoras tributarias ecuatorianas dentro de la aplicación web **SmartLex**, conectadas dinámicamente a las tablas de Supabase (`public.normative_tables`, `public.tax_rules`, `public.tax_concepts`, `public.taxpayer_types`, `public.norm_versions`).

## Principios Obligatorios

1. **Cero porcentajes o tablas quemados en el frontend:**
   - Las tablas progresivas (ej. Impuesto a la Renta Personas Naturales Art. 36 lit. a, Herencias Art. 36 lit. d, RIMPE Art. 97.6, Dividendos, ICE, Retenciones) se leen directamente desde **`public.normative_tables`** (`columns_schema` y `rows_data` filtrados por `fiscal_year`, `table_category`, `tax_concept_id` y `structure_id`).
   - Las tarifas puntuales, topes y porcentajes individuales se consultan desde **`public.tax_rules`** filtrando por:
     - `tax_concept_id` (ej. `TAR_DIVIDENDOS`, `TAR_PERSONAS_NATURALES`, `TAR_SOCIEDADES`, `TAR_RIMPE`, `DED_RELACION_DEPENDENCIA`).
     - `taxpayer_type_id` (ej. `PN_GENERAL`, `PN_DEPENDENCIA`, `RIMPE_EMPRENDEDOR`, `RIMPE_POPULAR`, `SOCIEDAD`).
     - `valid_during @> selected_date::date` (el año fiscal o fecha seleccionada por el usuario en la interfaz tipo Outlook).
2. **Trazabilidad jurídica en cada resultado:**
   - Cada línea del cálculo (ej. *"Fracción gravada"*, *"Porcentaje de retención aplicable"*, *"Rebaja máxima por gastos personales"*) debe mostrar un enlace directo al `structure_id` (`normative_structures`) y `norm_version_id` que respalda ese porcentaje (ej. *Art. 36 LRTI / Art. 37 LRTI / Art. 39.2 LRTI*).
3. **Verificación de acceso por Plan (`calculators`):**
   - Antes de habilitar el cálculo interactivo completo, verificar con `public.user_has_feature('calculators')` que el usuario tenga el **Plan Plus** (o rol revisor/admin). Si está en Plan Free o Pro, mostrar la vista previa de la calculadora con opción de *Upgrade a Plan Plus*.

## Estructura de Reglas en `public.tax_rules`

Al insertar o leer reglas en `public.tax_rules` para alimentar una calculadora:

- `rule_type`:
  - `'rate'`: Porcentaje de tarifa (ej. `25.00` para tarifa general de sociedades).
  - `'withholding_rate'`: Porcentaje de retención en la fuente o sobre dividendos.
  - `'threshold'` / `'limit'`: Fracción básica, tope en USD o número de canastas básicas.
  - `'calculation'`: Tabla progresiva por tramos (almacenar los tramos en `conditions->'brackets'` en formato JSON estructurado).
- Esquema estándar de `conditions` para tablas progresivas (Impuesto a la Renta Personas Naturales, RIMPE, Dividendos):
  ```json
  {
    "fiscal_year": 2026,
    "brackets": [
      {
        "min": 0,
        "max": 11902,
        "base_tax": 0,
        "marginal_rate": 0
      }
    ]
  }
  ```

## Flujo de Trabajo para Crear una Calculadora

1. **Consultar o poblar `public.tax_rules`:** Verificar qué reglas existen para el `tax_concept.code` solicitado y el año fiscal. Si aún no están cargadas, proponer el `INSERT` en `public.tax_rules` con referencia al artículo de la LRTI/RLRTI o Resolución del SRI.
2. **Construir el componente UI en la pestaña Horizontal de Calculadoras:**
   - Selector de **Año Fiscal** y **Tipo de Contribuyente** (`public.taxpayer_types`).
   - Campos de entrada numéricos claros en USD con validación.
   - Desglose paso a paso del cálculo (Base imponible, tarifa aplicada, impuesto causado, retención o crédito tributario) con cita clicable al artículo correspondiente en el panel de lectura.
