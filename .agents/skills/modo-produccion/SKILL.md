---
name: modo-produccion
description: Revisa una app o landing, detecta problemas comunes, propone mejoras y aplica correcciones con checklist fijo para dejarla lista para enseñar o publicar.
---

# Modo Producción (QA + Fix)

## Cuándo usar esta habilidad
- Cuando ya tienes una interfaz o aplicación generada (landing page o app) y necesitas dejarla impecable y presentable.
- Cuando la interfaz funciona "a medias": desajustes en versión móvil, imágenes que no cargan, botones inactivos o espaciados visualmente descompensados.
- Justo antes de mostrar el trabajo a un cliente, grabarlo en vídeo o publicarlo en producción.

---

## Inputs necesarios (si faltan, pregunta primero)
Antes de comenzar la revisión, asegúrate de contar con:
1. **Archivo o ruta principal:** por ejemplo, `app/page.tsx`, `index.html` o la carpeta principal del proyecto.
2. **Objetivo de la revisión:** especificar si el listón es *"lista para enseñar"* (demo visual pulida) o *"lista para publicar"* (producción completa y funcional).
3. **Restricciones:** aspectos intocables (por ejemplo, respetar la guía de marca, no alterar los textos o conservar la estructura existente).

---

## Checklist de calidad (orden fijo)

Evalúa la interfaz siguiendo este orden riguroso:

### A) Funcionalidad y visualización base
- La previsualización o el servidor local compila y abre sin errores en consola.
- Las imágenes y recursos gráficos cargan correctamente (sin enlaces rotos ni SVGs vacíos).
- Las fuentes tipográficas y las utilidades de estilo se renderizan según lo previsto.

### B) Adaptabilidad móvil (*Mobile First*)
- La vista móvil se muestra limpia, sin cortes ni desbordamiento lateral (sin scroll horizontal accidental).
- Los botones y enlaces tienen áreas de toque cómodas y los textos son legibles en pantallas pequeñas.
- La separación entre secciones mantiene márgenes y espaciados coherentes.

### C) Textos y experiencia de usuario (Copy + UX)
- El titular principal es directo, claro y acorde con la propuesta de valor.
- Las llamadas a la acción (CTAs) son consistentes en verbo, tono y propósito.
- Se ha eliminado cualquier texto de relleno provisional tipo *Lorem ipsum*.

### D) Accesibilidad básica
- Hay contraste suficiente entre el texto y el color de fondo para una lectura sin fatiga.
- Las imágenes informativas disponen de atributo `alt` descriptivo.
- La jerarquía semántica de encabezados (`h1`, `h2`, `h3`) es ordenada y lógica.

---

## Workflow

Sigue estos 5 pasos de ejecución:

1. **Diagnóstico rápido:** redacta una lista priorizada de fallos detectados (entre 5 y 10 puntos clave).
2. **Plan de arreglos:** define con exactitud qué vas a modificar y el motivo de cada ajuste (máximo 8 cambios prioritarios).
3. **Aplicación de correcciones:** realiza los cambios directamente en los archivos correspondientes.
4. **Revalidación:** revisa nuevamente el resultado y contrasta cada elemento contra la checklist de calidad.
5. **Cierre:** presenta el informe de intervención y el veredicto final.

---

## Reglas operativas
- **No alteres la identidad visual:** respeta la guía de estilo si existe una previa o si hay una habilidad de diseño activa.
- **Intervención quirúrgica:** no rehagas la página entera desde cero; corrige lo mínimo necesario para elevar la calidad rápidamente.
- **Prioridad a la comprensión:** ante cualquier duda entre una ornamentación compleja y la legibilidad/usabilidad, prioriza siempre la claridad.

---

## Output (formato exacto)

Devuelve siempre la entrega estructurada de esta manera:

```markdown
### 1. Diagnóstico priorizado
1. **[Crítico]** ...
2. **[Medio]** ...
3. **[Menor]** ...

### 2. Cambios aplicados
- **Archivo modificado:** `ruta/del/archivo`
  - *Cambio 1:* ...
  - *Cambio 2:* ...

### 3. Veredicto final
- **Estado:** [OK para enseñar / OK para publicar]
- **Notas y mejoras opcionales:** ...
```

