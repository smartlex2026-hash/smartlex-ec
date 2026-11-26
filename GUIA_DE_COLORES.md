# Guía de Colores Corporativos — SmartLex Ecuador

Este documento es la referencia única de colores de **SmartLex Ecuador**. Define la paleta oficial de la marca, sus reglas de contraste y cómo debe aplicarse tanto en la página web (modo claro y modo oscuro) como en presentaciones, documentos PDF y material corporativo.

---

## 1. Filosofía de la paleta

La identidad visual de SmartLex se apoya en una combinación **sobria, técnica y confiable** inspirada en el logotipo:

- **Color principal — Gris plomo metalizado:** transmite seriedad, rigor legal y solidez institucional.
- **Color secundario — Verde esmeralda:** aporta claridad, orden y acción (botones, enlaces, cifras clave y normativa vigente).
- **Neutros limpios:** garantizan una lectura cómoda y descansada en textos legales extensos y tablas tributarias.

> **Nota sobre el logotipo:** el cubo oficial (`public/smartlex-rubik-logo.svg` y `src/components/common/RubikCubeLogo.tsx`) mantiene intactas sus tres caras originales (menta, lavanda y gris plomo) como rasgo distintivo del símbolo. El resto de la web y los materiales de empresa utilizan exclusivamente esta paleta sobria de **gris plomo + verde esmeralda + neutros**, sin añadir tonos morados ni lavanda.

### Regla de proporción visual (60 – 30 – 10)

| Proporción | Familia de color | Dónde se aplica |
|---|---|---|
| **60 %** | **Neutros** (fondos y aire visual) | Fondo de pantalla, interiores de tarjetas y espacios en blanco |
| **30 %** | **Gris plomo metalizado** | Cabeceras, menús laterales, textos, títulos y botones secundarios |
| **10 %** | **Verde esmeralda** | Botones principales, enlaces, elementos seleccionados y acentos clave |

---

## 2. Los 5 compartimentos de color

### A. Color principal — Gris plomo metalizado

| Nombre | Código | Uso recomendado |
|---|---|---|
| **Plomo Oscuro** | `#2A2D33` | Color base del logo. Cabeceras, títulos fuertes, botones sobrios (modo claro) y bloques destacados (modo oscuro) |
| **Plomo Acero** | `#3E4249` | Estado al pasar el ratón sobre botones plomo y bordes marcados en modo oscuro |
| **Plomo Medio** | `#585D66` | Texto secundario, subtítulos, fechas y pies de tabla en modo claro |
| **Plomo Claro** | `#767B85` | Iconos auxiliares, separadores y detalles metálicos *(no usar para texto pequeño sobre blanco)* |

- **Degradado metalizado oficial** *(solo para detalles puntuales como cabeceras destacadas, tarjetas VIP o insignias)*:
  `linear-gradient(135deg, #3E4249 0%, #2A2D33 100%)`

---

### B. Color secundario — Verde esmeralda

El verde esmeralda se adapta según el fondo para asegurar siempre una lectura nítida:

| Nombre | Código | Dónde usarlo |
|---|---|---|
| **Esmeralda Profundo** | `#047857` | Botones principales, enlaces y texto destacado en **modo claro** |
| **Esmeralda Intenso** | `#065F46` | Al pasar el ratón por un botón en modo claro y texto sobre fondo menta suave |
| **Menta Esmeralda** | `#34D399` | Color del logo. Botones principales, enlaces y focos activos en **modo oscuro** |
| **Menta Luminoso** | `#6EE7B7` | Al pasar el ratón por un botón en modo oscuro y brillos sutiles |
| **Menta Suave (Claro)** | `#ECFDF5` | Fondo de avisos positivos, etiquetas activas o cajas destacadas en **modo claro** |
| **Menta Suave (Oscuro)** | `#0F2922` | Fondo de avisos positivos, etiquetas activas o cajas destacadas en **modo oscuro** |

---

### C. Neutros (fondos, tarjetas, textos y bordes)

#### Modo Claro *(estilo editorial limpio — por defecto)*

| Papel | Nombre | Código | Referencia de uso |
|---|---|---|---|
| **Fondo general** | Blanco hueso frío | `#F7F8FA` | Fondo base de toda la página (menos cansado que el blanco puro) |
| **Tarjetas y paneles** | Blanco puro | `#FFFFFF` | Contenedores, tablas, modales y formularios |
| **Superficie secundaria** | Gris niebla | `#EEF0F4` | Cabeceras de tabla, menús al pasar el ratón, campos inactivos |
| **Borde suave** | Gris bruma | `#DCE0E6` | Líneas de tarjetas, divisores y tablas |
| **Borde marcado** | Gris cemento | `#C5CBD4` | Campos de texto enfocados o contornos de botones neutros |
| **Texto principal** | Carbón plomo | `#1B1E23` | Títulos, párrafos y cifras principales |
| **Texto secundario** | Plomo medio | `#585D66` | Subtítulos, descripciones, fechas y notas al pie |

#### Modo Oscuro *(estilo nocturno sobrio)*

| Papel | Nombre | Código | Referencia de uso |
|---|---|---|---|
| **Fondo general** | Grafito plomo | `#111317` | Fondo base de toda la página (con matiz plomo acorde al logo) |
| **Tarjetas y paneles** | Plomo noche | `#1C1F26` | Contenedores, tablas, modales y barra lateral |
| **Superficie destacada** | Plomo oscuro | `#2A2D33` | Cabeceras de tabla, pestañas activas y botones secundarios |
| **Borde suave** | Grafito línea | `#2E333D` | Líneas de tarjetas, divisores y tablas |
| **Borde marcado** | Plomo acero | `#3E4249` | Contornos interactivos y campos activos |
| **Texto principal** | Blanco nieve | `#F3F4F6` | Títulos, párrafos y cifras principales |
| **Texto secundario** | Gris plata | `#9CA3AF` | Subtítulos, etiquetas y metadatos |

---

### D. Colores de estado (semáforo legal y tributario)

Colores reservados para comunicar situaciones concretas al instante (vigencia de normas, reformas, plazos y alertas):

| Estado | Modo claro (texto / borde) | Modo claro (fondo) | Modo oscuro (texto / borde) | Modo oscuro (fondo) | Uso típico en SmartLex |
|---|---|---|---|---|---|
| **Vigente / Correcto** | `#047857` | `#ECFDF5` | `#34D399` | `#0F2922` | Artículo vigente, texto añadido, cálculo correcto |
| **Aviso / Atención** | `#B45309` | `#FFFBEB` | `#FBBF24` | `#2B210B` | Reforma parcial, plazo próximo, advertencia |
| **Derogado / Error** | `#B91C1C` | `#FEF2F2` | `#F87171` | `#2D1416` | Norma derogada, texto eliminado, error de validación |
| **Información** | `#2B5B84` | `#EFF6FF` | `#60A5FA` | `#132033` | Nota aclaratoria, contexto normativo o ayuda |

---

## 3. Guía rápida de contrastes

Todos los pares recomendados cumplen con niveles altos de legibilidad (mínimo **4,5:1** en texto normal y **7:1+** en textos principales).

### Combinaciones aprobadas

| Elemento | Modo claro | Modo oscuro |
|---|---|---|
| **Botón principal** | Fondo `#047857` + texto `#FFFFFF` | Fondo `#34D399` + texto `#111317` |
| **Botón secundario (plomo)** | Fondo `#2A2D33` + texto `#FFFFFF` | Fondo `#2A2D33` + texto `#F3F4F6` + borde `#3E4249` |
| **Botón discreto** | Fondo `#FFFFFF` + texto `#1B1E23` + borde `#DCE0E6` | Fondo `#1C1F26` + texto `#F3F4F6` + borde `#2E333D` |
| **Enlace destacado** | Texto `#047857` sobre `#FFFFFF` o `#F7F8FA` | Texto `#34D399` sobre `#111317` o `#1C1F26` |
| **Etiqueta vigente** | Fondo `#ECFDF5` + texto `#065F46` + borde `#A7F3D0` | Fondo `#0F2922` + texto `#34D399` + borde `#065F46` |
| **Selección de texto** | Fondo `#A7F3D0` + texto `#1B1E23` | Fondo `#34D399` + texto `#111317` |

### Combinaciones que debes evitar

- **No pongas texto blanco sobre verde menta (`#34D399`):** apenas tiene contraste y cuesta leerlo. Usa texto oscuro `#111317` sobre el menta, o cambia el fondo del botón a esmeralda profundo `#047857` si quieres letras blancas.
- **No uses verde menta (`#34D399`) como letra sobre fondo blanco:** resulta demasiado pálido. En modo claro usa siempre `#047857` o `#065F46`.
- **No uses plomo claro (`#767B85`) en párrafos pequeños sobre blanco:** resérvalo para iconos o líneas; para texto secundario utiliza `#585D66`.
- **No abuses de los degradados metálicos en fondos grandes:** mantenlos solo en detalles pequeños para que la interfaz siga siendo limpia y rápida de leer.

---

## 4. Referencia lista para coordinar con la web

Cuando decidas conectar esta guía con los estilos de la página web (`src/index.css`), este bloque centraliza toda la paleta con nombres claros para que toda la aplicación comparta exactamente los mismos colores:

```css
/* Paleta oficial SmartLex Ecuador — Modo Claro (por defecto) */
:root,
html.theme-light {
  /* Marca */
  --color-principal: #2A2D33;
  --color-principal-hover: #3E4249;
  --color-secundario: #047857;
  --color-secundario-hover: #065F46;
  --color-secundario-suave: #ECFDF5;
  --color-texto-sobre-secundario: #FFFFFF;

  /* Superficies y fondos */
  --color-fondo: #F7F8FA;
  --color-superficie: #FFFFFF;
  --color-superficie-secundaria: #EEF0F4;

  /* Textos */
  --color-texto: #1B1E23;
  --color-texto-secundario: #585D66;
  --color-icono-sutil: #767B85;

  /* Bordes */
  --color-borde: #DCE0E6;
  --color-borde-fuerte: #C5CBD4;

  /* Estados */
  --color-exito: #047857;
  --color-exito-fondo: #ECFDF5;
  --color-aviso: #B45309;
  --color-aviso-fondo: #FFFBEB;
  --color-error: #B91C1C;
  --color-error-fondo: #FEF2F2;
  --color-info: #2B5B84;
  --color-info-fondo: #EFF6FF;
}

/* Paleta oficial SmartLex Ecuador — Modo Oscuro */
html.theme-dark {
  /* Marca */
  --color-principal: #2A2D33;
  --color-principal-hover: #3E4249;
  --color-secundario: #34D399;
  --color-secundario-hover: #6EE7B7;
  --color-secundario-suave: #0F2922;
  --color-texto-sobre-secundario: #111317;

  /* Superficies y fondos */
  --color-fondo: #111317;
  --color-superficie: #1C1F26;
  --color-superficie-secundaria: #2A2D33;

  /* Textos */
  --color-texto: #F3F4F6;
  --color-texto-secundario: #9CA3AF;
  --color-icono-sutil: #767B85;

  /* Bordes */
  --color-borde: #2E333D;
  --color-borde-fuerte: #3E4249;

  /* Estados */
  --color-exito: #34D399;
  --color-exito-fondo: #0F2922;
  --color-aviso: #FBBF24;
  --color-aviso-fondo: #2B210B;
  --color-error: #F87171;
  --color-error-fondo: #2D1416;
  --color-info: #60A5FA;
  --color-info-fondo: #132033;
}
```
