# Checklist final de revisión

Marca cada punto antes de entregar. Si alguno no se cumple, corrígelo o justifica la excepción en la entrega.

## 1. Visual y composición
- [ ] Ningún color, espacio, radio, sombra o tipografía escrito a mano: todo sale de `tokens.css`.
- [ ] Regla 60-30-10 respetada: neutros, plomo y un único acento esmeralda.
- [ ] Como mucho 3 colores de énfasis en la pantalla (acento y dos estados).
- [ ] Sin neones, sin colores saturados fuera de la guía y sin morado o lavanda fuera del logo.
- [ ] Degradado metálico solo en detalles pequeños, nunca en fondos grandes.
- [ ] Contenido agrupado en secciones continuas con separadores finos; sin mosaicos de tarjetas sueltas.
- [ ] Listados en tablas o listas, no en tarjetas.
- [ ] Espacios en múltiplos de 8 px; todo alineado a una misma línea de inicio izquierda.
- [ ] Radios coherentes (6 px en controles, 10 px en paneles); como mucho un nivel de sombra visible.
- [ ] Una sola acción primaria por pantalla o sección.
- [ ] Tipografía sin cambios respecto a la actual (salvo petición); monoespaciada solo en cifras y referencias legales.
- [ ] Gráficos monocromáticos, con etiquetas directas, título, unidad, fuente y fecha.
- [ ] Animaciones de 150-250 ms, solo con `opacity` y `transform`.
- [ ] Revisado en modo claro **y** en modo oscuro.

## 2. Accesibilidad (WCAG 2.2 AA)
- [ ] Contraste ≥ 4,5:1 en texto normal y ≥ 3:1 en texto grande, iconos y bordes de controles, en ambos temas.
- [ ] Sin texto blanco sobre `#34D399`, sin texto `#34D399` sobre blanco y sin `#767B85` en texto pequeño.
- [ ] El estado no se transmite solo con color (lleva icono y texto).
- [ ] Toda la pantalla se puede usar con teclado: Tab, Mayús+Tab, Esc, Enter, flechas y Ctrl/Cmd+K.
- [ ] Foco siempre visible y nunca tapado por la barra superior fija.
- [ ] Enlace "Saltar al contenido" operativo.
- [ ] Un solo `h1` y títulos sin saltos de nivel; landmarks `header`, `nav`, `main`, `aside`.
- [ ] Tablas con `th` y `scope`; formularios con `label` asociada y errores enlazados (`aria-describedby`).
- [ ] Botones de solo icono con `aria-label`; iconos decorativos con `aria-hidden`.
- [ ] Objetivos táctiles de al menos 24×24 px.
- [ ] `prefers-reduced-motion` respetado.
- [ ] axe sin infracciones (Storybook y Playwright).

## 3. Seguridad
- [ ] Ningún secreto, clave ni token en el código ni en archivos versionados; `.env.example` sin valores reales.
- [ ] `service_role` ausente del cliente.
- [ ] RLS activa y probada en las tablas que usa la vista; la autorización no depende solo de la UI.
- [ ] Entradas validadas con Zod en cliente y servidor, con límites de longitud.
- [ ] Sin `dangerouslySetInnerHTML` (o HTML sanitizado con DOMPurify).
- [ ] Enlaces externos con `rel="noopener noreferrer"`.
- [ ] Cabeceras CSP, HSTS, `nosniff`, Referrer-Policy y Permissions-Policy configuradas en el despliegue.
- [ ] Mensajes de error sin detalles internos.
- [ ] Acciones sensibles registradas en la auditoría; límites de tasa en los endpoints nuevos.
- [ ] `npm audit` (o SCA en CI) sin vulnerabilidades altas ni críticas.
- [ ] Datos personales tratados según la LOPDP: minimización, consentimiento y derechos del titular.

## 4. Contenido tributario
- [ ] Cada norma muestra fuente oficial, tipo y número, fecha y R.O., vigencia, última reforma y enlace oficial.
- [ ] Los datos que faltan aparecen como "No disponible" o "Pendiente de verificar"; nada inventado.
- [ ] Tasas, tarifas, plazos y artículos se leen de la base de datos con su fuente y año; no hay valores fijos en el código.
- [ ] Aviso legal visible en normas, búsquedas y calculadoras.
- [ ] Las calculadoras muestran base legal, año fiscal, desglose y fecha de actualización.
- [ ] Siglas explicadas; el resumen en lenguaje llano está separado del texto literal.
- [ ] Fechas en `dd/mm/aaaa` y moneda en USD con formato `es-EC`.

## 5. Rendimiento y responsive
- [ ] LCP < 2,5 s, INP < 200 ms y CLS < 0,1 (Lighthouse o web-vitals).
- [ ] Skeletons con la forma real; espacio reservado para imágenes y bloques asíncronos.
- [ ] Código dividido por ruta; listados largos virtualizados; búsqueda con debounce.
- [ ] Correcto a 360 px, 768 px, 1280 px y 1920 px, sin scroll horizontal de página.
- [ ] Textos de interfaz preparados para i18n.

## 6. Calidad de código
- [ ] `tsc --noEmit` sin errores (`strict`), ESLint y Prettier limpios.
- [ ] Pruebas unitarias y E2E de la funcionalidad nueva en verde.
- [ ] Versiones de las dependencias nuevas verificadas en su fuente oficial y fijadas.
