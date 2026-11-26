/**
 * Plantilla de componente — SmartLex Ecuador
 * Ejemplo: ficha de norma (cabecera de metadatos obligatorios + estados).
 *
 * Patrón que debe seguir todo componente nuevo:
 *  1. Tipos explícitos (sin `any`) y esquema Zod si recibe datos externos.
 *  2. Solo tokens (clases `sl-*`, `rounded-control/panel`, `font-mono`).
 *  3. Estados completos: carga (skeleton), error, vacío, dato no verificado.
 *  4. HTML semántico; ARIA solo donde no hay equivalente nativo.
 *  5. Estado nunca comunicado solo con color (icono + texto).
 *  6. Textos listos para i18n (aquí en línea por brevedad; muévelos al archivo de idioma).
 *
 * Ubicación sugerida: src/features/normas/components/FichaNorma.tsx
 */
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, XCircle } from 'lucide-react';

/* ------------------------------------------------------------------------ */
/* 1. Esquema y tipos (el mismo esquema valida la respuesta de Supabase)     */
/* ------------------------------------------------------------------------ */
export const VigenciaSchema = z.enum(['vigente', 'reformada', 'derogada', 'suspendida']);
export type Vigencia = z.infer<typeof VigenciaSchema>;

export const NormaSchema = z.object({
  id: z.string().uuid(),
  tipo: z.string().min(1),                       // Ley, Reglamento, Resolución, Circular…
  numero: z.string().nullable(),                 // p. ej. "NAC-DGERCGC24-00000001"
  titulo: z.string().min(1),
  fuenteOficial: z.string().nullable(),          // Registro Oficial, SRI, Asamblea Nacional…
  registroOficial: z.string().nullable(),        // p. ej. "R.O. Suplemento 123"
  fechaPublicacion: z.string().date().nullable(),// ISO aaaa-mm-dd
  vigencia: VigenciaSchema.nullable(),
  fechaUltimaReforma: z.string().date().nullable(),
  urlOficial: z.string().url().nullable(),
  verificado: z.boolean(),                       // revisado contra la fuente oficial
});
export type Norma = z.infer<typeof NormaSchema>;

/* ------------------------------------------------------------------------ */
/* 2. Utilidades de formato (Ecuador)                                        */
/* ------------------------------------------------------------------------ */
const formatoFecha = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Guayaquil',
});

function fecha(iso: string | null): string | null {
  return iso ? formatoFecha.format(new Date(`${iso}T12:00:00`)) : null;
}

/* ------------------------------------------------------------------------ */
/* 3. Subcomponentes                                                         */
/* ------------------------------------------------------------------------ */
const ESTILOS_VIGENCIA: Record<Vigencia, { texto: string; clase: string; Icono: typeof Info }> = {
  vigente:    { texto: 'Vigente',    clase: 'bg-sl-exito-fondo text-sl-exito',  Icono: CheckCircle2 },
  reformada:  { texto: 'Reformada',  clase: 'bg-sl-aviso-fondo text-sl-aviso',  Icono: AlertTriangle },
  derogada:   { texto: 'Derogada',   clase: 'bg-sl-error-fondo text-sl-error',  Icono: XCircle },
  suspendida: { texto: 'Suspendida', clase: 'bg-sl-aviso-fondo text-sl-aviso',  Icono: AlertTriangle },
};

export function EtiquetaVigencia({ vigencia }: { vigencia: Vigencia | null }) {
  if (!vigencia) return <EtiquetaNoVerificado texto="Vigencia no verificada" />;
  const { texto, clase, Icono } = ESTILOS_VIGENCIA[vigencia];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      <Icono aria-hidden className="size-3.5" />
      {texto}
    </span>
  );
}

function EtiquetaNoVerificado({ texto = 'Pendiente de verificar' }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sl-info-fondo px-2.5 py-0.5 text-xs font-medium text-sl-info">
      <Info aria-hidden className="size-3.5" />
      {texto}
    </span>
  );
}

/** Valor de metadato: si falta, lo dice explícitamente. Nunca inventa. */
function Dato({ valor, mono = false }: { valor: string | null; mono?: boolean }) {
  if (!valor) return <span className="text-sl-texto-secundario italic">No disponible</span>;
  return <span className={mono ? 'cifra' : undefined}>{valor}</span>;
}

/* ------------------------------------------------------------------------ */
/* 4. Componente principal                                                   */
/* ------------------------------------------------------------------------ */
interface FichaNormaProps {
  norma: Norma | undefined;
  cargando: boolean;
  error: Error | null;
  onReintentar?: () => void;
}

export function FichaNorma({ norma, cargando, error, onReintentar }: FichaNormaProps) {
  if (cargando) return <FichaNormaSkeleton />;

  if (error) {
    return (
      <div role="alert" className="border-l-2 border-sl-error bg-sl-error-fondo px-5 py-4 text-sm">
        <p className="font-medium text-sl-error">No se pudo cargar la norma.</p>
        <p className="mt-1 text-sl-texto-secundario">Comprueba tu conexión e inténtalo de nuevo.</p>
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="mt-3 h-9 rounded-control border border-sl-borde bg-sl-superficie px-3 text-sm font-medium hover:bg-sl-superficie-secundaria"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (!norma) {
    return <p className="py-12 text-center text-sl-texto-secundario">No se encontró la norma solicitada.</p>;
  }

  return (
    <article aria-labelledby={`norma-${norma.id}`} className="rounded-panel border border-sl-borde bg-sl-superficie">
      {/* Cabecera: identidad de la norma */}
      <header className="flex flex-col gap-3 px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-sl-texto-secundario">
          <span className="font-medium">{norma.tipo}</span>
          {norma.numero && <span className="cifra">{norma.numero}</span>}
          <EtiquetaVigencia vigencia={norma.vigencia} />
          {!norma.verificado && <EtiquetaNoVerificado />}
        </div>
        <h1 id={`norma-${norma.id}`} className="font-heading text-2xl font-semibold leading-tight text-sl-texto">
          {norma.titulo}
        </h1>
      </header>

      {/* Metadatos obligatorios: lista de definición, separada por una línea fina */}
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-sl-borde px-6 py-5 text-sm sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-sl-texto-secundario">Fuente oficial</dt>
          <dd className="mt-1"><Dato valor={norma.fuenteOficial} /></dd>
        </div>
        <div>
          <dt className="text-xs text-sl-texto-secundario">Publicación</dt>
          <dd className="mt-1">
            <Dato valor={fecha(norma.fechaPublicacion)} mono />
            {norma.registroOficial && (
              <span className="block text-xs text-sl-texto-secundario">{norma.registroOficial}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sl-texto-secundario">Última reforma</dt>
          <dd className="mt-1"><Dato valor={fecha(norma.fechaUltimaReforma)} mono /></dd>
        </div>
        <div>
          <dt className="text-xs text-sl-texto-secundario">Texto original</dt>
          <dd className="mt-1">
            {norma.urlOficial ? (
              <a
                href={norma.urlOficial}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sl-secundario underline-offset-4 hover:underline"
              >
                Ver fuente oficial
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            ) : (
              <Dato valor={null} />
            )}
          </dd>
        </div>
      </dl>

      {/* Aviso legal obligatorio */}
      <p className="border-t border-sl-borde px-6 py-3 text-xs text-sl-texto-secundario md:px-8">
        Información de carácter referencial. No sustituye la asesoría profesional ni el texto oficial
        publicado en el Registro Oficial.
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* 5. Skeleton con la forma real (reserva espacio → CLS ≈ 0)                 */
/* ------------------------------------------------------------------------ */
export function FichaNormaSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando norma" className="rounded-panel border border-sl-borde bg-sl-superficie">
      <div className="flex flex-col gap-3 px-6 py-5 md:px-8">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-7 w-3/4" />
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-sl-borde px-6 py-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 6. Prueba mínima asociada (FichaNorma.test.tsx) — Vitest + Testing Library + axe
 *
 * import { render, screen } from '@testing-library/react';
 * import { axe } from 'vitest-axe';
 *
 * const base: Norma = {
 *   id: '00000000-0000-4000-8000-000000000000', tipo: 'Resolución', numero: null,
 *   titulo: 'Norma de prueba', fuenteOficial: null, registroOficial: null,
 *   fechaPublicacion: null, vigencia: null, fechaUltimaReforma: null,
 *   urlOficial: null, verificado: false,
 * };
 *
 * it('indica los datos que faltan en lugar de inventarlos', () => {
 *   render(<FichaNorma norma={base} cargando={false} error={null} />);
 *   expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
 *   expect(screen.getByText('Vigencia no verificada')).toBeInTheDocument();
 * });
 *
 * it('no tiene infracciones de accesibilidad', async () => {
 *   const { container } = render(<FichaNorma norma={base} cargando={false} error={null} />);
 *   expect(await axe(container)).toHaveNoViolations();
 * });
 * ------------------------------------------------------------------------ */
