---
name: disenador-normativa-tributaria
description: Diseña y construye interfaces web profesionales, seguras y accesibles para consultar normativa tributaria de Ecuador. Úsalo al crear o rediseñar vistas de búsqueda, normas, reformas, calendario, alertas o calculadoras.
---

# Diseñador de apps de normativa tributaria (Ecuador)

## Cuándo usar este skill

Actívalo cuando la tarea implique:
- Crear, rediseñar o revisar cualquier pantalla de SmartLex o de una app de normativa tributaria: buscador, listado de normas, lector de documentos, historial de reformas, calendario fiscal, alertas, calculadoras, panel de resumen, ajustes o autenticación.
- Crear componentes de UI, design tokens, temas claro/oscuro o gráficos.
- Definir arquitectura frontend/backend, seguridad o despliegue de una app de este tipo.
- Revisar una interfaz que "parece genérica", desordenada o poco profesional.

No lo uses para: redactar contenido jurídico (usa `asesor-tributario-smartlex`), lógica de cálculo de impuestos (usa `smartlex-calculators`) ni diseño de esquema SQL (usa `supabase-postgres-best-practices`). Sí combínalo con ellos.

## Inputs necesarios

Antes de construir, confirma con el usuario (pregunta si falta):
1. **Pantalla o flujo** concreto y su objetivo principal (una acción primaria por pantalla).
2. **Perfil de usuario** dominante. Los perfiles son abiertos: contadores, abogados tributaristas, empresas, ciudadanos, estudiantes, funcionarios, auditores, etc. Ajusta densidad y lenguaje al perfil, nunca asumas uno solo.
3. **Fuente de datos**: tabla/vista de Supabase o endpoint. Si no existe, no inventes datos: usa estados vacíos.
4. **Rol y permisos** necesarios para ver o modificar la información.

## Workflow

1. **Leer contexto**: `GUIA_DE_COLORES.md`, `src/index.css`, componentes existentes en `src/components/` y `recursos/tokens.css`. Reutiliza antes de crear.
2. **Verificar versiones**: antes de añadir o actualizar dependencias, consulta la web oficial o el registro npm de cada librería (ver sección Stack). No uses APIs marcadas como obsoletas.
3. **Esbozar la estructura** de la pantalla en texto (regiones, jerarquía, acción primaria) y, si el cambio es grande, presentarla al usuario y esperar aprobación.
4. **Construir** con tokens, componentes accesibles y estados completos: carga (skeleton), vacío, error, sin permisos, dato no verificado.
5. **Asegurar**: aplicar la checklist de seguridad a todo lo que toque datos, auth o red.
6. **Revisar** con `recursos/checklist-revision.md` y corregir antes de entregar.
7. **Informar** al usuario: qué se hizo, cómo comprobarlo y qué queda pendiente.

---

## 1. Principios de diseño

1. **Sobrio y fiable**: la interfaz transmite rigor jurídico. Nada decorativo que no aporte información.
2. **Un solo acento**: verde esmeralda para la acción y la selección. Plomo para estructura. Neutros para el 60 % de la superficie (regla 60-30-10 de la guía).
3. **Continuidad**: la pantalla se lee como un documento único con secciones, no como un tablero de cajas sueltas.
4. **La norma es la protagonista**: tipografía cómoda para lectura larga, metadatos siempre visibles, fuente oficial a un clic.
5. **Honestidad del dato**: si no está verificado, se dice. Nunca se rellena.
6. **Accesible y rápido por defecto**: WCAG 2.2 AA y Core Web Vitals en verde no son opcionales.

### Design tokens (obligatorio)

- Todos los colores, espacios, radios, sombras, tipografías y duraciones salen de `recursos/tokens.css`. **Prohibido** escribir hex, rgb o px sueltos en componentes (excepto `1px` de bordes).
- Los tokens semánticos (`--color-texto`, `--color-secundario`…) son los que usan los componentes. Los valores de paleta solo existen dentro de `tokens.css`.
- El tema se cambia con la clase `html.theme-light` / `html.theme-dark` (convención actual del proyecto), respetando `prefers-color-scheme` en la primera visita.
- En Tailwind 4, los tokens se exponen con `@theme inline` y prefijo `sl-` (ver `tokens.css`): `bg-sl-superficie`, `text-sl-texto-secundario`, `border-sl-borde`, `bg-sl-secundario`, `rounded-panel`, `font-mono`. No uses la paleta por defecto de Tailwind (`bg-emerald-500`, `text-gray-600`…).

Extracto (el archivo completo está en `recursos/tokens.css`):

```css
:root, html.theme-light {
  --color-principal: #2A2D33;        /* plomo: estructura, títulos */
  --color-secundario: #047857;       /* esmeralda: único acento */
  --color-fondo: #F7F8FA;
  --color-superficie: #FFFFFF;
  --color-texto: #1B1E23;
  --color-texto-secundario: #585D66;
  --color-borde: #DCE0E6;
}
html.theme-dark {
  --color-secundario: #34D399;       /* con texto oscuro encima, nunca blanco */
  --color-fondo: #111317;
  --color-superficie: #1C1F26;
  --color-texto: #F3F4F6;
  --color-texto-secundario: #9CA3AF;
  --color-borde: #2E333D;
}
```

### Color: reglas duras

- Máximo **3 colores de énfasis por pantalla**: acento esmeralda + como mucho dos colores de estado. Los estados (vigente, aviso, derogado, información) solo comunican estado, nunca decoran.
- El estado nunca se comunica solo con color: añade icono y texto ("Vigente", "Derogada").
- Prohibido: neones, colores saturados fuera de la guía, morados/lavanda fuera del logo, texto blanco sobre `#34D399`, texto `#34D399` sobre blanco, `#767B85` para texto pequeño sobre blanco.
- Degradado metálico oficial solo en detalles pequeños (insignia, cabecera destacada). Nunca en fondos grandes ni en texto.

### Tipografía

- **No cambiar la tipografía actual** (Inter para texto; Inter/Montserrat en `.font-heading`) salvo petición expresa del usuario. Está parametrizada en `--fuente-sans`, `--fuente-titulos` y `--fuente-mono` para poder probar alternativas cambiando solo esas variables.
- Monoespaciada **solo** para cifras tabulares, importes, números de artículo, números de resolución y citas de texto legal. En cifras usa además `font-variant-numeric: tabular-nums`.
- Escala fija (tokens `--text-*`): 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 px. Texto de cuerpo 16 px; lectura de normas 17-18 px con interlineado 1,7 y ancho máximo de 72 caracteres (`--ancho-lectura`).
- Pesos: 400 cuerpo, 500 etiquetas, 600 títulos de sección, 700 título de página. No uses 800-900 en la interfaz.

---

## 2. Reglas de composición

### Estructura de la app

- **Barra lateral plegable** (256 px abierta / 64 px plegada, con iconos y `aria-label`). En móvil se convierte en un panel lateral superpuesto.
- **Barra superior fija**: migas de pan a la izquierda, búsqueda global en el centro (abre una paleta de comandos con `Ctrl+K` / `Cmd+K` y `/`), tema, alertas y usuario a la derecha.
- **Filtros persistentes**: los filtros de cada listado se guardan en la URL (`?tipo=resolucion&vigencia=vigente`) para que se puedan compartir, volver atrás y recargar sin perderlos.
- Estructura base implementada en `recursos/layout-base.tsx`.

### Qué hacer / qué evitar

| Hacer | Evitar |
|---|---|
| Una sección continua con encabezado y separadores `1px` (`--color-borde`) entre bloques | Rejillas de tarjetas sueltas con sombras, cada una con su propio estilo |
| Tablas limpias para listados de normas (cabecera en `--color-superficie-secundaria`, filas con separador fino, hover sutil) | Listados como mosaico de tarjetas |
| Paneles divididos: lista a la izquierda, detalle a la derecha (patrón maestro-detalle) | Abrir cada norma en un modal |
| Rejilla de 8 px: todos los espacios son múltiplos (`--espacio-1` = 4 px solo para ajustes finos) | Márgenes de 13 px, 22 px o valores arbitrarios |
| Radios coherentes: 6 px controles, 10 px paneles, 9999 px solo en etiquetas | Mezclar radios de 4, 12 y 20 px en la misma vista |
| Como mucho 1 nivel de elevación visible (`--sombra-1`) para menús y popovers | Sombras pesadas o difusas para "dar profundidad" |
| Una acción primaria (botón esmeralda) por pantalla o sección | Varios botones verdes compitiendo |
| Espacio generoso: 32-48 px entre secciones, 16-24 px dentro | Contenido apretado contra los bordes |
| Alinear todo a una misma línea de inicio izquierda | Bloques centrados alternos con bloques a la izquierda |

**Ejemplo breve: panel de resumen**
- ✅ Una franja superior con 3-4 indicadores en línea separados por divisores verticales (cifra en mono, etiqueta debajo), luego una tabla "Reformas recientes" y una lista "Próximos vencimientos".
- ❌ Doce tarjetas de colores con iconos grandes y un gráfico circular decorativo.

**Ejemplo breve: ficha de norma**
- ✅ Cabecera con tipo, número, título, etiqueta de vigencia y fila de metadatos; debajo, índice lateral de artículos y texto en ancho de lectura.
- ❌ Metadatos escondidos en un acordeón y el enlace oficial al final de la página.

### Visualización de datos

- Librería: Recharts (o visx si se necesita control fino). Gráficos solo cuando responden a una pregunta concreta; si basta una tabla, usa tabla.
- Paleta de series: escala monocromática derivada del esmeralda (`--grafico-1` a `--grafico-5`). Para resaltar, una serie en acento y el resto en plomo claro.
- Etiquetas directas sobre la serie en lugar de leyendas; sin rejilla de fondo o con líneas muy tenues; sin 3D, sin gráficos circulares de más de 3 porciones.
- Toda gráfica tiene título, unidad, fuente y fecha del dato, y una alternativa accesible (tabla o resumen en texto).

### Movimiento y carga

- Duraciones 150-250 ms (`--duracion-rapida`, `--duracion-base`), curva `--curva-suave`. Solo se animan `opacity` y `transform`.
- Con `prefers-reduced-motion: reduce` se eliminan desplazamientos y se dejan solo los cambios de opacidad.
- Carga: skeletons con la forma real del contenido (filas de tabla, líneas de texto). Nunca spinners de página completa. Reserva el espacio para evitar saltos (CLS).

### Estados obligatorios en cada vista de datos

Carga · Vacío (con acción sugerida) · Error (mensaje comprensible + reintentar) · Sin permisos · **Dato no verificado** (etiqueta de información: "Pendiente de verificar con fuente oficial").

---

## 3. Contenido tributario

1. Toda norma muestra siempre, en la cabecera: **tipo y número**, **órgano emisor / fuente oficial** (Registro Oficial, SRI, Asamblea…), **fecha de publicación y número de R.O.**, **estado de vigencia** (Vigente / Reformada / Derogada / Suspendida), **fecha de última reforma** y **enlace al texto original oficial** (se abre en pestaña nueva con `rel="noopener noreferrer"`).
2. Si falta cualquiera de esos datos, se muestra "No disponible" o "Pendiente de verificar"; **nunca** se rellena con un valor aproximado.
3. **Nunca inventar** artículos, numeraciones, tasas, tarifas, fracciones básicas, plazos ni fechas. Los valores numéricos se leen de la base de datos (p. ej. `public.tax_rules`) con su fuente y año de vigencia.
4. Las reformas se muestran como línea de tiempo y como comparación de texto: añadido en estado "vigente", eliminado en estado "derogado" tachado, con icono y texto alternativo.
5. Aviso legal visible en lectura de normas, calculadoras y resultados de búsqueda: *"Información de carácter referencial. No sustituye la asesoría profesional ni el texto oficial publicado en el Registro Oficial."*
6. Las calculadoras muestran: base legal (artículo y norma), año fiscal aplicado, desglose del cálculo y fecha de actualización de los parámetros.
7. Lenguaje claro: explica siglas la primera vez (RUC, RIMPE, IVA, ICE, R.O.) y ofrece un resumen en lenguaje llano marcado como resumen, separado del texto legal literal.
8. Formato Ecuador: fechas `dd/mm/aaaa`, moneda USD con `Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })`.

---

## 4. Stack y convenciones de código

### Verificación de versiones (antes de instalar o actualizar)

1. Consulta la versión estable vigente en la fuente oficial (web del proyecto, changelog o `npm view <paquete> version`).
2. Lee la guía de migración si hay salto de versión mayor y descarta APIs obsoletas.
3. Fija versiones exactas en `package.json` y registra el cambio en el commit.
4. No mezcles patrones antiguos y nuevos (p. ej. Tailwind 3 `tailwind.config.js` con Tailwind 4 `@theme`).

### Stack principal (actual del proyecto)

| Capa | Elección |
|---|---|
| Frontend | React + TypeScript (`strict: true`) + Vite |
| Estilos | Tailwind CSS 4 con tokens vía `@theme inline`; componentes accesibles con Radix UI / shadcn/ui adaptados a los tokens |
| Iconos | `lucide-react` (ya instalado), tamaño 16/20 px, `aria-hidden` si son decorativos |
| Datos | Supabase (`@supabase/supabase-js`) + TanStack Query para caché, reintentos y estados |
| Formularios | React Hook Form + Zod (el mismo esquema valida en cliente y en servidor/Edge Function) |
| Búsqueda | PostgreSQL full-text search (`tsvector` con configuración `spanish`, índice GIN, `websearch_to_tsquery`) expuesta mediante función RPC; `pg_trgm` para tolerancia a errores |
| Backend | Supabase (Postgres + RLS + Auth + Edge Functions). Lógica sensible solo en Edge Functions o funciones SQL |
| Gráficos | Recharts (visx como alternativa) |
| Pruebas | Vitest + Testing Library, Playwright (E2E), Storybook, `@axe-core/playwright` / addon a11y |
| Calidad | ESLint (flat config) + `typescript-eslint` + `eslint-plugin-jsx-a11y`, Prettier, CI con lint + typecheck + test + build + auditoría de dependencias |
| Despliegue | Contenedor (imagen multi-stage, usuario no root) o hosting estático con cabeceras configuradas |

### Stack alternativo

Next.js (App Router, Server Components, Server Actions con validación Zod) + Node.js/TypeScript, API REST documentada con OpenAPI o tRPC, PostgreSQL con el mismo diseño de búsqueda. Úsalo solo si el usuario lo pide o si se necesita renderizado en servidor para SEO.

### Convenciones

- Estructura por funcionalidad: `src/features/<normas|busqueda|reformas|calendario|alertas|calculadoras|panel>/{components,hooks,api,schemas}`; UI compartida en `src/components/ui`.
- Componentes en PascalCase, hooks `useAlgo`, un componente por archivo, props tipadas con `interface`, sin `any`.
- Los tipos de base de datos se generan con `supabase gen types`; no se escriben a mano.
- Las consultas viven en hooks de TanStack Query (`useNorma(id)`, `useBuscarNormas(filtros)`) con claves de caché estables.
- Textos de interfaz en archivos de idioma (i18n, `es-EC` por defecto); nada de cadenas sueltas en componentes nuevos.
- Clases condicionales con una utilidad tipo `cn()`; variantes de componente con `cva` o mapas tipados.
- Plantilla de componente: `recursos/plantilla-componente.tsx`.

---

## 5. Checklist de seguridad (por defecto, no opcional)

**Autenticación y acceso**
- [ ] Supabase Auth (OIDC/OAuth2) con MFA (TOTP) disponible y obligatoria para roles administrativos; passkeys/WebAuthn cuando el proveedor lo permita.
- [ ] RBAC con roles mínimos (p. ej. `lector`, `suscriptor`, `editor`, `admin`) guardados en tabla propia, no en `user_metadata` editable por el usuario.
- [ ] RLS activada en **todas** las tablas expuestas; políticas probadas por rol. La UI oculta acciones, pero la autorización real está en la base de datos o servidor.
- [ ] La clave `service_role` nunca llega al navegador; solo en Edge Functions.

**Cabeceras HTTP**
- [ ] `Content-Security-Policy` estricta (sin `unsafe-inline` ni `unsafe-eval` en scripts; `connect-src` limitado al dominio de Supabase; `frame-ancestors 'none'`).
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- [ ] `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` desactivando cámara, micrófono, geolocalización, etc.

**OWASP Top 10**
- [ ] Consultas parametrizadas / RPC; nunca concatenar texto del usuario en SQL.
- [ ] Sin `dangerouslySetInnerHTML`; si hay que renderizar HTML de normas, sanitizar con DOMPurify en servidor y cliente.
- [ ] Validación con Zod en cliente **y** servidor; límites de longitud en búsquedas y formularios.
- [ ] CSRF: cookies `SameSite=Lax/Strict`, `Secure`, `HttpOnly` cuando se usen sesiones por cookie; tokens anti-CSRF en el stack Next.js.
- [ ] SSRF: las Edge Functions que descargan documentos solo aceptan dominios oficiales en lista blanca.
- [ ] Errores sin trazas internas hacia el usuario.

**Secretos, datos y operación**
- [ ] Secretos solo en variables de entorno o gestor de secretos; `.env*` en `.gitignore`; `.env.example` sin valores reales.
- [ ] TLS en todo el tráfico; cifrado en reposo del proveedor; cifrado adicional de columnas con datos personales sensibles.
- [ ] Registro de auditoría (quién, qué, cuándo) para cambios en normas, roles y datos personales.
- [ ] Límites de tasa en login, búsqueda y Edge Functions.
- [ ] SCA en CI (`npm audit`, Dependabot o similar); dependencias fijadas y revisadas.
- [ ] **LOPDP Ecuador** (Ley Orgánica de Protección de Datos Personales): base legal y consentimiento informado, política de privacidad visible, minimización de datos, derechos de acceso/rectificación/eliminación/portabilidad desde la cuenta, plazos de conservación definidos y procedimiento de notificación de brechas.

---

## 6. Accesibilidad y rendimiento

- WCAG 2.2 AA: contraste ≥ 4,5:1 texto normal y ≥ 3:1 texto grande y componentes; foco visible (`--anillo-foco`, 2 px) que no quede tapado por la barra fija; objetivos táctiles ≥ 24×24 px (recomendado 40 px).
- HTML semántico: `header`, `nav`, `main`, `aside`, `article` para cada norma, `table` real con `th scope`. Un solo `h1` por página y jerarquía sin saltos.
- ARIA solo cuando no exista elemento nativo; los componentes Radix ya gestionan roles y teclado.
- Teclado completo: enlace "Saltar al contenido", orden lógico, `Esc` cierra paneles, flechas en la paleta de comandos y en tablas navegables.
- `lang="es"` en el documento; anunciar resultados de búsqueda con región `aria-live="polite"`.
- Core Web Vitals: LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Divide el código por ruta (`React.lazy`), virtualiza listados largos, aplica `debounce` (250-300 ms) a la búsqueda, precarga la fuente principal y reserva el tamaño de imágenes y skeletons.
- Mobile-first: diseña desde 360 px; las tablas pasan a lista apilada con etiquetas en móvil, sin scroll horizontal de página.

---

## 7. Revisión final

Antes de entregar, recorre **`recursos/checklist-revision.md`** (visual, accesibilidad, seguridad, contenido y rendimiento) y corrige todo lo que no cumpla.

## Output (formato de entrega al usuario)

1. **Qué se ha hecho**: archivos creados o modificados con enlace.
2. **Cómo comprobarlo**: comandos (`npm run dev`, tests) y pasos en el navegador (tema claro/oscuro, teclado, móvil).
3. **Resultado de la checklist**: puntos cumplidos y excepciones justificadas.
4. **Pendiente**: datos sin verificar, decisiones abiertas y mejoras sugeridas.

## Recursos

- `recursos/tokens.css`: tokens completos (color claro/oscuro, tipografía, espaciado, radios, sombras, movimiento, gráficos) y mapeo a Tailwind 4.
- `recursos/layout-base.tsx`: shell de la app (barra lateral plegable, barra superior, migas, búsqueda Ctrl/Cmd+K, filtros en URL).
- `recursos/plantilla-componente.tsx`: ficha de norma de ejemplo con estados, accesibilidad y aviso legal.
- `recursos/checklist-revision.md`: checklist final de revisión.
