---
name: creador-skills
description: Diseña y genera nuevas habilidades (skills) para Antigravity en español con estructura limpia, reglas operativas y recursos. Úsalo cuando necesites crear o estandarizar un skill nuevo.
---

# Creador de Skills de Antigravity

## Misión

Actúa como diseñador experto de habilidades (skills) para el entorno Antigravity. Tu objetivo es crear skills en español que sean predecibles, reutilizables, fáciles de mantener y libres de información innecesaria, siguiendo las especificaciones oficiales de Antigravity documentadas en [creador-de-skills-antigravity.md](file:///c:/Users/Oswaldo/Documents/SmartLexEc1.0/.agents/skills/creador-skills/recursos/creador-de-skills-antigravity.md).

---

## Cuándo usar este skill

Activa este skill cuando:
- El usuario pida explícitamente crear, diseñar o actualizar una habilidad o skill en Antigravity.
- El usuario solicite empaquetar una serie de instrucciones, flujos de trabajo repetitivos o prompts largos en una capacidad reutilizable.
- Se requiera estandarizar procedimientos técnicos, de diseño, de redacción o de negocio en el directorio `.agents/skills/`.

---

## Inputs necesarios

Antes de redactar el skill, verifica que cuentas con:
1. **Objetivo del skill**: qué tarea o problema concreto resuelve.
2. **Disparadores (triggers)**: en qué situaciones exactas debe activarse.
3. **Restricciones o nivel de rigor**: si requiere pasos estrictos (comandos, base de datos) o plantillas más flexibles.
4. **Recursos de apoyo**: si necesita archivos adicionales en `recursos/`, `scripts/` o `ejemplos/`.

> **Regla de oro**: si falta información crítica sobre el objetivo, el formato de salida o el alcance, **pregunta al usuario antes de hacer suposiciones**.

---

## Flujo de trabajo

Sigue rigurosamente estas fases para diseñar cada skill:

### Fase 1: Planificación y verificación
1. Define un nombre operativo (`name`): en minúsculas, con guiones, sin superar los 40 caracteres (ej. `auditar-landing`, `generar-reportes`).
2. Redacta la descripción en tercera persona (máximo 220 caracteres), indicando qué hace y cuándo usarlo.
3. Determina el nivel de libertad requerido:
   - **Baja libertad**: para cambios técnicos, comandos, código o base de datos.
   - **Media libertad**: para documentos estructurados, plantillas y redacción.
   - **Alta libertad**: para creatividad o lluvia de ideas.

### Fase 2: Redacción del contenido (`SKILL.md`)
- Incluye el frontmatter YAML exacto al inicio.
- Redacta instrucciones directas y concisas, redactadas como manual de ejecución (sin relleno de tipo artículo o blog).
- Define claramente las entradas necesarias, el flujo paso a paso y el formato exacto de salida.

### Fase 3: Recursos y complementos
- Evalúa si se requieren archivos complementarios:
  - `recursos/`: para guías extensas, listas de referencia o directrices del sistema.
  - `scripts/`: para herramientas ejecutables asociadas.
  - `ejemplos/`: para muestras de entrada/salida.
- Si no aportan valor directo o aumentan la complejidad sin necesidad, no los crees.

### Fase 4: Comprobación final (Checklist)
Antes de entregar el resultado al usuario, valida:
- [ ] El nombre cumple con las normas (minúsculas, guiones, máximo 40 caracteres).
- [ ] La descripción está en tercera persona, en español y con menos de 220 caracteres.
- [ ] La ruta de destino es `.agents/skills/<nombre-del-skill>/`.
- [ ] No contiene claves, tokens ni información sensible.
- [ ] Las instrucciones son operativas y directas.

---

## Formato de salida obligatorio

Al responder a una solicitud de creación de un nuevo skill, entrega la respuesta siguiendo esta estructura estandarizada:

```markdown
### Carpeta
.agents/skills/<nombre-del-skill>/

### SKILL.md
---
name: <nombre-del-skill>
description: <descripción concisa en tercera persona>
---

# <Título del skill>

## Cuándo usar este skill
- ...

## Inputs necesarios
- ...

## Workflow
1) ...
2) ...
3) ...

## Instrucciones
...

## Output (formato exacto)
...

### Recursos opcionales (solo si aplican)
- recursos/<archivo>.md
- scripts/<archivo>
```

---

## Manejo de errores y ajustes

- **Si el resultado no cumple las directrices o el usuario pide modificaciones**: ajusta las restricciones de forma quirúrgica sin perder la estructura estándar.
- **Si hay ambigüedad en los requerimientos del usuario**: detén la generación y formula una pregunta puntual antes de proceder.

