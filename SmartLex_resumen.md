# SmartLex --- Resumen del proyecto para Codex

**Fecha:** 2 de noviembre de 2026\
**Idioma:** español \| **Jurisdicción inicial:** Ecuador\
**Estado:** prototipo en construcción; no habilitado aún para asesoría
legal automatizada ni campañas comerciales.

## 1. Visión y objetivos

SmartLex será una plataforma de conocimiento jurídico-tributario
ecuatoriano. Convertirá leyes, reglamentos, resoluciones y otros
documentos en información estructurada, versionada, trazable y
consultable.

Objetivos: - Buscar normas, artículos, numerales, literales,
obligaciones, conceptos, formularios y anexos. - Responder consultas con
citas verificables a la fuente y su versión. - Conservar historia
normativa y distinguir vigencia, reformas y derogaciones. - Captar y
atender potenciales clientes mediante **WhatsApp y correo electrónico**,
con gestión de leads y seguimiento.

El sistema es apoyo informativo; no sustituye el criterio de un
profesional. No debe afirmar vigencia sin evidencia fiable ni inventar
contenido.

## 2. Arquitectura tecnológica conocida

-   **Supabase:** PostgreSQL, autenticación, RLS y Storage privado.
-   **n8n:** orquestación de ingestión y automatizaciones.
-   **Google Gemini:** extracción e interpretación estructurada.
-   **Codex:** nuevo entorno de desarrollo solicitado para continuar la
    aplicación.
-   **WhatsApp y email:** canales previstos de atención y adquisición;
    no consta una integración productiva aún.

Separar documentos originales, extracción técnica, evidencia, estructura
normativa, conocimiento indexado, CRM y comunicaciones.

## 3. Supabase: estado conocido

Existe un proyecto Supabase y un bucket privado `legal-documents`. Se
indicó que hay 40 tablas públicas con RLS habilitado. Tablas conocidas:

**Documentos/evidencia:** `documents`, `document_pages`,
`evidence_spans`, `extraction_runs`.

**Normativa:** `norms`, `norm_versions`, `normative_structures`,
`norm_relations`, `normative_changes`, `structure_evidence`,
`norm_discovery`.

**Conceptos:** `tax_concepts`, `taxpayer_types`, `candidate_concepts`,
`tax_concept_relations`.

**Reglas/obligaciones:** `tax_rules`, `tax_rule_evidence`,
`tax_rule_relations`, `obligations`, `obligation_evidence`,
`obligation_relations`.

**Formularios/anexos:** `forms`, `form_versions`, `annexes`,
`annex_versions`, `obligation_forms`, `obligation_annexes`,
`form_evidence`, `annex_evidence`.

**Búsqueda:** `knowledge_chunks`.

Funciones existentes: - `search_knowledge_text()` --- búsqueda FTS. -
`match_knowledge_chunks(query_embedding halfvec, match_threshold double precision default 0.70, match_count integer default 10)`
--- búsqueda vectorial por similitud coseno. -
`search_knowledge_hybrid(search_query text, query_embedding halfvec, match_count integer default 10, full_text_weight double precision default 1, semantic_weight double precision default 1, rrf_k integer default 50)`
--- combinación FTS/vectorial mediante Reciprocal Rank Fusion.

`knowledge_chunks` tiene FTS español (`tsvector` generado desde
`content`), índice GIN, `embedding halfvec(1536)` e índice HNSW con
distancia coseno. En el último estado conocido tenía 0 filas; las
funciones estaban creadas, pero la ingestión y búsqueda real aún no se
habían validado.

Roles conocidos: `admin`, `accountant`, `lawyer`, `consultant`,
`client`, `user`. Existen `permissions`, `role_permissions`, `roles`,
`user_roles` y función `has_permission(permission_code)` con
`SECURITY DEFINER` y `search_path` restringido. Se aplicaron políticas
RLS para restringir documentos y tablas internas; se probaron cuentas
admin y client. **Codex debe auditar el estado real antes de modificar
nada.**

### Seguridad

-   `legal-documents` es privado.
-   Existe una credencial backend de Supabase con clave `sb_secret_...`.
-   Nunca exponer claves `sb_secret`, service-role, Gemini, WhatsApp o
    correo en frontend, repositorio, prompts, logs ni workflows
    exportados.
-   Usar variables de entorno/gestor de credenciales; rotar cualquier
    secreto expuesto.
-   Los enlaces firmados de Storage son temporales y no deben
    compartirse.

## 4. Documentos y caso de prueba

Documentos mencionados: - `LRTI_ley36ORIGEN.pdf` --- LRTI, codificación
2004, 59 páginas. - `RLRTI.pdf` --- compilación del Reglamento a la
LRTI, 392 páginas. - `NAC-DGER2005-0628.pdf` --- resolución SRI antigua
de 2005. - `LRET.pdf` --- ley de 2007 con reformas.

No asumir que representan normativa vigente; hay que contrastar
publicaciones oficiales, reformas, derogaciones y fechas de vigencia.

Registro conocido en `documents`: - `id`:
`368e3bfb-38db-4c80-98e2-961e70d66a9e` - `file_name`:
`LRTI_ley36ORIGEN.pdf` - `storage_bucket`: `legal-documents` -
`storage_path`: `norms/laws/LRTI_ley36ORIGEN.pdf` - `status`:
`pending` - `sha256`:
`89b70469986ec097444d3919baf3b9586bfdfc9acb703efab60ee067663650a3` -
`processed_at`, `extraction_model`, `extraction_version`: nulos en el
último estado conocido. - Storage object ID:
`f40bf7df-521a-4cae-8d79-7445d08be1f9`.

Consultar estado actual antes de operar.

## 5. n8n: flujo probado

Instancia autohospedada: `https://n8n.smartlexec.cloud/home/workflows`.

Credencial configurada: `Supabase - SmartLex Backend` (no copiar
secretos).

Flujo probado: 1. Manual Trigger. 2. Supabase: recuperar registro de
`documents`. 3. HTTP Request: crear URL firmada para el objeto privado
de Storage (`expiresIn` 300 segundos). 4. HTTP Request: descargar PDF
como archivo/binario en propiedad `data`. 5. Crypto: SHA-256 del binario
`data`, HEX. 6. Supabase: actualizar `documents.sha256`. 7. Extract From
File: `Extract From PDF`, campo binario `data`.

La descarga y extracción funcionaron. El PDF produjo un único item con
`json.text` de aproximadamente 140.587 caracteres, 59 páginas, idioma
detectado `es`. El hash coincidió con el registrado.

El flujo debe revisarse en n8n; no asumir que el estado actual coincide
con el último export.

## 6. Problema de extracción jurídica

La revisión manual determinó que la LRTI del caso de prueba contiene
**119 artículos reales**. Algunos encabezados están mal formateados, por
ejemplo `Art. 55:` y `Art. 58:`. Una expresión regular detectó
referencias internas como si fueran encabezados, omitió otros
encabezados y en otra ejecución generó 199 items.

El artículo 121 contiene una larga lista de derogatorias y referencias
normativas; estas referencias no son nuevos artículos de la LRTI. El
artículo 122 aparece después.

### Objetivo

Usar Gemini para interpretar la estructura jurídica, no solo buscar
patrones: - títulos, capítulos y secciones; - encabezados reales aunque
tengan puntuación irregular; - número, título y texto íntegro de
artículos; - numerales y literales; - disposiciones generales,
transitorias, reformatorias y derogatorias; - referencias internas a
otras normas, diferenciándolas de encabezados reales; - anomalías, texto
ilegible, cortes e incertidumbre.

Preservar el texto original. No completar ni inventar contenido.
Mantener trazabilidad al documento y al fragmento de origen.

### Estrategia recomendada

El texto de 140k caracteres no debe enviarse completo a un solo paso de
extracción sin comprobar límites de contexto y salida. Diseñar
procesamiento por fragmentos con solapamiento: 1. conservar el texto
íntegro; 2. dividirlo sin cortar innecesariamente artículos/encabezados;
3. enviar fragmentos a Gemini con prompt y schema versionados; 4.
devolver JSON con fragmento de origen y offsets/posición cuando sea
posible; 5. consolidar artículos que atraviesen fragmentos y eliminar
duplicados por solapamiento; 6. detectar números ausentes, duplicados y
límites dudosos; 7. enviar incertidumbres a revisión humana; 8. comparar
contra los 119 artículos verificados manualmente; 9. registrar modelo,
prompt, schema, hash y ejecución; 10. persistir estructura/evidencia
solo después de validación.

Puede usarse un nodo nativo de n8n o código pequeño para fragmentar,
validar y persistir. La interpretación jurídica corresponde al modelo,
pero no se debe prometer una canalización sin ninguna lógica
determinista.

### Nodo IA en preparación

Se añadió `Information Extractor` y se eligió
`Define using JSON Schema`. Esquema inicial propuesto:

``` json
{
  "type": "object",
  "properties": {
    "articulos_detectados": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "numero": {"type": "string"},
          "encabezado": {"type": "string"},
          "texto_completo": {"type": "string"},
          "observaciones": {"type": "string"}
        },
        "required": ["numero", "encabezado", "texto_completo", "observaciones"]
      }
    }
  },
  "required": ["articulos_detectados"]
}
```

Se añadió `Google Gemini Chat Model`
(`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`, typeVersion 1.1) con
credencial seleccionada `Google Gemini(PaLM) Api account`. El export
compartido mostraba su salida `ai_languageModel` vacía (`[[]]`), por lo
que la conexión al puerto `Model` del `Information Extractor` no quedó
confirmada en ese export. El usuario indicó después que lo había
conectado, pero falta export actualizado para verificarlo. No ejecutar
el documento completo hasta configurar fragmentación, prompt, schema y
validación.

## 7. Mejoras que Codex debe evaluar en Supabase

**No borrar ni recrear las 40 tablas.** Primero inspeccionar tablas,
columnas, tipos, constraints, FKs, índices, triggers, funciones,
políticas RLS, grants, Storage y datos. Preparar migraciones
incrementales, reversibles y revisadas.

Áreas de mejora: 1. **Trazabilidad:** documento, hash, fuente, fecha de
captura, MIME, tamaño, extractor, modelo, prompt/schema version, estado,
errores y timestamps. 2. **Estructura:** nodos con tipo (`title`,
`chapter`, `section`, `article`, `paragraph`, `numeral`, `literal`,
disposiciones), orden, padre, identificador local, versión y documento
fuente. No usar número de artículo como clave global única. 3.
**Evidencia:** texto literal, documento, fragmento, offsets y página
solo si está disponible de fuente fiable. No inventar páginas ni
offsets. 4. **Temporalidad:** publicación, entrada en vigor, fin de
vigencia, reforma, captura y relaciones de reforma/derogación. No
sobrescribir historia. 5. **Calidad:** estados `pending`, `processing`,
`extracted`, `needs_review`, `validated`, `failed`; advertencias,
confianza y revisión humana. 6. **Búsqueda:** verificar dimensión real
del embedding antes de cambiar `halfvec(1536)`; poblar
`knowledge_chunks`; probar FTS, vectorial e híbrida con citas a
norma/versión/artículo/evidencia. 7. **Integridad:** constraints, claves
foráneas, índices, idempotencia, deduplicación y rendimiento. 8.
**Seguridad:** RLS multiusuario/tenant si aplica, mínimo privilegio,
auditoría y separación entre datos jurídicos y personales.

### CRM propuesto (no confirmado como existente)

Revisar primero si ya hay tablas equivalentes. Posibles entidades: -
`contacts`: nombre, teléfono E.164, email, país, fuente y fecha de
captura. - `contact_channels`: canal, verificación, preferencias y
estado de suscripción. - `consent_records`: finalidad, canal, versión
del aviso/consentimiento, fecha, origen y evidencia. -
`suppression_list` o estado de baja. - `campaigns`, `message_events`:
campaña, plantilla, estados, proveedor y fechas. - `leads` /
`conversations`: necesidad, etapa, responsable, próxima acción y
conversación. - `communication_templates`: finalidad, idioma y versión.

No mezclar CRM con entidades normativas.

## 8. WhatsApp y correo para captar clientes

Objetivo: - permitir que el prospecto inicie conversación; - registrar
lead, preferencias y base jurídica; - responder consultas iniciales
sobre servicios y proceso; - derivar consultas tributarias complejas a
un profesional; - registrar seguimiento, etapa y resultado; - enviar
mensajes solo cuando sea legal y permitido por el canal.

### WhatsApp

Evaluar **WhatsApp Business Platform / Cloud API** o proveedor
autorizado. No automatizar WhatsApp Web ni usar métodos no oficiales.
Diseñar: - webhooks de mensajes entrantes y estados; - registro de
conversaciones y mensajes; - plantillas aprobadas cuando corresponda; -
control de ventana de atención y reglas de plantillas; -
baja/oposición; - asignación a asesor humano; - límites de frecuencia,
deduplicación, reintentos y auditoría.

No consta cuenta, número habilitado, plantillas ni credenciales de
WhatsApp Business Platform.

### Email

Evaluar proveedor con SPF, DKIM y DMARC; bajas efectivas;
rebotes/quejas; preferencias, segmentación, frecuencia y auditoría.

### Protección de datos

El propietario indica tener una base de números de WhatsApp que
considera vigentes y correos electrónicos. **Que un número o correo esté
activo no demuestra autorización para publicidad.** Antes de
importar/contactar: - verificar procedencia, finalidad y base
jurídica; - aplicar la Ley Orgánica de Protección de Datos Personales de
Ecuador y normativa aplicable; - informar al titular y respetar sus
derechos; - registrar consentimiento/preferencias cuando corresponda; -
disponer de baja/oposición y lista de supresión; - limitar acceso,
retención y uso; - evaluar transferencias y proveedores de IA; -
solicitar revisión legal local antes de campañas.

No hacer envíos masivos no solicitados ni reutilizar datos para
finalidades incompatibles. No cargar la base real en Gemini ni en
herramientas externas sin evaluación legal y controles adecuados.

## 9. Principios para respuestas de SmartLex

-   Basarse en documentos recuperados y validados.
-   Citar norma, versión, artículo, numeral/literal y evidencia.
-   Indicar vigencia solo cuando esté respaldada.
-   Separar cita literal, resumen y análisis generado.
-   Declarar cuando la fuente sea insuficiente o haya contradicciones.
-   No inventar tasas, obligaciones, excepciones, citas ni fechas.
-   Mantener revisión humana en extracción dudosa y asuntos de alto
    impacto.

## 10. Plan de trabajo para Codex

**Fase 0 --- Auditoría** - inspeccionar repositorio, stack, estructura y
configuración; - inventariar Supabase: esquema, datos, constraints,
índices, funciones, triggers, grants, RLS y Storage; - revisar workflows
n8n exportados sin secretos; - crear backup y entorno de desarrollo; -
distinguir lo implementado de lo pendiente.

**Fase 1 --- Diseño** - proponer arquitectura y contratos API; -
diagramar modelo y pipeline; - proponer migraciones reversibles; -
definir estados, idempotencia, errores, observabilidad, límites y
fragmentación.

**Fase 2 --- Ingestión** - descarga segura de Storage; - extracción de
texto/metadatos; - fragmentación con solapamiento; - extracción
Gemini; - validación y revisión humana; - persistencia con trazabilidad.

**Fase 3 --- Conocimiento** - poblar `knowledge_chunks`; - generar
embeddings compatibles; - probar FTS/vector/híbrida; - entregar citas
verificables.

**Fase 4 --- Aplicación** - autenticación y permisos; - panel
documental; - buscador jurídico; - vista de norma/artículo e
historial; - respuestas con fuentes; - revisión y auditoría.

**Fase 5 --- CRM/canales** - importación controlada y lícita; -
consentimiento/preferencias/bajas; - WhatsApp Business Platform
oficial; - correo autenticado; - bandeja de leads y conversaciones; -
métricas sin exponer datos personales.

**Fase 6 --- Pruebas/despliegue** - pruebas unitarias, integración, RLS
y seguridad; - PDFs extensos y mal formateados; - comparación con 119
artículos; - idempotencia y recuperación; - calidad de citas; -
despliegue gradual, monitoreo y rollback.

## 11. Instrucciones para Codex

-   No modificar ni borrar recursos existentes antes de auditarlos.
-   No solicitar, imprimir ni almacenar secretos en Git.
-   No ejecutar migraciones destructivas automáticamente.
-   Presentar hallazgos y plan antes de aplicar cambios a Supabase o
    servicios externos.
-   Crear migraciones versionadas y reversibles.
-   Mantener desarrollo y producción separados.
-   Exportar workflows n8n sin credenciales ni datos personales.
-   Usar datos ficticios en pruebas.
-   No importar la base real de WhatsApp/email antes de validar
    privacidad y permisos.
-   Trazar toda extracción a documento, fragmento, modelo y versión de
    prompt/schema.
-   Documentar arquitectura, configuración, operación y recuperación.

## 12. Prompt inicial para Codex

> Estamos construyendo SmartLex, plataforma de conocimiento
> jurídico-tributario para Ecuador. Usa Supabase (PostgreSQL, RLS y
> Storage privado), n8n y Google Gemini. Existe un esquema de
> aproximadamente 40 tablas y funciones FTS/vectoriales/híbridas.
> Primero audita el repositorio, stack, Supabase y workflows n8n; no
> borres ni alteres recursos.
>
> Caso de prueba: PDF LRTI de 59 páginas y aproximadamente 140.587
> caracteres. La revisión manual determinó 119 artículos reales. Algunos
> encabezados tienen puntuación irregular como "Art. 55:" y "Art. 58:".
> Las regex generaron falsos positivos y omisiones. Diseña una ingestión
> por fragmentos con Gemini que identifique estructura, preserve texto
> literal, distinga referencias internas y derive dudas a revisión
> humana. No inventes ni completes contenido legal.
>
> El producto debe captar y atender clientes por WhatsApp y correo.
> Existe una base de números y correos que el propietario considera
> vigentes, pero no se debe importar ni contactar hasta verificar
> procedencia, finalidad, base jurídica, consentimiento/preferencias y
> bajas, cumpliendo la legislación ecuatoriana y las políticas de cada
> canal. Diseña integración oficial con WhatsApp Business Platform y un
> proveedor de email; no uses automatización no oficial ni campañas
> masivas no solicitadas.
>
> Propón arquitectura, mejoras incrementales de Supabase y plan por
> fases. Presenta primero el inventario y el plan. Espera aprobación
> antes de ejecutar cambios de base de datos o servicios externos.

## 13. Pendientes por confirmar

-   Export actualizado del workflow n8n y conexión efectiva Gemini →
    `Information Extractor`.
-   Modelo Gemini y límites reales.
-   Prompt/schema definitivo y estrategia de fragmentación.
-   Estado real de las 40 tablas, políticas y funciones.
-   Framework y estado del repositorio.
-   Cuenta/número y proveedor de WhatsApp Business Platform.
-   Proveedor de correo.
-   Procedencia, permisos y base jurídica de la lista de contactos.
-   Aviso de privacidad, retención y proceso de derechos.
-   Fuentes oficiales y proceso de actualización de normativa.

**Conclusión:** empezar con auditoría del estado real, no con una
reconstrucción destructiva. Priorizar trazabilidad jurídica, seguridad,
extracción verificable y privacidad antes de activar asesoría
automatizada o campañas comerciales.
