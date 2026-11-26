---
name: planificacion-pro
description: Convierte una idea en un plan ejecutable por fases, con checklist, riesgos y entregables. Úsalo cuando haya que pasar de idea a acción sin improvisar.
---

# Planificación Pro

## Cuándo usar esta habilidad
- Cuando el usuario pida un plan paso a paso, una estrategia o una hoja de ruta.
- Cuando haya que entregar algo (landing, vídeo, proyecto, lanzamiento) con tiempos definidos.
- Cuando el usuario tenga muchas tareas sueltas o dispersas y quiera ordenarlas con rigor.

---

## Inputs necesarios (si faltan, pregunta primero)
Antes de generar el plan, verifica que cuentas con:
1. **Resultado final**: qué significa exactamente "terminado".
2. **Fecha límite o ritmo**: plazo temporal (para hoy, esta semana, sin prisa, fecha concreta).
3. **Recursos disponibles**: herramientas de trabajo, equipo, presupuesto y tiempo diario disponible.
4. **Criterios de éxito**: condiciones medibles que debe cumplir para considerarse un éxito.

> **Regla estricta:** Si alguno de estos puntos es ambiguo o no se ha facilitado, **pregunta al usuario antes de asumir o inventar**.

---

## Workflow

Sigue estos 5 pasos ordenados:

1. **Definir el resultado y el éxito:**
   - Redacta el resultado final en 1 sola frase contundente.
   - Lista 3 criterios de éxito claros y comprobables.

2. **Dividir el trabajo en fases (máximo 4):**
   - **Fase 1: Preparación** (requisitos, recopilación de información, accesos).
   - **Fase 2: Producción / Ejecución** (construcción, redacción o desarrollo).
   - **Fase 3: Revisión / QA** (pruebas, control de calidad y ajustes).
   - **Fase 4: Publicación / Entrega** (despliegue, lanzamiento o entrega formal).

3. **Detallar cada fase:**
   - Lista las tareas en orden cronológico estricto.
   - Especifica el entregable claro que sale de esa fase.
   - Asigna un tiempo estimado aproximado por tarea.

4. **Identificar riesgos y mitigación (entre 3 y 5 casos):**
   - Plantea situaciones concretas con la estructura: *Si pasa X → hago Y*.

5. **Cerrar con una checklist de validación:**
   - Lista de verificación final lista para marcar casillas antes de dar por cerrada la entrega.

---

## Reglas de calidad
- **Evita planes infinitos:** prioriza siempre las tareas que desbloquean el siguiente paso.
- **Señala dependencias:** si una tarea requiere de otra previa, indícalo expresamente (*"esta tarea depende de X"*).
- **Adaptabilidad al usuario:**
  - Si el usuario es principiante, reduce pasos, evita tecnicismos y ofrece opciones sencillas.
  - Si el usuario es avanzado, incorpora atajos técnicos, optimizaciones y paralelización de tareas.

---

## Output (formato exacto)

Devuelve siempre la respuesta estructurada bajo estas 4 secciones:

```markdown
### 1. Resultado final y criterios de éxito
- **Resultado final:** [1 frase clara]
- **Criterios de éxito:**
  1. ...
  2. ...
  3. ...

### 2. Plan por fases

#### Fase 1: Preparación
- **Entregable de la fase:** ...
- **Tareas:**
  1. [Tarea] - [Tiempo estimado] (Dependencia: ...)
  2. ...

#### Fase 2: Producción / Ejecución
- **Entregable de la fase:** ...
- **Tareas:**
  1. [Tarea] - [Tiempo estimado]
  2. ...

#### Fase 3: Revisión / Control de Calidad
- **Entregable de la fase:** ...
- **Tareas:**
  1. [Tarea] - [Tiempo estimado]
  2. ...

#### Fase 4: Publicación / Entrega
- **Entregable de la fase:** ...
- **Tareas:**
  1. [Tarea] - [Tiempo estimado]
  2. ...

### 3. Riesgos y mitigación
- **Riesgo 1:** Si pasa [X] → hago [Y].
- **Riesgo 2:** Si pasa [X] → hago [Y].
- **Riesgo 3:** Si pasa [X] → hago [Y].

### 4. Checklist final de validación
- [ ] [Punto de comprobación 1]
- [ ] [Punto de comprobación 2]
- [ ] [Punto de comprobación 3]
- [ ] [Punto de comprobación 4]
```

