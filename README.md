# SmartLex Ecuador

Plataforma tributaria y normativa de Ecuador con trazabilidad cronológica del Registro Oficial, comparativa histórica entre versiones y cálculo de vigencias fiscales conforme al artículo 11 del Código Tributario.

## Estructura del proyecto

- `src/`: aplicación web en React, TypeScript, Vite y Tailwind CSS.
- `supabase/migrations/`: migraciones SQL de esquema, control de acceso por roles, reglas de vigencia tributaria e ingesta normativa.
- `scripts/`: utilidades de carga y pruebas de Registro Oficial usando variables de entorno locales.
- `n8n/workflows/`: definición del flujo automatizado de ingesta jurídica (`smartlex_ingesta_juridica_v2.json`).
- `infra/hostinger-n8n/`: configuración Docker y script de estabilidad para n8n en VPS.

## Requisitos previos

- Node.js 18 o superior y `npm`.
- Un proyecto de Supabase configurado con las migraciones de `supabase/migrations/`.

## Configuración de variables de entorno

1. Copia el archivo de plantilla [.env.example](.env.example) como `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Rellena tus valores reales dentro de `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

> Importante: `.env.local` y `SUPABASEPASS.txt` están excluidos en `.gitignore`. No guardes contraseñas, claves privadas ni tokens en archivos que se vayan a subir al repositorio.

## Ejecución en local

```bash
npm install
npm run dev
```

La aplicación quedará disponible en `http://localhost:5173`.

## Compilación de producción

```bash
npm run build
```

