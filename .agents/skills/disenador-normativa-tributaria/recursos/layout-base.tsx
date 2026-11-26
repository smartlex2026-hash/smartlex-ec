/**
 * Layout base — SmartLex Ecuador
 * Shell de la app: barra lateral plegable + barra superior (migas, búsqueda
 * global Ctrl/Cmd+K, tema) + zona de contenido.
 *
 * Dependencias: React, lucide-react, Tailwind 4 con recursos/tokens.css.
 * Sin router obligatorio: adapta `NavItem.href` y `useFiltrosUrl` a tu router
 * (React Router / TanStack Router / Next.js) si lo hay.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  CalendarDays,
  ChevronRight,
  History,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
} from 'lucide-react';

/* ------------------------------------------------------------------------ */
/* Tipos                                                                     */
/* ------------------------------------------------------------------------ */
interface NavItem {
  id: string;
  etiqueta: string;
  href: string;
  icono: typeof BookOpen;
}

interface Miga {
  etiqueta: string;
  href?: string; // la última miga no lleva href (página actual)
}

interface AppShellProps {
  migas: Miga[];
  rutaActiva: string;
  /** Barra de filtros persistentes de la vista (opcional) */
  filtros?: ReactNode;
  children: ReactNode;
}

const NAVEGACION: NavItem[] = [
  { id: 'panel', etiqueta: 'Resumen', href: '/', icono: LayoutDashboard },
  { id: 'normas', etiqueta: 'Normativa', href: '/normas', icono: BookOpen },
  { id: 'reformas', etiqueta: 'Reformas', href: '/reformas', icono: History },
  { id: 'calendario', etiqueta: 'Calendario fiscal', href: '/calendario', icono: CalendarDays },
  { id: 'calculadoras', etiqueta: 'Calculadoras', href: '/calculadoras', icono: Calculator },
  { id: 'alertas', etiqueta: 'Alertas', href: '/alertas', icono: Bell },
];

/* ------------------------------------------------------------------------ */
/* Hooks                                                                     */
/* ------------------------------------------------------------------------ */

/** Tema claro/oscuro con clase en <html>, respetando la preferencia del sistema. */
function useTema() {
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    const guardado = localStorage.getItem('tema');
    if (guardado === 'light' || guardado === 'dark') return guardado;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark');
    html.classList.add(`theme-${tema}`);
    localStorage.setItem('tema', tema);
  }, [tema]);

  return { tema, alternar: () => setTema((t) => (t === 'light' ? 'dark' : 'light')) };
}

/** Atajo global Ctrl/Cmd+K y "/" (fuera de campos de texto). */
function useAtajoBusqueda(abrir: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const enCampo = (e.target as HTMLElement).closest('input, textarea, [contenteditable]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        abrir();
      } else if (e.key === '/' && !enCampo) {
        e.preventDefault();
        abrir();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abrir]);
}

/**
 * Filtros persistentes en la URL (?tipo=resolucion&vigencia=vigente).
 * Compartibles, sobreviven a recargas y al botón "atrás".
 */
export function useFiltrosUrl<T extends Record<string, string>>(valoresIniciales: T) {
  const leer = useCallback((): T => {
    const params = new URLSearchParams(window.location.search);
    const resultado = { ...valoresIniciales };
    for (const clave of Object.keys(valoresIniciales) as (keyof T)[]) {
      const valor = params.get(String(clave));
      if (valor !== null) resultado[clave] = valor as T[keyof T];
    }
    return resultado;
  }, [valoresIniciales]);

  const [filtros, setFiltros] = useState<T>(leer);

  useEffect(() => {
    const onPop = () => setFiltros(leer());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [leer]);

  const actualizar = (cambios: Partial<T>) => {
    const siguiente = { ...filtros, ...cambios };
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(siguiente)) {
      if (valor) params.set(clave, valor);
    }
    window.history.pushState(null, '', `${window.location.pathname}?${params}`);
    setFiltros(siguiente);
  };

  return [filtros, actualizar] as const;
}

/* ------------------------------------------------------------------------ */
/* Componentes                                                               */
/* ------------------------------------------------------------------------ */

export function AppShell({ migas, rutaActiva, filtros, children }: AppShellProps) {
  const [plegada, setPlegada] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const abrirBusqueda = useCallback(() => setBusquedaAbierta(true), []);
  useAtajoBusqueda(abrirBusqueda);

  return (
    <div className="min-h-dvh bg-sl-fondo text-sl-texto">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-toast) focus:rounded-control focus:bg-sl-superficie focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>

      <Sidebar plegada={plegada} rutaActiva={rutaActiva} />

      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-(--duracion-base) ease-(--curva-suave) ${
          plegada ? 'md:pl-(--ancho-sidebar-plegada)' : 'md:pl-(--ancho-sidebar)'
        }`}
      >
        <Topbar
          migas={migas}
          plegada={plegada}
          onAlternarSidebar={() => setPlegada((p) => !p)}
          onAbrirBusqueda={abrirBusqueda}
        />

        {filtros && (
          <div className="border-b border-sl-borde bg-sl-superficie px-6 py-3">{filtros}</div>
        )}

        <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-(--ancho-contenido)">{children}</div>
        </main>

        <footer className="border-t border-sl-borde px-8 py-4 text-xs text-sl-texto-secundario">
          Información de carácter referencial. No sustituye la asesoría profesional ni el texto
          oficial publicado en el Registro Oficial.
        </footer>
      </div>

      <PaletaComandos abierta={busquedaAbierta} onCerrar={() => setBusquedaAbierta(false)} />
    </div>
  );
}

function Sidebar({ plegada, rutaActiva }: { plegada: boolean; rutaActiva: string }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-(--z-sidebar) hidden flex-col border-r border-sl-borde bg-sl-superficie transition-[width] duration-(--duracion-base) ease-(--curva-suave) md:flex ${
        plegada ? 'w-(--ancho-sidebar-plegada)' : 'w-(--ancho-sidebar)'
      }`}
    >
      <div className="flex h-(--alto-topbar) items-center gap-3 border-b border-sl-borde px-4">
        {/* Sustituir por <RubikCubeLogo /> del proyecto */}
        <span aria-hidden className="size-8 shrink-0 rounded-control bg-sl-principal" />
        {!plegada && <span className="font-heading text-base font-semibold">SmartLex</span>}
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {NAVEGACION.map(({ id, etiqueta, href, icono: Icono }) => {
            const activa = rutaActiva === href;
            return (
              <li key={id}>
                <a
                  href={href}
                  aria-current={activa ? 'page' : undefined}
                  aria-label={plegada ? etiqueta : undefined}
                  title={plegada ? etiqueta : undefined}
                  className={`flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-(--duracion-rapida) ${
                    activa
                      ? 'bg-sl-secundario-suave font-medium text-sl-secundario'
                      : 'text-sl-texto-secundario hover:bg-sl-superficie-secundaria hover:text-sl-texto'
                  }`}
                >
                  <Icono aria-hidden className="size-5 shrink-0" />
                  {!plegada && <span className="truncate">{etiqueta}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

interface TopbarProps {
  migas: Miga[];
  plegada: boolean;
  onAlternarSidebar: () => void;
  onAbrirBusqueda: () => void;
}

function Topbar({ migas, plegada, onAlternarSidebar, onAbrirBusqueda }: TopbarProps) {
  const { tema, alternar } = useTema();
  const esMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

  return (
    <header className="sticky top-0 z-(--z-topbar) flex h-(--alto-topbar) items-center gap-4 border-b border-sl-borde bg-sl-superficie/90 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onAlternarSidebar}
        aria-label={plegada ? 'Expandir menú lateral' : 'Plegar menú lateral'}
        aria-expanded={!plegada}
        className="hidden size-10 items-center justify-center rounded-control text-sl-texto-secundario hover:bg-sl-superficie-secundaria md:inline-flex"
      >
        {plegada ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
      </button>

      <nav aria-label="Migas de pan" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-sm">
          {migas.map((miga, i) => (
            <li key={miga.etiqueta} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-4 shrink-0 text-sl-icono-sutil" />}
              {miga.href ? (
                <a href={miga.href} className="truncate text-sl-texto-secundario hover:text-sl-texto">
                  {miga.etiqueta}
                </a>
              ) : (
                <span aria-current="page" className="truncate font-medium text-sl-texto">
                  {miga.etiqueta}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onAbrirBusqueda}
        className="flex h-10 w-full max-w-sm items-center gap-2 rounded-control border border-sl-borde bg-sl-fondo px-3 text-sm text-sl-texto-secundario hover:border-sl-borde-fuerte"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">Buscar normas, artículos, plazos…</span>
        <kbd className="hidden rounded border border-sl-borde px-1.5 font-mono text-xs sm:inline">
          {esMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <button
        type="button"
        onClick={alternar}
        aria-label={tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        className="inline-flex size-10 items-center justify-center rounded-control text-sl-texto-secundario hover:bg-sl-superficie-secundaria"
      >
        {tema === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
      </button>
    </header>
  );
}

/**
 * Paleta de comandos con <dialog> nativo (gestiona foco, Esc y capa superior).
 * Conecta `onBuscar` a la RPC de búsqueda full-text con debounce de 250-300 ms.
 */
function PaletaComandos({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [consulta, setConsulta] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (abierta && !dialog.open) dialog.showModal();
    if (!abierta && dialog.open) dialog.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={onCerrar}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      className="mt-[12vh] w-full max-w-xl rounded-panel border border-sl-borde bg-sl-superficie p-0 text-sl-texto shadow-overlay backdrop:bg-(--color-velo)"
    >
      <h2 id={idTitulo} className="sr-only">Búsqueda global</h2>
      <div className="flex items-center gap-3 border-b border-sl-borde px-4">
        <Search aria-hidden className="size-5 text-sl-icono-sutil" />
        <input
          autoFocus
          type="search"
          value={consulta}
          maxLength={200}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Ej.: retenciones IVA, art. 56 LRTI, RIMPE…"
          aria-label="Buscar en la normativa"
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-sl-texto-secundario"
        />
      </div>
      <div role="status" aria-live="polite" className="px-4 py-6 text-sm text-sl-texto-secundario">
        {consulta ? 'Buscando…' : 'Escribe para buscar en leyes, reglamentos, resoluciones y circulares.'}
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------------ */
/* Ejemplo de uso                                                            */
/* ------------------------------------------------------------------------ */
export function EjemploPaginaNormas() {
  const [filtros, setFiltros] = useFiltrosUrl({ tipo: '', vigencia: 'vigente' });

  return (
    <AppShell
      rutaActiva="/normas"
      migas={[{ etiqueta: 'Inicio', href: '/' }, { etiqueta: 'Normativa' }]}
      filtros={
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-sl-texto-secundario">Tipo</span>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ tipo: e.target.value })}
              className="h-9 rounded-control border border-sl-borde bg-sl-superficie px-2"
            >
              <option value="">Todos</option>
              <option value="ley">Ley</option>
              <option value="reglamento">Reglamento</option>
              <option value="resolucion">Resolución</option>
              <option value="circular">Circular</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sl-texto-secundario">Vigencia</span>
            <select
              value={filtros.vigencia}
              onChange={(e) => setFiltros({ vigencia: e.target.value })}
              className="h-9 rounded-control border border-sl-borde bg-sl-superficie px-2"
            >
              <option value="">Todas</option>
              <option value="vigente">Vigente</option>
              <option value="reformada">Reformada</option>
              <option value="derogada">Derogada</option>
            </select>
          </label>
        </div>
      }
    >
      <h1 className="font-heading text-3xl font-bold">Normativa tributaria</h1>
      {/* Tabla de normas: ver plantilla-componente.tsx */}
    </AppShell>
  );
}
