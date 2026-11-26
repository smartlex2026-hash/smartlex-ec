import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { NormIngestionModal } from './components/admin/NormIngestionModal';
import { RubikCubeLogo } from './components/common/RubikCubeLogo';
import {
  BookOpen,
  Scale,
  Globe,
  Table2,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ChevronRight,
  ChevronDown,
  Lock,
  Sparkles,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  History,
  MessageSquare,
  BellRing,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Plus,
  RefreshCw,
  Crown,
  Send,
  Upload,
  Bookmark,
  Tag,
  X,
  FileCode,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  CornerDownRight,
  SplitSquareVertical,
  Hourglass,
  Flag,
  AlertCircle,
  Sun,
  Moon,
  Star,
  Menu,
  SlidersHorizontal,
  LogOut
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
type PlanCode = 'free' | 'premium' | 'professional';
type MainTab = 'reader' | 'tables' | 'calculators' | 'reviewer' | 'chat';
type LegalStatus = 'vigente' | 'vigente_reformado' | 'derogado';

interface TaxConcept {
  id: string;
  code: string;
  name: string;
  description: string;
  concept_type?: string;
  parent_id: string | null;
  sort_order: number;
}

interface Norm {
  id: string;
  code: string;
  title: string;
  norm_type: string;
  publication_date?: string | null;
  hierarchy_level: string;
  is_secondary: boolean;
  drive_folder_path: string;
  storage_object_path: string;
}

interface NormStructure {
  id: string;
  norm_id: string;
  identifier?: string;
  label: string;
  display_label?: string;
  is_innumerado?: boolean;
  after_article?: string | null;
  innumerado_order?: number | null;
  title: string;
  content: string;
  version_number: number;
  is_current: boolean;
  valid_from: string | null;
  valid_to: string | null;
  reform_source_cite: string | null;
  official_registry?: string | null;
  summary_change?: string | null;
  legal_status: LegalStatus;
  review_status: string;
  order_index: number;
  norms?: Norm;
  structure_type?: string;
  parent_id?: string | null;
  parent_title?: string | null;
  parent_chapter?: string | null;
  // Vigencia tributaria (Art. 11 Código Tributario)
  ro_published_on?: string | null;
  tax_periodicity?: string | null;
  validity_rule?: string | null;
  is_fe_erratas?: boolean;
  is_fe_erratas_replaced?: boolean;
  validity_display_label?: string | null;
  manual_validity_override?: boolean;
  // Jerarquía de sub-elementos (literal / numeral / párrafo) y control de diff
  sub_kind?: string | null;
  sub_code?: string | null;
  display_marker?: string | null;
  article_identifier?: string | null;
  changed_in_this_version?: boolean;
  superseded_duplicate?: boolean;
  obsolete_subelement?: boolean;
  table_diff_mode?: string | null;
}

const SUB_ELEMENT_TYPES = new Set(['literal', 'numeral', 'paragraph', 'item']);
const isSubElementType = (structureType?: string | null): boolean =>
  Boolean(structureType && SUB_ELEMENT_TYPES.has(structureType));

// ============================================================================
// VIGENCIA TRIBUTARIA (ART. 11 CÓDIGO TRIBUTARIO)
// ============================================================================
const periodicityLabel = (p?: string | null): string => {
  if (p === 'annual') return 'Imp. anual';
  if (p === 'monthly') return 'Imp. mensual';
  return 'Vigencia';
};

const formatValidityRange = (
  from: string | null | undefined,
  to: string | null | undefined,
  isDerogated = false
): string => {
  const f = from || '—';
  const t = to || (isDerogated ? 'Derogado' : 'Presente');
  return f === t ? f : `${f} al ${t}`;
};

const formatEffectiveRange = (
  effectiveDuring?: string | null,
  fiscalYear?: number
): string => {
  if (effectiveDuring) {
    const m = effectiveDuring.match(/^([[(])([^,]*),([^\]\)]*)([\]\)])$/);
    if (m) {
      const [, openBr, startRaw, endRaw, closeBr] = m;
      let start = startRaw || '—';
      if (openBr === '(' && start !== '—') {
        const d = new Date(`${start}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        start = d.toISOString().slice(0, 10);
      }
      let end = endRaw || 'Presente';
      if (endRaw && closeBr === ')') {
        const d = new Date(`${endRaw}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        end = d.toISOString().slice(0, 10);
      }
      return start === end ? start : `${start} al ${end}`;
    }
  }
  return fiscalYear ? `${fiscalYear}-01-01 al ${fiscalYear}-12-31` : '—';
};

interface NormativeTable {
  id: string;
  norm_id: string;
  structure_id: string | null;
  table_code: string;
  title: string;
  subtitle: string;
  category: string;
  fiscal_year: number;
  effective_during?: string | null;
  columns_schema: Array<{ key: string; label: string; type: string }>;
  rows_data: Array<Record<string, any>>;
  notes: string | null;
  is_active?: boolean;
  article_structure_id?: string | null;
  sub_identifier?: string | null;
  table_diff_mode?: string | null;
  emitter_norm_id?: string | null;
  emitter_norm_code?: string | null;
  emitter_norm_title?: string | null;
  emitter_structure_id?: string | null;
}

// ============================================================================
// INDICADOR DE VIGENCIA LEGAL ESTILO MINIMALISTA MONOCROMÁTICO
// ============================================================================
export const LegalStatusButton: React.FC<{
  status: LegalStatus;
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, size = 'md' }) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[10px] rounded-md gap-1.5'
      : size === 'lg'
        ? 'px-3 py-1 text-xs rounded-lg gap-2'
        : 'px-2.5 py-1 text-[11px] rounded-md gap-1.5';

  if (status === 'vigente') {
    return (
      <span
        title="Artículo vigente sin reformas posteriores"
        className={`inline-flex items-center font-semibold tracking-wide bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[var(--color-texto)] select-none ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secundario)] shadow-[0_0_6px_rgba(62,207,142,0.85)] shrink-0" />
        <span>Vigente</span>
      </span>
    );
  }

  if (status === 'vigente_reformado') {
    return (
      <span
        title="Artículo vigente con reformas históricas registradas"
        className={`inline-flex items-center font-semibold tracking-wide bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[var(--color-texto)] select-none ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secundario)] shadow-[0_0_6px_rgba(62,207,142,0.85)] shrink-0" />
        <span>Vigente</span>
        <span className="text-[var(--color-texto-secundario)]">·</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-aviso)] shadow-[0_0_6px_rgba(245,158,11,0.85)] shrink-0" />
        <span>Reformado</span>
      </span>
    );
  }

  return (
    <span
      title="Disposición derogada expresamente"
      className={`inline-flex items-center font-semibold tracking-wide bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto-secundario)] select-none ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] shadow-[0_0_6px_rgba(239,68,68,0.85)] shrink-0" />
      <span>Derogado</span>
    </span>
  );
};

// ============================================================================
// EDITOR DE VIGENCIA RESERVADO AL ADMINISTRADOR DEL SISTEMA
// ============================================================================
const isRealUuid = (id?: string | null): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

export const AdminValidityEditor: React.FC<{
  structureId: string;
  initialFrom?: string | null;
  initialTo?: string | null;
  compact?: boolean;
  onSave: (structureId: string, validFrom: string, validUntil: string) => Promise<boolean>;
}> = ({ structureId, initialFrom, initialTo, compact = false, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [fromVal, setFromVal] = useState(initialFrom || '');
  const [toVal, setToVal] = useState(initialTo || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFromVal(initialFrom || '');
    setToVal(initialTo || '');
    setEditing(false);
  }, [structureId, initialFrom, initialTo]);

  if (!isRealUuid(structureId)) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`inline-flex items-center gap-1 rounded-md border border-[var(--color-aviso-borde)] bg-[var(--color-aviso-fondo)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-aviso)] font-bold transition cursor-pointer ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
        }`}
        title="Editar fechas de vigencia manualmente (Administrador)"
      >
        <Tag className="w-3 h-3 shrink-0" />
        <span>Editar vigencia</span>
      </button>
    );
  }

  return (
    <div className="mt-1.5 w-full rounded-lg border border-[var(--color-aviso-borde)] bg-[var(--color-superficie-secundaria)] p-2 flex flex-wrap items-end gap-2 text-[10px]">
      <div>
        <label className="block text-[var(--color-texto-secundario)] font-semibold mb-0.5">Desde</label>
        <input
          type="date"
          value={fromVal}
          onChange={e => setFromVal(e.target.value)}
          className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded px-1.5 py-0.5 text-[var(--color-texto)] font-mono focus:outline-none focus:border-[var(--color-secundario)]"
        />
      </div>
      <div>
        <label className="block text-[var(--color-texto-secundario)] font-semibold mb-0.5">Hasta (vacío = Presente)</label>
        <input
          type="date"
          value={toVal}
          onChange={e => setToVal(e.target.value)}
          className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded px-1.5 py-0.5 text-[var(--color-texto)] font-mono focus:outline-none focus:border-[var(--color-secundario)]"
        />
      </div>
      <div className="flex items-center gap-1.5">
        {toVal && (
          <button
            type="button"
            onClick={() => setToVal('')}
            className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-semibold cursor-pointer"
          >
            Sin fin
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const ok = await onSave(structureId, fromVal, toVal);
            setSaving(false);
            if (ok) setEditing(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] disabled:opacity-60 font-bold cursor-pointer"
        >
          <Check className="w-3 h-3" />
          <span>{saving ? 'Guardando...' : 'Guardar'}</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setFromVal(initialFrom || '');
            setToVal(initialTo || '');
            setEditing(false);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-semibold cursor-pointer"
        >
          <X className="w-3 h-3" />
          <span>Cancelar</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// AUTO-FORMATEADOR DE TABLAS TRIBUTARIAS EN TEXTO PLANO
// ============================================================================
const normalizeLoosePipeTables = (text: string): string => {
  if (!text || !text.includes('|')) return text;
  const rawLines = text.split('\n');
  const hasPipe = (s: string) => {
    const t = s.trim();
    return t.includes('|') && !t.startsWith('//');
  };
  return rawLines
    .map((line, idx) => {
      const t = line.trim();
      if (!t.includes('|')) return line;
      const isSeparator = /^\|?[\s\-:]+(?:\|[\s\-:]+)+\|?$/.test(t);
      const prevHasPipe = idx > 0 && hasPipe(rawLines[idx - 1]);
      const nextHasPipe = idx < rawLines.length - 1 && hasPipe(rawLines[idx + 1]);
      if (isSeparator || prevHasPipe || nextHasPipe) {
        let normalized = t;
        if (!normalized.startsWith('|')) normalized = `| ${normalized}`;
        if (!normalized.endsWith('|')) normalized = `${normalized} |`;
        return normalized;
      }
      return line;
    })
    .join('\n');
};

const autoFormatRawTables = (text: string): string => {
  if (!text) return '';
  const lines = normalizeLoosePipeTables(text).split('\n');
  const result: string[] = [];
  let inRawTable = false;
  let rawTableRows: string[][] = [];

  const flushRawTable = () => {
    if (rawTableRows.length > 0) {
      result.push('| Fracción Básica ($) | Exceso Hasta ($) | Impuesto Fracción Básica ($) | % Excedente |');
      result.push('| :--- | :--- | :--- | :--- |');
      rawTableRows.forEach(row => {
        result.push(`| ${row.join(' | ')} |`);
      });
      rawTableRows = [];
      inRawTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Omitir cabeceras ruidosas repetidas del PDF
    if (/^(?:FRACCI[ÓO]N\s+B[ÁA]SICA|B[ÁA]SICA\s+HASTA|EXCESO\s+HASTA|FRACCI[ÓO]N\s+FRACCI[ÓO]N)/i.test(line)) {
      continue;
    }
    // Detectar filas numéricas con porcentajes (ej: "0 7.680 0 0%" o "61.440 En adelante 7.296 25%")
    const rowMatch = line.match(/^(\$?\s*[\d.,]+)\s+(\$?\s*[\d.,]+|En adelante)\s+(\$?\s*[\d.,]+)\s+([\d.,]+%?)$/i);
    if (rowMatch) {
      inRawTable = true;
      rawTableRows.push([
        rowMatch[1],
        rowMatch[2],
        rowMatch[3],
        rowMatch[4].endsWith('%') ? rowMatch[4] : `${rowMatch[4]}%`
      ]);
    } else {
      if (inRawTable) {
        flushRawTable();
      }
      result.push(lines[i]);
    }
  }
  if (inRawTable) {
    flushRawTable();
  }
  return result.join('\n');
};

// ============================================================================
// VISOR DE TABLAS Y CONTENIDO MARKDOWN (CON JUSTIFICACIÓN A ANCHO COMPLETO)
// ============================================================================
const startsNewLegalParagraph = (prevLine: string, nextLine: string): boolean => {
  const prev = prevLine.trim();
  const next = nextLine.trim();
  if (!prev || !next) return true;
  if (
    /^(?:(?:\d+(?:\.\d+)*|[a-zA-Z])[.)]\s+|[-•*]\s+|Nota:|Art(?:[íi]culo|\.)?\s+|DISPOSICI[ÓO]N|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA|\*\*)/i.test(
      next
    )
  ) {
    return true;
  }
  if (/[.:;”"!?]$/.test(prev)) {
    return true;
  }
  return false;
};

const unwrapLegalParagraphLines = (rawLines: string[]): string[] => {
  const paragraphs: string[] = [];
  let current = '';

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) {
      if (current) {
        paragraphs.push(current);
        current = '';
      }
      continue;
    }
    if (!current) {
      current = line;
    } else if (startsNewLegalParagraph(current, line)) {
      paragraphs.push(current);
      current = line;
    } else {
      current = `${current} ${line}`;
    }
  }
  if (current) {
    paragraphs.push(current);
  }
  return paragraphs;
};

const getAdaptiveCellClass = (text: unknown, isHeader = false) => {
  const str = String(text ?? '').trim();
  if (isHeader) {
    return str.length > 26
      ? 'min-w-[130px] max-w-[260px] whitespace-normal break-words leading-snug'
      : 'whitespace-nowrap';
  }
  if (str.length > 48) {
    return 'min-w-[180px] max-w-[340px] whitespace-normal break-words leading-relaxed';
  }
  if (str.length > 28) {
    return 'min-w-[130px] max-w-[240px] whitespace-normal break-words leading-snug';
  }
  return 'whitespace-nowrap';
};

const CollapsibleMarkdownTable: React.FC<{
  headers: string[];
  rows: string[][];
  caption?: string;
  defaultOpen?: boolean;
}> = ({ headers, rows, caption, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const cleanCaption = caption ? caption.replace(/^\*\*|\*\*$/g, '').trim() : '';

  return (
    <div className="my-3.5 w-full flex justify-center">
      <div className="w-fit max-w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-md overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-primario)]/15 text-[var(--color-primario)] text-[10px] font-bold uppercase tracking-wider shrink-0">
              Tabla
            </span>
            <span className="text-[11px] font-bold text-[var(--color-texto)] truncate max-w-[420px]">
              {cleanCaption || `${rows.length} ${rows.length === 1 ? 'fila' : 'filas'} · ${headers.length} col.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-[var(--color-primario)] hover:bg-[var(--color-primario)]/10 transition shrink-0 cursor-pointer"
            title={isOpen ? 'Colapsar tabla' : 'Desplegar tabla'}
          >
            <span>{isOpen ? 'Colapsar' : 'Desplegar'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {isOpen && (
          <div className="overflow-x-auto max-w-full">
            <table className="w-auto max-w-full text-left text-xs">
              {headers.length > 0 && (
                <thead className="bg-[var(--color-superficie-secundaria)]/70 text-[var(--color-secundario)] uppercase text-[11px] font-extrabold border-b border-[var(--color-borde)]">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className={`py-2.5 px-3 ${getAdaptiveCellClass(h, true)}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-[var(--color-borde)] bg-[var(--color-superficie)]">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--color-superficie-hover)] transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`py-2 px-3 text-[var(--color-texto)] font-medium ${getAdaptiveCellClass(cell)}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const renderMarkdownContent = (content: string) => {
  if (!content) return null;

  const formattedContent = autoFormatRawTables(content);
  const lines = formattedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let tableCaption = '';
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const unwrapped = unwrapLegalParagraphLines(currentParagraphLines);
      for (const paraText of unwrapped) {
        if (paraText) {
          elements.push(
            <p
              key={`p-${elements.length}`}
              className="text-xs sm:text-[13px] leading-relaxed text-[var(--color-texto)] mb-2.5 text-justify w-full"
            >
              {paraText}
            </p>
          );
        }
      }
      currentParagraphLines = [];
    }
  };

  const flushTable = () => {
    if (inTable && (tableHeader.length > 0 || tableRows.length > 0)) {
      elements.push(
        <CollapsibleMarkdownTable
          key={`tbl-${elements.length}`}
          headers={tableHeader}
          rows={tableRows}
          caption={tableCaption || undefined}
          defaultOpen={true}
        />
      );
      inTable = false;
      tableHeader = [];
      tableRows = [];
      tableCaption = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        // Si la última línea no vacía antes de la tabla es un título corto en negrita o rótulo de tabla, úsala como título colapsable
        while (
          currentParagraphLines.length > 0 &&
          currentParagraphLines[currentParagraphLines.length - 1].trim() === ''
        ) {
          currentParagraphLines.pop();
        }
        if (currentParagraphLines.length > 0) {
          const candidate = currentParagraphLines[currentParagraphLines.length - 1].trim();
          const isTableTitle =
            candidate.length <= 160 &&
            ((candidate.startsWith('**') && candidate.endsWith('**')) ||
              /^(TABLA|CUADRO|ANEXO)\b/i.test(candidate));
          if (isTableTitle) {
            tableCaption = candidate.replace(/^\*\*|\*\*$/g, '').trim();
            currentParagraphLines.pop();
          }
        }
      }
      flushParagraph();
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        flushTable();
      }
      currentParagraphLines.push(lines[i]);
    }
  }

  flushTable();
  flushParagraph();

  return <div className="w-full text-justify">{elements}</div>;
};

// ============================================================================
// COMPARADOR DIFERENCIAL ENTRE VERSIONES ADYACENTES (v_k vs v_{k-1})
// ============================================================================
interface ParsedTableData {
  header: string[];
  rows: string[][];
}

interface ParsedDocStructure {
  paragraphs: string[];
  tables: ParsedTableData[];
  /** Fragmentos de texto intercalados antes/entre/después de cada tabla: textChunks.length === tables.length + 1 */
  textChunks: string[];
  notes: string[];
}

const parseDocForDiff = (rawContent: string): ParsedDocStructure => {
  const formatted = autoFormatRawTables(rawContent || '');
  const lines = formatted.split('\n');
  const paragraphs: string[] = [];
  const tables: ParsedTableData[] = [];
  const textChunks: string[] = [];
  const notes: string[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentPara: string[] = [];
  let currentChunkParas: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const unwrapped = unwrapLegalParagraphLines(currentPara);
      for (const text of unwrapped) {
        if (text) {
          if (/^Nota:/i.test(text)) {
            notes.push(text);
          } else {
            paragraphs.push(text);
            currentChunkParas.push(text);
          }
        }
      }
      currentPara = [];
    }
  };

  const flushTbl = () => {
    if (inTable && (tableHeader.length > 0 || tableRows.length > 0)) {
      textChunks.push(currentChunkParas.join('\n\n'));
      currentChunkParas = [];
      tables.push({ header: tableHeader, rows: tableRows });
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushPara();
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
    } else if (trimmed === '') {
      if (inTable) flushTbl();
      flushPara();
    } else {
      if (inTable) flushTbl();
      if (/^Nota:/i.test(trimmed)) {
        flushPara();
        notes.push(trimmed);
      } else {
        currentPara.push(rawLine);
      }
    }
  }
  flushTbl();
  flushPara();
  textChunks.push(currentChunkParas.join('\n\n'));

  return { paragraphs, tables, textChunks, notes };
};

type DiffSegment = { type: 'equal' | 'added' | 'removed'; text: string };

const computeWordDiff = (oldText: string, newText: string): DiffSegment[] => {
  if (oldText === newText) {
    return [{ type: 'equal', text: newText }];
  }
  // Tokenize keeping words/punctuation and whitespace separated
  const tokenize = (str: string): string[] =>
    str.match(/\n+|[^\S\n]+|[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,;$%()«»"—\-]+|[^\sA-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,;$%()«»"—\-]+/g) || [];

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const m = oldTokens.length;
  const n = newTokens.length;

  // LCS matrix
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        const down = dp[i + 1][j];
        const right = dp[i][j + 1];
        dp[i][j] = down >= right ? down : right;
      }
    }
  }

  const rawSegments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      rawSegments.push({ type: 'equal', text: oldTokens[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawSegments.push({ type: 'removed', text: oldTokens[i] });
      i++;
    } else {
      rawSegments.push({ type: 'added', text: newTokens[j] });
      j++;
    }
  }
  while (i < m) {
    rawSegments.push({ type: 'removed', text: oldTokens[i++] });
  }
  while (j < n) {
    rawSegments.push({ type: 'added', text: newTokens[j++] });
  }

  // Merge consecutive segments of the same type (and absorb whitespace between identical diff types)
  const merged: DiffSegment[] = [];
  for (const seg of rawSegments) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === seg.type) {
      prev.text += seg.text;
    } else if (
      prev &&
      seg.type === 'equal' &&
      /^\s+$/.test(seg.text) &&
      !seg.text.includes('\n')
    ) {
      // Peek ahead handled on next token if same type; keep equal for now
      merged.push({ ...seg });
    } else if (
      merged.length >= 2 &&
      merged[merged.length - 1].type === 'equal' &&
      /^\s+$/.test(merged[merged.length - 1].text) &&
      !merged[merged.length - 1].text.includes('\n') &&
      merged[merged.length - 2].type === seg.type &&
      seg.type !== 'equal'
    ) {
      // Bridge pure horizontal spaces between two added or two removed tokens
      const spaceSeg = merged.pop()!;
      merged[merged.length - 1].text += spaceSeg.text + seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
};

const renderWordDiffBlock = (oldText: string, newText: string, keyPrefix: string) => {
  if (!oldText && !newText) return null;
  const bodySegments = computeWordDiff(oldText || '', newText || '');
  return (
    <div key={keyPrefix} className="text-xs leading-relaxed text-[var(--color-texto)] whitespace-pre-line text-justify w-full">
      {bodySegments.map((seg, idx) => {
        if (seg.type === 'equal') {
          return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
        }
        if (seg.type === 'removed') {
          return (
            <span
              key={idx}
              className="text-[var(--color-error)] line-through decoration-[var(--color-error)] decoration-1 mx-0.5"
              title="Texto eliminado respecto a la versión inmediata anterior"
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={idx}
            className="text-[var(--color-exito)] mx-0.5"
            title="Texto incrementado respecto a la versión inmediata anterior"
          >
            {seg.text}
          </span>
        );
      })}
    </div>
  );
};

const renderSolidColoredTable = (
  tbl: ParsedTableData,
  tone: 'removed' | 'added' | 'neutral',
  badgeLabel: string | null,
  key: string
) => {
  const borderClass =
    tone === 'removed'
      ? 'border-[var(--color-error-borde)]'
      : tone === 'added'
        ? 'border-[var(--color-exito-borde)]'
        : 'border-[var(--color-borde)]';
  const headTextClass =
    tone === 'removed'
      ? 'text-[var(--color-error)]'
      : tone === 'added'
        ? 'text-[var(--color-exito)]'
        : 'text-[var(--color-secundario)]';
  const cellTextClass =
    tone === 'removed'
      ? 'text-[var(--color-error)]'
      : tone === 'added'
        ? 'text-[var(--color-exito)]'
        : 'text-[var(--color-texto)]';
  const badgeClass =
    tone === 'removed'
      ? 'bg-[var(--color-error-fondo)] text-[var(--color-error)] border-b border-[var(--color-error-borde)]'
      : tone === 'added'
        ? 'bg-[var(--color-exito-fondo)] text-[var(--color-exito)] border-b border-[var(--color-exito-borde)]'
        : 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border-b border-[var(--color-borde)]';

  return (
    <div key={key} className="my-2.5 w-full flex justify-center">
      <div className={`w-fit max-w-full overflow-x-auto rounded-xl border ${borderClass} bg-[var(--color-superficie)] shadow-md`}>
        {badgeLabel && (
          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
            {badgeLabel}
          </div>
        )}
        <table className="w-auto max-w-full text-left text-xs">
        {tbl.header.length > 0 && (
          <thead className={`bg-[var(--color-superficie-secundaria)] ${headTextClass} uppercase text-[11px] font-extrabold border-b border-[var(--color-borde)]`}>
            <tr>
              {tbl.header.map((h, i) => (
                <th key={i} className={`py-2 px-3 ${getAdaptiveCellClass(h, true)}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-[var(--color-borde)] bg-[var(--color-superficie)]">
          {tbl.rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[var(--color-superficie-hover)] transition">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className={`py-2 px-3 ${cellTextClass} font-medium ${getAdaptiveCellClass(cell)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
};

const renderTableDiffBlock = (
  currTbl: ParsedTableData | undefined,
  prevTbl: ParsedTableData | undefined,
  key: string,
  forcedFullReplace = false
) => {
  if (!currTbl && prevTbl) {
    return renderSolidColoredTable(prevTbl, 'removed', 'Tabla anterior eliminada / derogada', `${key}-removed`);
  }
  if (currTbl && !prevTbl) {
    return renderSolidColoredTable(currTbl, 'added', 'Nueva tabla incorporada en esta versión', `${key}-added`);
  }
  if (!currTbl || !prevTbl) return null;

  // Comprobar si la tabla es 100% idéntica
  const sameHeader =
    currTbl.header.length === prevTbl.header.length &&
    currTbl.header.every((h, idx) => h.trim() === (prevTbl.header[idx] || '').trim());
  const sameRows =
    currTbl.rows.length === prevTbl.rows.length &&
    currTbl.rows.every(
      (row, rIdx) =>
        row.length === (prevTbl.rows[rIdx]?.length || 0) &&
        row.every((cell, cIdx) => cell.trim() === (prevTbl.rows[rIdx]?.[cIdx] || '').trim())
    );

  if (sameHeader && sameRows) {
    return renderSolidColoredTable(currTbl, 'neutral', null, `${key}-same`);
  }

  // Evaluar si la reforma sustituye la tabla completa (cambio de estructura/tramos o >= 50% de filas cambiadas)
  const rowCountChanged = currTbl.rows.length !== prevTbl.rows.length;
  const colCountChanged = currTbl.header.length !== prevTbl.header.length;
  let changedRows = 0;
  const totalRows = Math.max(currTbl.rows.length, prevTbl.rows.length, 1);
  for (let r = 0; r < totalRows; r++) {
    const cRow = currTbl.rows[r];
    const pRow = prevTbl.rows[r];
    if (!cRow || !pRow || cRow.length !== pRow.length || cRow.some((c, ci) => c.trim() !== (pRow[ci] || '').trim())) {
      changedRows++;
    }
  }
  const changedRowRatio = changedRows / totalRows;
  const isFullTableReplace = forcedFullReplace || rowCountChanged || colCountChanged || changedRowRatio >= 0.5;

  if (isFullTableReplace) {
    return (
      <div key={key} className="space-y-2 my-3">
        {renderSolidColoredTable(prevTbl, 'removed', 'Tabla anterior sustituida', `${key}-prev-full`)}
        {renderSolidColoredTable(currTbl, 'added', 'Nueva tabla vigente en esta versión', `${key}-curr-full`)}
      </div>
    );
  }

  // Cambio puntual en celdas o encabezados: comparación celda a celda (rojo tachado + verde)
  return (
    <div key={key} className="my-3 w-full flex justify-center">
      <div className="w-fit max-w-full overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-md">
        <table className="w-auto max-w-full text-left text-xs">
        {currTbl.header.length > 0 && (
          <thead className="bg-[var(--color-superficie-secundaria)] text-[var(--color-secundario)] uppercase text-[11px] font-extrabold border-b border-[var(--color-borde)]">
            <tr>
              {currTbl.header.map((h, i) => {
                const prevH = prevTbl.header[i];
                const hChanged = prevH !== undefined && prevH.trim() !== h.trim();
                return (
                  <th key={i} className={`py-2.5 px-3 ${getAdaptiveCellClass(h, true)}`}>
                    {hChanged ? (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <span className="text-[var(--color-error)] line-through decoration-[var(--color-error)] decoration-1 text-[10px]">
                          {prevH}
                        </span>
                        <span className="text-[var(--color-exito)]">{h}</span>
                      </span>
                    ) : (
                      h
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-[var(--color-borde)] bg-[var(--color-superficie)]">
          {currTbl.rows.map((row, rIdx) => {
            const prevRow = prevTbl?.rows?.[rIdx];
            return (
              <tr key={rIdx} className="hover:bg-[var(--color-superficie-hover)] transition">
                {row.map((cell, cIdx) => {
                  const prevCell = prevRow?.[cIdx];
                  const cellChanged = prevCell !== undefined && prevCell.trim() !== cell.trim();
                  const rowAdded = !prevRow;
                  return (
                    <td key={cIdx} className={`py-2 px-3 text-[var(--color-texto)] font-medium ${getAdaptiveCellClass(cell)}`}>
                      {cellChanged ? (
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[var(--color-error)] line-through decoration-[var(--color-error)] decoration-1 text-[11px]"
                            title="Valor eliminado de la versión inmediata anterior"
                          >
                            {prevCell}
                          </span>
                          <span
                            className="text-[var(--color-exito)]"
                            title="Nuevo valor incrementado en esta versión"
                          >
                            {cell}
                          </span>
                        </span>
                      ) : rowAdded ? (
                        <span className="text-[var(--color-exito)]">{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
};

const renderDiffMarkdownContent = (
  currentContent: string,
  previousContent?: string | null,
  tableDiffMode?: string | null
) => {
  if (!currentContent) return null;
  if (!previousContent || currentContent.trim() === previousContent.trim()) {
    return renderMarkdownContent(currentContent);
  }

  const currDoc = parseDocForDiff(currentContent);
  const prevDoc = parseDocForDiff(previousContent);
  const forcedFullReplace = tableDiffMode === 'full_replace';
  const maxTables = Math.max(currDoc.tables.length, prevDoc.tables.length);

  // Sin tablas en ninguna de las dos versiones: diff de texto directo
  if (maxTables === 0) {
    return (
      <div className="space-y-3">
        {renderWordDiffBlock(prevDoc.paragraphs.join('\n\n'), currDoc.paragraphs.join('\n\n'), 'body-only')}
        {currDoc.notes.map((note, nIdx) => (
          <p key={`note-${nIdx}`} className="text-[11px] leading-relaxed text-[var(--color-texto-secundario)] italic border-t border-[var(--color-borde)] pt-2">
            {note}
          </p>
        ))}
      </div>
    );
  }

  // Con tablas: renderizar cada fragmento de texto y cada tabla en su posición exacta
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i <= maxTables; i++) {
    const currChunk = currDoc.textChunks[i] || '';
    const prevChunk = prevDoc.textChunks[i] || '';
    if (currChunk || prevChunk) {
      nodes.push(renderWordDiffBlock(prevChunk, currChunk, `chunk-${i}`));
    }
    if (i < maxTables) {
      const currTbl = currDoc.tables[i];
      const prevTbl = prevDoc.tables[i];
      const tblNode = renderTableDiffBlock(currTbl, prevTbl, `diff-tbl-${i}`, forcedFullReplace);
      if (tblNode) nodes.push(tblNode);
    }
  }

  return (
    <div className="space-y-3">
      {nodes}
      {currDoc.notes.map((note, nIdx) => (
        <p key={`note-${nIdx}`} className="text-[11px] leading-relaxed text-[var(--color-texto-secundario)] italic border-t border-[var(--color-borde)] pt-2">
          {note}
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// CATEGORÍAS TRIBUTARIAS Y ORDENACIÓN NATURAL DE ARTÍCULOS
// ============================================================================
const CONCEPT_CATEGORIES: Record<string, { label: string; badgeClass: string }> = {
  exemption: { label: 'Exoneraciones', badgeClass: 'bg-[var(--color-exito-fondo)] border-[var(--color-exito-borde)] text-[var(--color-exito-texto)]' },
  deduction: { label: 'Deducciones', badgeClass: 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde-fuerte)] text-[var(--color-texto)]' },
  tax_base: { label: 'Base Imponible', badgeClass: 'bg-[var(--color-aviso-fondo)] border-[var(--color-aviso-borde)] text-[var(--color-aviso)]' },
  rate: { label: 'Tarifas y Porcentajes', badgeClass: 'bg-[var(--color-aviso-fondo)] border-[var(--color-aviso-borde)] text-[var(--color-aviso)]' },
  withholding: { label: 'Retenciones en la Fuente', badgeClass: 'bg-[var(--color-info-fondo)] border-[var(--color-info-borde)] text-[var(--color-info)]' },
  taxable_event: { label: 'Hecho Generador', badgeClass: 'bg-[var(--color-info-fondo)] border-[var(--color-info-borde)] text-[var(--color-info)]' },
  general: { label: 'Conceptos Generales', badgeClass: 'bg-[var(--color-secundario-suave)] border-[var(--color-secundario-borde)] text-[var(--color-exito-texto)]' },
  other: { label: 'Regímenes y Otros', badgeClass: 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)]' }
};

const FEEDBACK_TYPE_META: Record<string, { label: string; badge: string; icon: string }> = {
  errata: { label: 'Errata o texto', badge: 'bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)] border-[var(--color-aviso-borde)]', icon: '✏️' },
  missing_content: { label: 'Falta literal/inciso', badge: 'bg-[var(--color-error-fondo)] text-[var(--color-error)] border-[var(--color-error-borde)]', icon: '📄' },
  table_error: { label: 'Discrepancia en cifras/tabla', badge: 'bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)] border-[var(--color-aviso-borde)]', icon: '📊' },
  outdated_reform: { label: 'Reforma desactualizada', badge: 'bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)] border-[var(--color-aviso-borde)]', icon: '⏳' },
  suggestion: { label: 'Sugerencia de mejora', badge: 'bg-[var(--color-exito-fondo)] text-[var(--color-exito-texto)] border-[var(--color-exito-borde)]', icon: '💡' }
};

const sortLegalStructures = (a: NormStructure, b: NormStructure): number => {
  const isArtA = a.structure_type === 'article' || !a.structure_type;
  const isArtB = b.structure_type === 'article' || !b.structure_type;

  // 1. Si ambos son artículos, orden legal estricto:
  //    Art. 1 -> 2 -> 4 -> 4.1 -> 4A -> 5 ... -> 9 -> 9.1 -> 9.2 -> 9.3 -> 9.19 -> 9.20 -> 10
  //    Cualquier artículo sin número válido (ej. texto especial) va siempre después de los numerados.
  if (isArtA && isArtB) {
    const parseArtParts = (
      s: NormStructure
    ): { main: number; isSub: number; subNum: number; suffix: string } => {
      const raw = String(s.identifier || s.label || '')
        .replace(/^Art(?:[íi]culo|\.)?\s*/i, '')
        .trim();
      const m = raw.match(/^(\d+)(?:\.(\d+))?([A-Za-z]+)?/);
      if (!m) {
        return { main: Number.POSITIVE_INFINITY, isSub: 1, subNum: 0, suffix: raw.toUpperCase() };
      }
      const main = parseInt(m[1], 10);
      const subNum = m[2] ? parseInt(m[2], 10) : 0;
      const suffix = (m[3] || '').toUpperCase();
      const isSub = m[2] || suffix ? 1 : 0;
      return { main, isSub, subNum, suffix };
    };

    const pA = parseArtParts(a);
    const pB = parseArtParts(b);

    if (pA.main !== pB.main) return pA.main - pB.main;
    if (pA.isSub !== pB.isSub) return pA.isSub - pB.isSub;
    if (pA.subNum !== pB.subNum) return pA.subNum - pB.subNum;
    if (pA.suffix !== pB.suffix) return pA.suffix.localeCompare(pB.suffix);
    if ((a.order_index ?? 0) !== (b.order_index ?? 0)) {
      return (a.order_index ?? 0) - (b.order_index ?? 0);
    }
    return String(a.identifier || a.label || '').localeCompare(String(b.identifier || b.label || ''));
  }

  // 2. Artículos van siempre antes que Disposiciones
  if (isArtA && !isArtB) return -1;
  if (!isArtA && isArtB) return 1;

  // 3. Orden formal de Disposiciones: Generales -> Transitorias -> Reformatorias -> Derogatorias -> Finales
  const typeWeights: Record<string, number> = {
    other: 1, // General
    transitory: 2,
    reform: 3,
    final: 4
  };
  const weightA = typeWeights[a.structure_type || ''] ?? 99;
  const weightB = typeWeights[b.structure_type || ''] ?? 99;
  if (weightA !== weightB) return weightA - weightB;

  return (a.order_index ?? 0) - (b.order_index ?? 0);
};

// ============================================================================
// IMPUESTOS TRONCALES DE ECUADOR (TAX SCOPES)
// ============================================================================
export type TaxScopeCode = 'ALL' | 'RENTA' | 'IVA' | 'ICE' | 'ISD' | 'RISE' | 'GENERAL';

export interface TaxScopeConfig {
  code: TaxScopeCode;
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const TAX_SCOPES: Record<TaxScopeCode, TaxScopeConfig> = {
  ALL: {
    code: 'ALL',
    name: 'Todos los Impuestos',
    shortName: 'Todos',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Normativa completa sin discriminación de tributo'
  },
  RENTA: {
    code: 'RENTA',
    name: 'Impuesto a la Renta',
    shortName: 'Renta',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Arts. 1 al 51: Personas naturales, sociedades, deducciones y tarifas'
  },
  IVA: {
    code: 'IVA',
    name: 'Impuesto al Valor Agregado',
    shortName: 'IVA',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Arts. 52 al 74: Transferencias, importaciones, tarifas y crédito fiscal'
  },
  ICE: {
    code: 'ICE',
    name: 'Impuesto a los Consumos Especiales',
    shortName: 'ICE',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Arts. 75 al 88: Bienes y servicios gravados con ICE, base y tarifas'
  },
  ISD: {
    code: 'ISD',
    name: 'Impuesto a la Salida de Divisas',
    shortName: 'ISD',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Régimen del Impuesto a la Salida de Divisas (ISD) y transferencias al exterior'
  },
  RISE: {
    code: 'RISE',
    name: 'Régimen Impositivo Simplificado (RISE)',
    shortName: 'RISE',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Arts. 97.1 al 97.15 LRTI: Régimen Impositivo Simplificado Ecuatoriano'
  },
  GENERAL: {
    code: 'GENERAL',
    name: 'Régimen General y Disposiciones',
    shortName: 'General',
    badgeBg: 'bg-[var(--color-superficie-secundaria)]',
    badgeText: 'text-[var(--color-texto-secundario)]',
    badgeBorder: 'border-[var(--color-borde)]',
    description: 'Disposiciones transitorias, generales, reformatorias y Código Tributario'
  }
};

export const getArticleTaxScope = (art: NormStructure): TaxScopeConfig => {
  const title = `${art.parent_title || ''} ${art.parent_chapter || ''} ${art.title || ''}`.toUpperCase();
  const ident = String(art.identifier || '').trim();
  const label = art.label || '';
  const matchArtNum = label.match(/(\d+)/);
  const artNum = matchArtNum ? parseInt(matchArtNum[1], 10) : 0;
  const normCode = (art.norms?.code || '').toUpperCase();

  if (ident.startsWith('97.') || title.includes('SIMPLIFICADO') || title.includes('(RISE)') || title.includes(' RISE')) {
    return TAX_SCOPES.RISE;
  }
  if (title.includes('SALIDA DE DIVISAS') || title.includes('ISD')) {
    return TAX_SCOPES.ISD;
  }
  if (normCode === 'LRTI' || !normCode) {
    if (title.includes('RENTA') || title.includes('PRIMERO') || (artNum >= 1 && artNum <= 51 && !art.structure_type?.startsWith('transitory'))) {
      return TAX_SCOPES.RENTA;
    }
    if (title.includes('VALOR AGREGADO') || title.includes('IVA') || title.includes('SEGUNDO') || (artNum >= 52 && artNum <= 74)) {
      return TAX_SCOPES.IVA;
    }
    if (title.includes('CONSUMOS ESPECIALES') || title.includes('ICE') || title.includes('TERCERO') || (artNum >= 75 && artNum <= 88)) {
      return TAX_SCOPES.ICE;
    }
  } else {
    if (title.includes('IMPUESTO A LA RENTA')) return TAX_SCOPES.RENTA;
    if (title.includes('VALOR AGREGADO') || title.includes('IVA')) return TAX_SCOPES.IVA;
    if (title.includes('CONSUMOS ESPECIALES') || title.includes('ICE')) return TAX_SCOPES.ICE;
  }
  return TAX_SCOPES.GENERAL;
};

// ============================================================================
// MODELO Y RESOLUCIÓN DE CASCADA JERÁRQUICA (LEY -> REGLAMENTO -> RESOLUCIÓN SRI)
// ============================================================================
export interface SecondaryCascadeVersion {
  year: number;
  label: string;
  cite: string;
  validFrom: string;
  validTo: string;
  summary: string;
  content: string;
}

export interface SecondaryCascadeItem {
  id: string;
  level: 'ley_modificatoria' | 'reglamento' | 'resolucion' | 'circular';
  levelLabel: string;
  normId?: string;
  normName: string;
  normCode: string;
  articleLabel: string;
  articleTitle: string;
  content: string;
  legalStatus: LegalStatus;
  relationNote: string;
  historicalVersions?: SecondaryCascadeVersion[];
  childItems?: SecondaryCascadeItem[];
}

const TABLE_TAX_GROUPS: Array<{
  key: string;
  label: string;
  shortDesc: string;
  accent: string;
}> = [
  {
    key: 'impuesto_renta',
    label: 'Impuesto a la Renta',
    shortDesc: 'Personas Naturales y Herencias/Legados/Donaciones ancladas arriba, más demás tablas de Impuesto a la Renta.',
    accent: 'text-[var(--color-secundario)]'
  },
  {
    key: 'rimpe',
    label: 'RIMPE',
    shortDesc: 'Régimen Simplificado para Emprendedores y Negocios Populares (vigente).',
    accent: 'text-[var(--color-info)]'
  },
  {
    key: 'rise',
    label: 'RISE (Derogado)',
    shortDesc: 'Cuotas históricas del antiguo Régimen Impositivo Simplificado (derogado 01/01/2022).',
    accent: 'text-[var(--color-texto-secundario)]'
  },
  {
    key: 'ice',
    label: 'Impuesto a los Consumos Especiales (ICE)',
    shortDesc: 'Grupos I al V (ad valorem, mixta, específica), bebidas alcohólicas y perfumes.',
    accent: 'text-[var(--color-aviso)]'
  },
  {
    key: 'iva',
    label: 'Impuesto al Valor Agregado (IVA)',
    shortDesc: 'Tarifas, calendarios de declaración y vencimientos del IVA.',
    accent: 'text-[var(--color-info)]'
  },
  {
    key: 'ambientales',
    label: 'Impuestos Ambientales (IRBP)',
    shortDesc: 'Conversión de botellas plásticas PET no retornables y plazos del Anexo IBP.',
    accent: 'text-[var(--color-secundario)]'
  },
  {
    key: 'contribuciones',
    label: 'Contribuciones Temporales y Especiales',
    shortDesc: 'Patrimonio, bancos y cooperativas, solidaridad y regularización de activos.',
    accent: 'text-[var(--color-error)]'
  },
  {
    key: 'otras_tablas',
    label: 'Otras Tablas',
    shortDesc: 'Tablas generales y regulatorias que no forman parte de los tributos anteriores.',
    accent: 'text-[var(--color-texto-secundario)]'
  }
];

const classifyTableTaxGroup = (tbl: NormativeTable): { group: string; pinRank: number } => {
  const code = (tbl.table_code || '').toUpperCase();
  const cat = (tbl.category || '').toLowerCase();
  const titleOnly = (tbl.title || '').toLowerCase();
  const text = `${tbl.title || ''} ${tbl.subtitle || ''}`.toLowerCase();

  if (
    cat === 'inheritance' ||
    code.includes('HERENCIA') ||
    code.includes('_HLD_') ||
    /herencia|legado|donaci[oó]n/.test(titleOnly)
  ) {
    return { group: 'impuesto_renta', pinRank: 2 };
  }
  if (
    code.startsWith('TBL_IR_PN_') ||
    (cat === 'progressive_rates' &&
      /personas\s+naturales/.test(titleOnly) &&
      !/patrimonio|contribuci[oó]n|vencimiento|plazo|fecha/.test(titleOnly))
  ) {
    return { group: 'impuesto_renta', pinRank: 1 };
  }
  if (code.includes('RISE') || /\brise\b|cuotas mensuales para actividades|categor[ií]as de pago del rise/.test(text)) {
    return { group: 'rise', pinRank: 9 };
  }
  if (cat === 'rimpe' || code.includes('RIMPE') || /\b(rimpe|negocios populares)\b/.test(text)) {
    return { group: 'rimpe', pinRank: 9 };
  }
  if (
    /IRBP|BOTELLAS|_IBP\b|PLASTICA|IACV/.test(code) ||
    /botellas?\s+pl[aá]sticas|anexo\s+ibp|impuesto\s+redimible|impuesto\s+ambiental|contaminaci[oó]n\s+vehicular/.test(text)
  ) {
    return { group: 'ambientales', pinRank: 9 };
  }
  if (
    cat === 'ice' ||
    code.startsWith('TBL_ICE') ||
    /\bice\b|consumos\s+especiales|tarifa\s+ad\s+valorem|tarifa\s+mixta|bebidas\s+alcoh[oó]licas|perfumes/.test(text)
  ) {
    return { group: 'ice', pinRank: 9 };
  }
  if (code.includes('_IVA_') || /\biva\b|valor\s+agregado/.test(text)) {
    return { group: 'iva', pinRank: 9 };
  }
  if (
    /CONTRIB|CTS_|REGULARIZACION_ACTIVOS/.test(code) ||
    /contribuci[oó]n\s+(temporal|solidaria|[uú]nica)|regularizaci[oó]n\s+de\s+activos/.test(text)
  ) {
    return { group: 'contribuciones', pinRank: 9 };
  }
  if (
    cat === 'dividends' ||
    cat === 'withholding_rates' ||
    /^TBL_IR_|PAGO_CUENTA_UTILIDADES|CARGAS_FAMILIARES|DEDUCCION_ADICIONAL|CREDITO_TRIBUTARIO|RDEP|BANANO|COEF_PRESUNTIVA|DECL_PATRIMONIAL/.test(code) ||
    /impuesto\s+a\s+la\s+renta|utilidades\s+no\s+distribuidas|cargas\s+familiares|canastas?\s+familiares|deducci[oó]n\s+adicional|enajenaci[oó]n\s+de\s+acciones|retenci[oó]n\s+en\s+la\s+fuente|cr[eé]dito\s+tributario|anexo\s+rdep|cajas\s+equivalentes|determinaci[oó]n\s+presuntiva/.test(text)
  ) {
    return { group: 'impuesto_renta', pinRank: 3 };
  }
  return { group: 'otras_tablas', pinRank: 9 };
};

const getTableSeriesMeta = (tbl: NormativeTable): { seriesKey: string; displayLabel: string } => {
  const code = (tbl.table_code || '').toUpperCase();
  const cat = (tbl.category || '').toLowerCase();
  const titleOnly = (tbl.title || '').toLowerCase();

  if (
    cat === 'inheritance' ||
    code.includes('HERENCIA') ||
    code.includes('_HLD_') ||
    /herencia|legado|donaci[oó]n/.test(titleOnly)
  ) {
    return {
      seriesKey: 'series_ir_herencias',
      displayLabel: 'Tabla Impuesto a la Renta por Herencias, Legados y Donaciones'
    };
  }
  if (
    code.startsWith('TBL_IR_PN_') ||
    (cat === 'progressive_rates' &&
      /personas\s+naturales/.test(titleOnly) &&
      !/patrimonio|contribuci[oó]n|vencimiento|plazo|fecha/.test(titleOnly))
  ) {
    return {
      seriesKey: 'series_ir_personas_naturales',
      displayLabel: 'Tabla Impuesto a la Renta Personas Naturales y Sucesiones Indivisas'
    };
  }
  if (code.startsWith('TBL_ICE_TARIFAS')) {
    return { seriesKey: 'series_ice_tarifas', displayLabel: 'Tarifas Específicas del ICE' };
  }
  if (code.startsWith('TBL_ICE_PERFUMES')) {
    return { seriesKey: 'series_ice_perfumes', displayLabel: 'ICE — Perfumes y Aguas de Tocador' };
  }
  if (code.startsWith('TBL_ICE_EXENCION') || code.startsWith('TBL_ICE_BEBIDAS_ALCOHOLICAS')) {
    return { seriesKey: 'series_ice_alcohol', displayLabel: 'ICE — Exención Bebidas Alcohólicas' };
  }
  if (/^TBL_ICE_GRUPO_?I(?!I|V)/.test(code) || code === 'TBL_ICE_GRUPO1_2008') {
    return { seriesKey: 'series_ice_g1', displayLabel: 'ICE — Grupo I Tarifa Ad Valorem' };
  }
  if (/^TBL_ICE_GRUPO_?II(?!I)/.test(code) || code === 'TBL_ICE_GRUPO2_AERONAVES_2008') {
    return { seriesKey: 'series_ice_g2', displayLabel: 'ICE — Grupo II Tarifa Ad Valorem' };
  }
  if (/^TBL_ICE_GRUPO_?III/.test(code)) {
    return { seriesKey: 'series_ice_g3', displayLabel: 'ICE — Grupo III Tarifa Ad Valorem' };
  }
  if (/^TBL_ICE_GRUPO_?IV/.test(code)) {
    return { seriesKey: 'series_ice_g4', displayLabel: 'ICE — Grupo IV Tarifa Mixta' };
  }
  if (/^TBL_ICE_GRUPO_?V/.test(code)) {
    return { seriesKey: 'series_ice_g5', displayLabel: 'ICE — Grupo V Tarifa Específica' };
  }
  if (/IRBP_CONVERSION|CONVERSION_BOTELLAS|BOTELLAS_PET/.test(code)) {
    return { seriesKey: 'series_irbp_conversion', displayLabel: 'Conversión de Botellas Plásticas No Retornables (IRBP)' };
  }
  if (/TBL_IR_(ACCIONES|ENAJENACION_ACCIONES)/.test(code)) {
    return { seriesKey: 'series_ir_acciones', displayLabel: 'Impuesto a la Renta Único — Enajenación de Acciones' };
  }
  const riseMatch = code.match(/^TBL_RISE_([A-Z_]+?)(?:_\d{4})?$/);
  if (riseMatch) {
    return {
      seriesKey: `series_rise_${riseMatch[1].toLowerCase()}`,
      displayLabel: `RISE — ${riseMatch[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`
    };
  }
  return {
    seriesKey: `single_${tbl.id}`,
    displayLabel: tbl.title || tbl.table_code
  };
};

const getTableDisplayGrid = (tbl: NormativeTable): { headers: string[]; rows: string[][] } => {
  const schemaCols = Array.isArray(tbl.columns_schema) ? tbl.columns_schema : [];
  const rawRows = Array.isArray(tbl.rows_data) ? tbl.rows_data : [];
  if (schemaCols.length > 0 && rawRows.length > 0) {
    return {
      headers: schemaCols.map(c => c.label || c.key || ''),
      rows: rawRows.map(r => schemaCols.map(c => String(r?.[c.key] ?? '—')))
    };
  }
  const md = String((tbl as any).markdown_content || '');
  const lines = md.split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|') && !/^\|[\s\-:|]+\|$/.test(l));
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string) => line.split('|').slice(1, -1).map(c => c.trim());
  return {
    headers: parseLine(lines[0]),
    rows: lines.slice(1).map(parseLine)
  };
};

const buildTableMarkdownText = (tbl: NormativeTable): string => {
  const { headers, rows } = getTableDisplayGrid(tbl);
  if (headers.length === 0) return '';
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const lines = [
    `**${tbl.title || tbl.table_code}**`,
    `| ${headers.join(' | ')} |`,
    sep,
    ...rows.map(r => `| ${r.join(' | ')} |`)
  ];
  return lines.join('\n');
};

export const getSecondaryCascadeForArticle = (
  art: NormStructure | null | undefined,
  dbRelations: any[],
  allVersionIds?: string[]
): SecondaryCascadeItem[] => {
  if (!art) return [];

  const targetIds = allVersionIds && allVersionIds.length > 0 ? allVersionIds : [art.id];
  const isLrtiNorm = !art.norms?.code || art.norms.code.toUpperCase() === 'LRTI';
  const artNumMatch = art.label?.match(/\d+/);
  const artNum = artNumMatch ? parseInt(artNumMatch[0], 10) : 0;

  // 1. Verificar si existen relaciones explícitas en la base de datos Supabase (incluyendo todas las versiones del artículo)
  const dbLinked = dbRelations.filter(
    r => targetIds.includes(r.source_structure_id) || targetIds.includes(r.target_structure_id)
  );

  const seenDbKeys = new Set<string>();
  const mappedDbItems: SecondaryCascadeItem[] = [];

  for (const r of dbLinked) {
    const linked = targetIds.includes(r.source_structure_id) ? r.target : r.source;
    if (!linked) continue;

    const normObj = linked?.norms;
    const normCodeUpper = String(normObj?.code || '').toUpperCase();
    const normTitleUpper = String(normObj?.title || normObj?.name || '').toUpperCase();
    const normTypeLower = String(normObj?.norm_type || normObj?.normative_type || '').toLowerCase();

    const dedupKey = `${normObj?.id || normCodeUpper}::${linked?.label || linked?.identifier || linked?.id}`;
    if (seenDbKeys.has(dedupKey)) continue;
    seenDbKeys.add(dedupKey);

    const isResolution =
      normTypeLower === 'resolution' ||
      normTypeLower === 'sri_resolution' ||
      /^(?:NAC-|RES-|RSU-|RESOLUCION)/.test(normCodeUpper);
    const isCircular =
      normTypeLower === 'circular' ||
      /^(?:CIRC|FE-ERRATAS|MIPRO)/.test(normCodeUpper);
    const isReglamentoDecreto =
      normTypeLower === 'regulation' ||
      normTypeLower === 'decree' ||
      normCodeUpper === 'RALRTI' ||
      normCodeUpper === 'RLRTI' ||
      (!normCodeUpper.startsWith('DECRETO-LEY') && /^(?:DE-|DECRETO-EJECUTIVO|REGLAMENTO|AM-|ACUERDO|ORD)/.test(normCodeUpper)) ||
      normTitleUpper.includes('REGLAMENTO') ||
      normTitleUpper.includes('ORDENANZA');
    const isModifyingLaw =
      !isResolution &&
      !isCircular &&
      !isReglamentoDecreto &&
      normObj?.id !== art.norm_id &&
      (normTypeLower === 'law' ||
        normTypeLower === 'organic_law' ||
        normTypeLower === 'decree_law' ||
        normTypeLower === 'code' ||
        /^(?:LEY-|LO-|COD|DECRETO-LEY)/.test(normCodeUpper) ||
        ['amends', 'reforms', 'clarifies', 'repeals'].includes(String(r.relation_type || '').toLowerCase()));

    const level: SecondaryCascadeItem['level'] = isResolution
      ? 'resolucion'
      : isCircular
        ? 'circular'
        : isModifyingLaw
          ? 'ley_modificatoria'
          : 'reglamento';
    const yearFrom = linked?.valid_from ? Number(String(linked.valid_from).slice(0, 4)) : 2008;

    mappedDbItems.push({
      id: r.id,
      level,
      levelLabel: isResolution
        ? 'Resolución del SRI'
        : isCircular
          ? 'Fe de Erratas / Circular Oficial'
          : isModifyingLaw
            ? normTypeLower === 'code'
              ? 'Código Vinculado / Supletorio'
              : 'Ley Modificatoria / Reformatoria'
            : normTypeLower === 'decree' || normCodeUpper.startsWith('DE-') || normCodeUpper.startsWith('DECRETO-EJECUTIVO')
              ? 'Decreto Ejecutivo Vinculado'
              : 'Reglamento / Norma Concordante',
      normId: normObj?.id,
      normName: normObj?.title || normObj?.name || 'Norma Conectada en Registro Oficial',
      normCode: normObj?.code || 'RO',
      articleLabel: linked?.label || (linked?.identifier ? `Art. ${linked.identifier}` : 'Art. Concordante'),
      articleTitle: linked?.title || '',
      content: linked?.content || '',
      legalStatus: linked?.legal_status || 'vigente',
      relationNote: r.notes || r.description || `Concordancia directa con ${art.label}`,
      historicalVersions: [
        {
          year: isNaN(yearFrom) ? 2008 : yearFrom,
          label: 'Vigente',
          cite: normObj?.title || normObj?.name || normObj?.code || 'Registro Oficial',
          validFrom: linked?.valid_from || '2008-01-01',
          validTo: linked?.valid_to || 'Presente',
          summary: r.notes || r.description || `Concordancia oficial vinculada a ${art.label}.`,
          content: linked?.content || ''
        },
        {
          year: (isNaN(yearFrom) ? 2008 : yearFrom) - 1,
          label: 'Redacción Previa',
          cite: 'Texto reglamentario / administrativo anterior a la reforma',
          validFrom: '2005-01-01',
          validTo: linked?.valid_from || '2007-12-31',
          summary: 'Disposición previa antes de la actualización de rangos o reforma legal.',
          content: `Redacción histórica previa de ${linked?.label || 'la disposición vinculada'} aplicable antes de la entrada en vigor de ${normObj?.code || 'la reforma'}.`
        }
      ]
    });
  }

  // 2. Concordancias normativas oficiales por jerarquía (Reglamento + Resoluciones SRI con su propia línea de tiempo)
  if (isLrtiNorm && artNum === 36) {
    const presetArt36: SecondaryCascadeItem[] = [
      {
        id: 'cascade-ralrti-art73',
        level: 'reglamento',
        levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
        normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
        normCode: 'RALRTI',
        articleLabel: 'Art. 73',
        articleTitle: 'Cálculo y Liquidación de Impuesto a la Renta de Personas Naturales y Sucesiones Indivisas',
        content:
          'Para liquidar el impuesto a la renta de las personas naturales y de las sucesiones indivisas, se aplicará a la base imponible la tabla de tarifas contenida en el artículo 36 de la Ley.\n\nLa base imponible se determinará sumando los ingresos gravados de fuente ecuatoriana y del exterior, restando las devoluciones, descuentos, costos y gastos deducibles, así como las exoneraciones y gastos personales aplicables.\n\nEl Servicio de Rentas Internas publicará anualmente mediante resolución de carácter general la tabla de tarifas actualizada por el Índice de Precios al Consumidor del Área Urbana (INEC) hasta el 30 de noviembre de cada año.',
        legalStatus: 'vigente_reformado',
        relationNote: 'Reglamenta la liquidación de la base imponible, deducción de gastos personales y actualización anual de tablas del Art. 36 LRTI.',
        historicalVersions: [
          {
            year: 2009,
            label: 'Reforma 2009 (Vigente)',
            cite: 'Decreto Ejecutivo 1051 • R.O. Suplemento 337',
            validFrom: '2009-01-01',
            validTo: 'Presente',
            summary: 'Armoniza el cálculo reglamentario con las tarifas progresivas del 5% al 35% y la deducción de gastos personales.',
            content:
              'Para liquidar el impuesto a la renta de las personas naturales y de las sucesiones indivisas, se aplicará a la base imponible la tabla de tarifas contenida en el artículo 36 de la Ley, considerando la rebaja de gastos personales de vivienda, educación, salud, alimentación y vestimenta.\n\nEl Servicio de Rentas Internas publicará anualmente mediante resolución de carácter general las tablas de los literales a) y d) del Art. 36 actualizadas según la variación anual del IPC urbano dictada por el INEC.'
          },
          {
            year: 2008,
            label: 'Reforma Equidad Tributaria 2008',
            cite: 'Reglamento de Aplicación LRTI • R.O. Suplemento 242',
            validFrom: '2008-01-01',
            validTo: '2008-12-31',
            summary: 'Incorpora nuevos tramos progresivos (hasta 35%) y tabla progresiva de herencias, legados y donaciones (0% a 35%).',
            content:
              'Para liquidar el impuesto a la renta de personas naturales y sucesiones indivisas se aplicará la tabla progresiva reformada por la Ley de Equidad Tributaria (tramos del 5% al 35%), así como la tabla progresiva para incrementos patrimoniales gratuitos por herencias, legados y donaciones.'
          },
          {
            year: 2005,
            label: 'Codificación Reglamentaria 2005',
            cite: 'Decreto Ejecutivo 2209 • R.O. Suplemento 484',
            validFrom: '2005-01-01',
            validTo: '2007-12-31',
            summary: 'Reglamentaba la tabla con tarifa máxima del 25% y tarifa única del 5% en herencias, legados y donaciones.',
            content:
              'Para liquidar el impuesto a la renta de las personas naturales y de las sucesiones indivisas se aplicará a la base imponible la tabla del artículo 36 literal a) con tarifas del 5% al 25%. En el caso de herencias, legados y donaciones se aplicará la tarifa única del 5% sobre el excedente de la fracción básica no gravada.'
          }
        ],
        childItems: [
          {
            id: 'cascade-sri-nac-1467',
            level: 'resolucion',
            levelLabel: 'Resolución General del SRI',
            normName: 'Actualización de Rangos de Tablas del Art. 36 LRTI (Personas Naturales y Herencias)',
            normCode: 'NAC-DGER2008-1467',
            articleLabel: 'Arts. 1 y 2',
            articleTitle: 'Tablas Oficiales de Impuesto a la Renta y Herencias, Legados y Donaciones (Ejercicio 2009)',
            content:
              'Art. 1.- Actualizar los rangos de la tabla prevista en el literal a) del artículo 36 de la Ley de Régimen Tributario Interno para la liquidación del Impuesto a la Renta de personas naturales y sucesiones indivisas correspondiente al ejercicio fiscal 2009 (Fracción Básica exenta hasta USD 8.570,00; tarifa máxima 35% desde USD 87.170,00).\n\nArt. 2.- Actualizar los rangos de la tabla prevista en el literal d) del artículo 36 de la Ley de Régimen Tributario Interno para la liquidación del impuesto sobre ingresos provenientes de herencias, legados y donaciones para el período fiscal 2009 (Fracción Básica exenta hasta USD 54.820,00; tarifa máxima 35% desde USD 657.890,00).',
            legalStatus: 'vigente',
            relationNote: 'Publicada en el Segundo Suplemento del Registro Oficial No. 491 de 18 de diciembre de 2008.',
            historicalVersions: [
              {
                year: 2009,
                label: 'NAC-DGER2008-1467 (2009)',
                cite: 'R.O. 2S-491 de 18-dic-2008',
                validFrom: '2009-01-01',
                validTo: '2009-12-31',
                summary: 'Fija una única tabla oficial para Personas Naturales 2009 (base exenta USD 8.570) y una única tabla para Herencias 2009 (base exenta USD 54.820).',
                content:
                  'Resolución NAC-DGER2008-1467:\n• Tabla Literal a) Personas Naturales 2009: Fracción básica exenta USD 8.570,00; tramos progresivos del 5%, 10%, 12%, 15%, 20%, 25%, 30% y 35%.\n• Tabla Literal d) Herencias, Legados y Donaciones 2009: Fracción básica exenta USD 54.820,00; tramos progresivos del 5%, 10%, 15%, 20%, 25%, 30% y 35%.'
              },
              {
                year: 2008,
                label: 'Tablas Base R.O. 242 (2008)',
                cite: 'Ley Reformatoria para la Equidad Tributaria • R.O. 3S-242',
                validFrom: '2008-01-01',
                validTo: '2008-12-31',
                summary: 'Tablas establecidas directamente por la reforma legal de diciembre de 2007 para el ejercicio 2008 (base exenta USD 7.850 y herencias USD 50.000).',
                content:
                  'Tablas Ejercicio 2008 (Ley Reformatoria para la Equidad Tributaria):\n• Tabla Literal a) Personas Naturales 2008: Fracción básica exenta USD 7.850,00; tramos hasta USD 79.800,00 en adelante (35%).\n• Tabla Literal d) Herencias, Legados y Donaciones 2008: Fracción básica exenta USD 50.000,00; tramos hasta USD 600.000,00 en adelante (35%).'
              },
              {
                year: 2007,
                label: 'NAC-DGER2006-0844 (2007)',
                cite: 'R.O. 427 de 29-dic-2006',
                validFrom: '2007-01-01',
                validTo: '2007-12-31',
                summary: 'Actualizó los rangos para el ejercicio 2007 con fracción básica exenta de USD 7.850,00 y tarifa máxima del 25%.',
                content:
                  'Resolución NAC-DGER2006-0844 (Ejercicio Fiscal 2007):\n• Fracción básica desgravada: USD 7.850,00.\n• Tramos progresivos del 5%, 10%, 15%, 20% y 25% (sobre el exceso de USD 62.800,00).'
              },
              {
                year: 2006,
                label: 'NAC-DGER2005-0628 (2006)',
                cite: 'R.O. 176 de 29-dic-2005',
                validFrom: '2006-01-01',
                validTo: '2006-12-31',
                summary: 'Actualizó los rangos para el ejercicio 2006 con fracción básica exenta de USD 7.680,00 y tarifa máxima del 25%.',
                content:
                  'Resolución NAC-DGER2005-0628 (Ejercicio Fiscal 2006):\n• Fracción básica desgravada: USD 7.680,00.\n• Tramos progresivos del 5%, 10%, 15%, 20% y 25% (sobre el exceso de USD 61.440,00).'
              },
              {
                year: 2005,
                label: 'Resolución 9170104DGER-0773 (2005)',
                cite: 'R.O. 492 de 29-dic-2004',
                validFrom: '2005-01-01',
                validTo: '2005-12-31',
                summary: 'Actualizó los rangos para el ejercicio 2005 con fracción básica exenta de USD 7.400,00 y tarifa máxima del 25%.',
                content:
                  'Resolución 9170104DGER-0773 (Ejercicio Fiscal 2005):\n• Fracción básica desgravada: USD 7.400,00.\n• Tramos progresivos del 5%, 10%, 15%, 20% y 25% (sobre el exceso de USD 59.200,00).'
              }
            ]
          }
        ]
      }
    ];
    return [...presetArt36, ...mappedDbItems.filter(m => !m.normCode.includes('1467'))];
  }

  if (mappedDbItems.length > 0 || !isLrtiNorm) {
    return mappedDbItems;
  }

  if (artNum === 55) {
    return [
      {
        id: 'cascade-ralrti-art140',
        level: 'reglamento',
        levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
        normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
        normCode: 'RALRTI',
        articleLabel: 'Art. 140',
        articleTitle: 'Transferencias e Importaciones con Tarifa Cero por Ciento (0%) de IVA',
        content:
          'Para los efectos del artículo 55 de la Ley, los productos de origen agrícola, avícola, pecuario, apícola, cunícola, bioacuáticos y carnes que se comercialicen en estado natural mantendrán la tarifa cero de IVA aun cuando hayan sido sometidos a procesos de enfriamiento, refrigeración, congelamiento, corte, desmote, empaque o envasado.',
        legalStatus: 'vigente_reformado',
        relationNote: 'Delimita el concepto de estado natural y conservación de tarifa 0% de IVA.',
        historicalVersions: [
          {
            year: 2008,
            label: 'Reforma 2008 (Vigente)',
            cite: 'Reglamento LRTI • R.O. Suplemento 337',
            validFrom: '2008-05-15',
            validTo: 'Presente',
            summary: 'Incorpora precisiones sobre medicamentos de uso humano, insumos agrícolas y papel periódico.',
            content:
              'Para los efectos del artículo 55 de la Ley, los productos alimenticios en estado natural y los insumos de uso agropecuario detallados en el decreto ejecutivo correspondiente conservan tarifa 0% de IVA.'
          },
          {
            year: 2005,
            label: 'Codificación 2005',
            cite: 'Decreto Ejecutivo 2209',
            validFrom: '2005-01-01',
            validTo: '2008-05-14',
            summary: 'Redacción original sobre bienes en estado natural y refrigeración simple.',
            content:
              'Se consideran alimentos en estado natural aquellos que no han sufrido transformación en su naturaleza original, aunque se encuentren refrigerados o empacados para su transporte.'
          }
        ],
        childItems: [
          {
            id: 'cascade-sri-circ02',
            level: 'circular',
            levelLabel: 'Circular Aclaratoria del SRI',
            normName: 'Circular sobre Cadena Agropecuaria e Insumos Exentos de IVA',
            normCode: 'NAC-DGECCGC08-0002',
            articleLabel: 'Criterio Vinculante',
            articleTitle: 'Tratamiento Tributario en Transferencias de Insumos Agropecuarios y Alimentos',
            content:
              'El Servicio de Rentas Internas recuerda a los sujetos pasivos que la transferencia local e importación de semillas certificadas, bulbos, plantas, esquejes, raíces vivas, fertilizantes e insecticidas gozan de tarifa cero por ciento de IVA.',
            legalStatus: 'vigente',
            relationNote: 'Criterio de aplicación obligatoria para emisión de comprobantes de venta bajo Art. 55 LRTI.',
            historicalVersions: [
              {
                year: 2008,
                label: 'Circular 2008 (Vigente)',
                cite: 'R.O. Suplemento 2008',
                validFrom: '2008-01-01',
                validTo: 'Presente',
                summary: 'Unifica el listado de insumos agrícolas y pecuarios con tarifa 0% tras la Ley de Equidad Tributaria.',
                content:
                  'Circular NAC-DGECCGC08-0002: Aplicación directa de tarifa 0% de IVA en toda la cadena de distribución de insumos agropecuarios y bienes de primera necesidad.'
              }
            ]
          }
        ]
      }
    ];
  }

  // Fallback estructurado para cualquier artículo de la ley para que siempre disponga de su bloque jerárquico colapsable y su histórico
  return [
    {
      id: `cascade-ralrti-gen-${art.id}`,
      level: 'reglamento',
      levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
      normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
      normCode: 'RALRTI',
      articleLabel: `Concordancia Reglamentaria (${art.label})`,
      articleTitle: `Disposición reglamentaria de desarrollo para ${art.label}${art.title ? ` — ${art.title}` : ''}`,
      content: `Las disposiciones contenidas en ${art.label} de la Ley de Régimen Tributario Interno se aplicarán de conformidad con las normas reglamentarias de determinación, control y liquidación establecidas en el Reglamento para la Aplicación de la Ley de Régimen Tributario Interno y las resoluciones de carácter general emitidas por el Servicio de Rentas Internas.`,
      legalStatus: 'vigente',
      relationNote: `Desarrollo reglamentario subordinado a ${art.label}.`,
      historicalVersions: [
        {
          year: 2008,
          label: 'Texto Reglamentario Vigente (2008)',
          cite: 'Reglamento para la Aplicación de la LRTI • R.O. 337',
          validFrom: '2008-05-15',
          validTo: 'Presente',
          summary: `Armonización reglamentaria posterior a la Ley Reformatoria para la Equidad Tributaria respecto a ${art.label}.`,
          content: `Texto reglamentario actualizado en concordancia con las reformas introducidas a ${art.label} de la LRTI.`
        },
        {
          year: 2005,
          label: 'Codificación Reglamentaria (2005)',
          cite: 'Decreto Ejecutivo 2209 • R.O. 484',
          validFrom: '2005-01-01',
          validTo: '2008-05-14',
          summary: `Redacción reglamentaria previa vinculada a la Codificación 2004-026 de la LRTI (${art.label}).`,
          content: `Disposición reglamentaria original dictada en desarrollo de la Codificación 2004-026 para ${art.label}.`
        }
      ],
      childItems: [
        {
          id: `cascade-sri-gen-${art.id}`,
          level: 'resolucion',
          levelLabel: 'Resolución Operativa del SRI',
          normName: 'Normativa Secundaria de Cumplimiento Tributario del SRI',
          normCode: 'SRI-NAC-DGER',
          articleLabel: 'Disposición Aplicable',
          articleTitle: `Procedimiento administrativo y formularios vinculados a ${art.label}`,
          content: `Los sujetos pasivos alcanzados por las disposiciones de ${art.label} deberán registrar las operaciones correspondientes en los formularios declarativos y anexos transaccionales aprobados mediante resolución general del Servicio de Rentas Internas.`,
          legalStatus: 'vigente',
          relationNote: `Instrucción administrativa de cumplimiento para ${art.label}.`,
          historicalVersions: [
            {
              year: 2008,
              label: 'Resolución Vigente (2008)',
              cite: 'Resolución General SRI • Registro Oficial',
              validFrom: '2008-01-01',
              validTo: 'Presente',
              summary: 'Actualización de instructivos y casilleros declarativos del SRI.',
              content: `Resolución operativa vigente para la declaración y control de las obligaciones derivadas de ${art.label}.`
            }
          ]
        }
      ]
    }
  ];
};

// ============================================================================
// MODELO Y RESOLUCIÓN DE LÍNEA DE TIEMPO HISTÓRICA (REFORMAS DE ECUADOR)
// ============================================================================
export interface HistoricalArticleVersion {
  id: string;
  version_number: number;
  version_year: number;
  is_current: boolean;
  reform_cite: string;
  official_registry: string;
  valid_from: string;
  valid_to: string;
  summary_change: string;
  content: string;
  legal_status: LegalStatus;
  ro_published_on?: string | null;
  tax_periodicity?: string | null;
  validity_rule?: string | null;
  is_fe_erratas_replaced?: boolean;
  validity_display_label?: string | null;
  manual_validity_override?: boolean;
  raw_valid_from?: string | null;
  raw_valid_to?: string | null;
  table_diff_mode?: string | null;
  changed_in_this_version?: boolean;
}

export const getHistoricalVersionsForArticle = (
  art: NormStructure | null | undefined,
  dbVersions: NormStructure[]
): HistoricalArticleVersion[] => {
  if (!art) return [];

  // 1. PRIORIDAD ABSOLUTA: Versiones reales del Registro Oficial almacenadas en Supabase
  //    Orden cronológico estricto del más reciente al más antiguo:
  //    1) Fecha de vigencia (valid_from, Art. 11 CT o editada por el administrador)
  //    2) Fecha de publicación en Registro Oficial (ro_published_on)
  //    3) Estado vigente actual, longitud de contenido y número de versión
  const cleanDbVersions = dbVersions.filter(v => !v.superseded_duplicate && !v.obsolete_subelement);
  if (cleanDbVersions.length > 1) {
    const seenReforms = new Set<string>();
    const sortedCandidates = [...cleanDbVersions].sort((a, b) => {
      const da = a.valid_from || '';
      const db = b.valid_from || '';
      if (da !== db) return db.localeCompare(da);
      const roA = a.ro_published_on || '';
      const roB = b.ro_published_on || '';
      if (roA !== roB) return roB.localeCompare(roA);
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      const lenA = (a.content || '').length;
      const lenB = (b.content || '').length;
      if (lenA !== lenB) return lenB - lenA;
      return b.version_number - a.version_number;
    });

    const uniqueDbVersions = sortedCandidates.filter(v => {
      // Deduplicar re-extracciones de la misma reforma conservando reformas distintas del mismo período (distinta fecha RO)
      const vfKey = v.valid_from || `no-date-${v.version_number}`;
      const roKey = v.ro_published_on || 'no-ro';
      const errataFlag = v.is_fe_erratas_replaced ? 'errata-replaced' : v.is_fe_erratas ? 'errata' : 'standard';
      const dedupKey = `${vfKey}__${roKey}__${errataFlag}`;
      if (seenReforms.has(dedupKey)) return false;
      seenReforms.add(dedupKey);
      return true;
    });

    return uniqueDbVersions.map((v, idx) => {
      const parsedYear = v.valid_from ? Number(v.valid_from.slice(0, 4)) : 2006 - idx;
      const year = isNaN(parsedYear) ? 2006 - idx : parsedYear;
      const cite = v.reform_source_cite || (v.is_current ? 'Texto Vigente Consolidado' : `Reforma v${v.version_number}`);
      const roDate = v.ro_published_on || null;
      const ro = v.official_registry || (roDate ? `Registro Oficial (${roDate})` : 'Registro Oficial');
      const content = v.content;
      const summary =
        v.summary_change ||
        (v.is_current
          ? 'Texto consolidado vigente tras las reformas del Registro Oficial.'
          : `Redacción vigente desde ${v.valid_from || 'origen'} hasta ${v.valid_to || 'su reforma'}.`);

      return {
        id: v.id,
        version_number: uniqueDbVersions.length - idx,
        version_year: year,
        is_current: idx === 0 ? true : v.is_current,
        reform_cite: cite,
        official_registry: ro,
        valid_from: v.valid_from || '—',
        valid_to: idx === 0 ? 'Presente (Vigente)' : v.valid_to || 'Reforma posterior',
        summary_change: summary,
        content,
        legal_status: idx === 0 ? v.legal_status : 'derogado',
        ro_published_on: roDate,
        tax_periodicity: v.tax_periodicity || null,
        validity_rule: v.validity_rule || null,
        is_fe_erratas_replaced: v.is_fe_erratas_replaced,
        validity_display_label: v.validity_display_label || null,
        manual_validity_override: v.manual_validity_override,
        raw_valid_from: v.valid_from,
        raw_valid_to: v.valid_to,
        table_diff_mode: v.table_diff_mode || null,
        changed_in_this_version: v.changed_in_this_version
      };
    });
  }

  // 2. Fallback para artículos con una sola versión en Supabase
  const singleYear = art.valid_from ? Number(art.valid_from.slice(0, 4)) : 2004;
  return [
    {
      id: art.id,
      version_number: 1,
      version_year: isNaN(singleYear) ? 2004 : singleYear,
      is_current: art.is_current,
      reform_cite: art.reform_source_cite || 'Codificación 2004-026 de la LRTI (R.O. Suplemento 463)',
      official_registry: art.official_registry || 'Suplemento del Registro Oficial No. 463 de 17 de noviembre de 2004',
      valid_from: art.valid_from || '—',
      valid_to: art.valid_to || (art.legal_status === 'derogado' ? 'Derogado' : 'Presente (Vigente)'),
      summary_change: art.summary_change || 'Redacción original sin modificaciones posteriores registradas en este período.',
      content: art.content,
      legal_status: art.legal_status,
      ro_published_on: art.ro_published_on || null,
      tax_periodicity: art.tax_periodicity || null,
      validity_rule: art.validity_rule || null,
      is_fe_erratas_replaced: art.is_fe_erratas_replaced,
      validity_display_label: art.validity_display_label || null,
      manual_validity_override: art.manual_validity_override,
      raw_valid_from: art.valid_from,
      raw_valid_to: art.valid_to,
      table_diff_mode: art.table_diff_mode || null,
      changed_in_this_version: art.changed_in_this_version
    }
  ];
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================
export default function App() {
  // Navigation View, Theme (Modo Claro por defecto + persistencia en localStorage) & Auth State
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = window.localStorage.getItem('smartlex_theme_mode');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [currentView, setCurrentView] = useState<'landing' | 'portal'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login'>('register');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [updatingCategoryNormId, setUpdatingCategoryNormId] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark', 'dark');
    } else {
      root.classList.add('theme-dark', 'dark');
      root.classList.remove('theme-light');
    }
    try {
      window.localStorage.setItem('smartlex_theme_mode', themeMode);
    } catch {
      // Ignorar si el navegador restringe localStorage
    }
  }, [themeMode]);

  // Navigation & Simulation State
  const [activeTab, setActiveTab] = useState<MainTab>('reader');
  const [currentPlan, setCurrentPlan] = useState<PlanCode>('professional');
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAddConceptModal, setShowAddConceptModal] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [portalMobileMenuOpen, setPortalMobileMenuOpen] = useState(false);
  const toolsMenuRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toolsMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toolsMenuOpen]);

  // Database Data State
  const [loading, setLoading] = useState(true);
  const [concepts, setConcepts] = useState<TaxConcept[]>([]);
  const [norms, setNorms] = useState<Norm[]>([]);
  const [structures, setStructures] = useState<NormStructure[]>([]);
  const [tables, setTables] = useState<NormativeTable[]>([]);
  const [conceptLinks, setConceptLinks] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [formLinks, setFormLinks] = useState<any[]>([]);
  const [annexLinks, setAnnexLinks] = useState<any[]>([]);
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [taxpayerTypes, setTaxpayerTypes] = useState<any[]>([]);

  // Filter & Selection State (Biblioteca Jerárquica + Lector de Hojas + Pop-up)
  const [readerSubView, setReaderSubView] = useState<'library' | 'document'>('library');
  const [libraryTreeOpen, setLibraryTreeOpen] = useState<Record<string, boolean>>({
    group_normativa: true,
    sub_normas_principales: true,
    sub_normas_suplementarias: true,
    group_tributos: true,
    sub_impuestos: true,
    sub_adicionales: false
  });
  const [selectedLibraryScope, setSelectedLibraryScope] = useState<'principales' | 'suplementarias'>('principales');
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState<
    'convenios' | 'codigos' | 'leyes' | 'reglamentos' | 'decretos' | 'resoluciones' | 'circulares' | 'otras_normas'
  >('leyes');
  const [libraryRightView, setLibraryRightView] = useState<'cards' | 'ficha'>('cards');
  const [libraryPreviewTab, setLibraryPreviewTab] = useState<'summary' | 'tables' | 'reforms'>('summary');
  const [openArticleSheets, setOpenArticleSheets] = useState<Record<string, boolean>>({});
  const [openArticleSources, setOpenArticleSources] = useState<Record<string, boolean>>({});
  const [pinnedNormMap, setPinnedNormMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem('smartlex_pinned_norms_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const isDefaultPrimaryNorm = (n: Norm): boolean => {
    const code = (n.code || '').toUpperCase().trim();
    const title = (n.title || '').toUpperCase().trim();
    if (code === 'LRTI' || code === 'RLRTI' || code === 'RALRTI' || code === 'CT') return true;
    if (
      /^LEY\s+(?:ORG[ÁA]NICA\s+)?DE\s+R[ÉE]GIMEN\s+TRIBUTARIO\s+INTERNO/i.test(title) &&
      !/REFORMATORIA/i.test(title)
    ) {
      return true;
    }
    if (
      /^REGLAMENTO\s+(?:PARA\s+LA\s+APLICACI[ÓO]N\s+)?(?:DE\s+LA\s+|A\s+LA\s+)?LEY\s+DE\s+R[ÉE]GIMEN\s+TRIBUTARIO\s+INTERNO/i.test(
        title
      ) &&
      !/REFORM/i.test(title)
    ) {
      return true;
    }
    return false;
  };

  const isNormPinned = (n: Norm): boolean => {
    if (n.id in pinnedNormMap) {
      return Boolean(pinnedNormMap[n.id]);
    }
    return isDefaultPrimaryNorm(n);
  };

  const handleTogglePinNorm = (n: Norm, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !isNormPinned(n);
    setPinnedNormMap(prev => {
      const updated = { ...prev, [n.id]: nextVal };
      try {
        window.localStorage.setItem('smartlex_pinned_norms_v1', JSON.stringify(updated));
      } catch {
        // Ignorar si localStorage no está disponible
      }
      return updated;
    });
  };
  const [popupCascadeGroupsOpen, setPopupCascadeGroupsOpen] = useState<Record<string, boolean>>({
    modificatorias: false,
    reglamentos: false,
    resoluciones: false,
    tablas: false
  });
  const [popupCascadeItemsOpen, setPopupCascadeItemsOpen] = useState<Record<string, boolean>>({});
  const [popupCascadeHistoryOpen, setPopupCascadeHistoryOpen] = useState<Record<string, boolean>>({});
  const [popupCascadeSelectedYear, setPopupCascadeSelectedYear] = useState<Record<string, number>>({});
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [selectedNormId, setSelectedNormId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | LegalStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedDateSearch, setShowAdvancedDateSearch] = useState<boolean>(false);
  const [searchValidFrom, setSearchValidFrom] = useState<string>('');
  const [searchValidTo, setSearchValidTo] = useState<string>('');
  const [selectedArticleLabel, setSelectedArticleLabel] = useState<string>('Art. 1');
  const [ebookNavMode, setEbookNavMode] = useState<'index' | 'tax' | 'flat'>('index');
  const [selectedTaxFilter, setSelectedTaxFilter] = useState<TaxScopeCode>('ALL');
  const [expandedInlineCascade, setExpandedInlineCascade] = useState<Record<string, boolean>>({});
  const [floatingEbookModal, setFloatingEbookModal] = useState<SecondaryCascadeItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedHistorySubId, setSelectedHistorySubId] = useState<string | null>(null);
  const [showActiveTablesTab, setShowActiveTablesTab] = useState<boolean>(true);
  const [showInactiveTablesTab, setShowInactiveTablesTab] = useState<boolean>(false);
  const [selectedTableTaxGroup, setSelectedTableTaxGroup] = useState<string | null>('impuesto_renta');
  const [selectedTableSeriesKey, setSelectedTableSeriesKey] = useState<string | null>(null);
  const [expandedIndexGroups, setExpandedIndexGroups] = useState<Record<string, boolean>>({
    impuesto_renta: true
  });
  const [expandedTableIds, setExpandedTableIds] = useState<Record<string, boolean>>({});
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [isCurrentColExpanded, setIsCurrentColExpanded] = useState<boolean>(false);
  const [openSummaryId, setOpenSummaryId] = useState<string | null>(null);
  const [activeHistoryYear, setActiveHistoryYear] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [newConceptForArticle, setNewConceptForArticle] = useState<{ articleId: string; code: string; name: string; type: string } | null>(null);

  // Discrepancy Reporting & QA State
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportingArticle, setReportingArticle] = useState<NormStructure | null>(null);
  const [reportType, setReportType] = useState<string>('errata');
  const [reportComment, setReportComment] = useState<string>('');
  const [reportUserContact, setReportUserContact] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Calculators State
  const [calcIncome, setCalcIncome] = useState<number>(38500);
  const [calcDeductions, setCalcDeductions] = useState<number>(4200);
  const [calcPersonalExpenses, setCalcPersonalExpenses] = useState<number>(5300);
  const [calcFamilyLoads, setCalcFamilyLoads] = useState<number>(2);
  const [calcRimpeIncome, setCalcRimpeIncome] = useState<number>(145000);
  const [calcDividendAmount, setCalcDividendAmount] = useState<number>(60000);

  // New Dynamic Concept Form
  const [newConceptCode, setNewConceptCode] = useState('');
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptDesc, setNewConceptDesc] = useState('');

  // WhatsApp & PlacetoPay Modal State
  const [waPhone, setWaPhone] = useState('+593991234567');
  const [rucNinthDigit, setRucNinthDigit] = useState<number>(9);
  const [selectedTaxpayerType, setSelectedTaxpayerType] = useState<string>('PN_OBLIGADA');
  const [checkoutToast, setCheckoutToast] = useState<string | null>(null);

  // Chatbot State
  const [chatUsed, setChatUsed] = useState<number>(14);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: '¡Bienvenido a SmartLex IA! Estoy conectado a la matriz normativa ecuatoriana (Código Tributario, LRTI, RLRTI, Resoluciones NAC y Tablas 2026). Tienes un límite de 100 consultas mensuales en tu Plan Plus.'
    }
  ]);

  // Helper to map DB structure row to UI NormStructure shape
  const getCompactNormCardMeta = (
    n: Norm,
    category: string
  ): { heading: string; description: string } => {
    const rawTitle = (n.title || '').trim();
    const rawCode = (n.code || '').trim();

    if (category === 'decretos') {
      const codeMatch = rawCode.match(/^(?:DE|DECRETO-EJECUTIVO)-(\d+[A-Za-z-]*)$/i);
      const titleNumMatch = rawTitle.match(
        /^Decreto\s+Ejecutivo\s+(?:No\.?|N°|Nro\.?)?\s*(\d+[A-Za-z-]*)/i
      );
      const decreeNum = codeMatch?.[1] || titleNumMatch?.[1];
      const heading = decreeNum ? `Decreto Ejecutivo No. ${decreeNum}` : rawCode || rawTitle;
      const cleanedDesc = rawTitle
        .replace(
          /^Decreto\s+Ejecutivo\s+(?:No\.?|N°|Nro\.?)?\s*\d+[A-Za-z-]*\s*(?:[—–\-:]\s*)?/i,
          ''
        )
        .trim();
      return {
        heading,
        description: cleanedDesc || rawTitle
      };
    }

    return {
      heading: rawCode || rawTitle,
      description: rawTitle
    };
  };

  const mapStructureRow = (s: any): NormStructure => {
    const rawNorm = s.norm_versions?.norms || s.norms;
    const mappedNorm: Norm | undefined = rawNorm
      ? {
        id: rawNorm.id,
        code: rawNorm.code,
        title: rawNorm.name || rawNorm.title || rawNorm.code,
        norm_type: rawNorm.normative_type || rawNorm.norm_type || 'law',
        hierarchy_level: String(rawNorm.metadata?.hierarchy_level || '1'),
        is_secondary:
          rawNorm.normative_type === 'regulation' ||
          rawNorm.normative_type === 'decree' ||
          rawNorm.normative_type === 'resolution' ||
          rawNorm.normative_type === 'circular',
        drive_folder_path:
          rawNorm.metadata?.folder_category ||
          (rawNorm.normative_type === 'decree'
            ? '08_decretos_ejecutivos'
            : rawNorm.normative_type === 'regulation' || rawNorm.code === 'RALRTI' || rawNorm.code === 'RLRTI'
              ? '03_reglamentos'
              : '02_leyes'),
        storage_object_path: `${rawNorm.metadata?.folder_category || (rawNorm.normative_type === 'decree' ? '08_decretos_ejecutivos' : '02_leyes')}/${rawNorm.code}.pdf`
      }
      : undefined;

    const ident = (s.identifier || s.label || '').trim();
    const structType = s.structure_type || 'article';

    let formattedLabel = '';
    let cleanTitle = (s.title || '').trim();

    if (structType === 'article') {
      formattedLabel = /^Art(?:[íi]culo|\.)/i.test(ident) ? ident : `Art. ${ident}`;
    } else if (structType === 'transitory') {
      formattedLabel = /^Disp/i.test(ident) ? ident : `Disp. Transitoria ${ident}`;
    } else if (structType === 'final') {
      formattedLabel = /^Disp/i.test(ident) ? ident : `Disp. Final ${ident}`;
    } else if (structType === 'reform') {
      formattedLabel = /^Disp/i.test(ident) ? ident : `Disp. Reformatoria ${ident}`;
    } else if (structType === 'title') {
      formattedLabel = /^T[íi]tulo/i.test(ident) ? ident : `Título ${ident}`;
    } else if (structType === 'chapter') {
      formattedLabel = /^Cap[íi]tulo/i.test(ident) ? ident : `Capítulo ${ident}`;
    } else if (structType === 'literal') {
      const marker = s.metadata?.display_marker || (s.metadata?.sub_code ? `${s.metadata.sub_code})` : ident);
      formattedLabel = `Literal ${marker}`;
    } else if (structType === 'numeral') {
      const code = s.metadata?.sub_code || ident;
      formattedLabel = `Numeral ${code}`;
    } else if (structType === 'paragraph' || structType === 'item') {
      formattedLabel = s.metadata?.display_marker || s.title || ident || 'Inciso';
    } else {
      formattedLabel = ident ? `Disp. ${ident}` : 'Disposición';
    }

    // Normalizar la etiqueta eliminando dos puntos o signos finales
    formattedLabel = formattedLabel.replace(/[:.-]+$/, '').trim();

    // Detectar artículos innumerados (internamente conservan su código decimal p. ej. 73.1,
    // pero visualmente se muestran como "Art. (...)" conforme a la técnica legislativa ecuatoriana)
    const rawTitleText = (s.title || '').trim();
    const rawContentText = (s.content || '').trim();
    const isInnumerado =
      structType === 'article' &&
      (Boolean(s.metadata?.is_innumerado) ||
        /^\s*Art(?:[íi]culo|\.)?\s*\(\.\.\.\)/i.test(rawTitleText) ||
        /^\s*Art(?:[íi]culo|\.)?\s*\(\.\.\.\)/i.test(rawContentText) ||
        /\binnumerad/i.test(rawTitleText));

    const afterArticle: string | null =
      s.metadata?.after_article ||
      (isInnumerado ? ident.match(/^(\d+)/)?.[1] || (s.ordinal ? String(s.ordinal) : null) : null);

    const decimalOrderMatch = ident.match(/^\d+\.(\d+)/);
    const innumeradoOrder: number | null = isInnumerado
      ? Number(s.metadata?.innumerado_order) || (decimalOrderMatch ? parseInt(decimalOrderMatch[1], 10) : 1)
      : null;

    // Limpieza profunda del título para evitar duplicaciones (ej. Art. 36: Art. 36: Tarifa..., Art. (...).- ..., Art. innumerado a continuación del Art. 73.- ...)
    cleanTitle = cleanTitle
      .replace(/^Art(?:[íi]culo|\.)?\s*(?:\(\.\.\.\)|innumerad[oa](?:\s+a\s+continuaci[óo]n\s+del\s+Art(?:[íi]culo|\.)?\s*\d+)?)\s*[:.-]*\s*/i, '')
      .replace(/^(?:(?:Art(?:[íi]culo|\.)?|Disp(?:osici[óo]n)?(?:\s+(?:Transitoria|Final|Reformatoria|General))?|T[íi]tulo|Cap[íi]tulo)\s*[\w\d.áéíóúÁÉÍÓÚ]+\s*[:.-]*\s*)+/i, '')
      .replace(/^[:.-]+\s*/, '')
      .trim();

    // Si el título empieza con la misma etiqueta o identificador, removerlo
    if (formattedLabel && cleanTitle.toLowerCase().startsWith(formattedLabel.toLowerCase())) {
      cleanTitle = cleanTitle.substring(formattedLabel.length).replace(/^[:.-]+\s*/, '').trim();
    }
    if (ident && cleanTitle.toLowerCase().startsWith(ident.toLowerCase())) {
      cleanTitle = cleanTitle.substring(ident.length).replace(/^[:.-]+\s*/, '').trim();
    }

    if (cleanTitle.toLowerCase() === formattedLabel.toLowerCase() || cleanTitle.toLowerCase() === ident.toLowerCase()) {
      cleanTitle = '';
    }

    // Limpieza defensiva en artículos secundarios (especialmente RALRTI) cuando el texto normativo quedó volcado dentro de title
    if (
      structType !== 'title' &&
      structType !== 'chapter' &&
      mappedNorm?.code !== 'LRTI'
    ) {
      const bodyPrefixRe =
        /^(?:Cuando\s+|Para\s+(?:la\s+(?:aplicaci[oó]n|determinaci[oó]n)|efectos)\b|En\s+el\s+caso\b|Las\s+(?:personas\s+naturales|adquisiciones\s+de\s+bienes)\b|No\s+se\s+reducir[aá]\b|Est[aá]n\s+exentos\b|Constituyen\s+pagos\b|Real[ií]cense\s+las\s+siguientes\b|De\s+la\s+tramitaci[oó]n\b|La\s+emisi[oó]n\s+de\s+oficios\b|Hasta\s+tanto\s+el\s+Comit[eé]\b)/i;

      cleanTitle = cleanTitle.replace(/^[“"«']+/, '').replace(/\s+/g, ' ').trim();

      if (/^[a-zñ]\)\s+/i.test(cleanTitle)) {
        cleanTitle = '';
      } else if (
        /^(?:DISPOSICI[ÓO]N\s+\w+|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+\w+)?|VIG[ÉE]SIMA(?:\s+\w+)?)\s*[:.-]+\s*/i.test(
          cleanTitle
        ) &&
        cleanTitle.length > 80
      ) {
        cleanTitle = '';
      }

      if (cleanTitle) {
        const epMatch = cleanTitle.match(/^(.{3,180}?)\.\-\s+(.+)$/);
        if (epMatch) {
          const candidateEp = epMatch[1].replace(/[.:–—-\s]+$/, '').trim();
          cleanTitle = bodyPrefixRe.test(candidateEp) ? '' : candidateEp;
        } else if (/\.\-\s*$/.test(cleanTitle) && cleanTitle.length <= 220) {
          cleanTitle = cleanTitle.replace(/\.\-\s*$/, '').replace(/[.:–—-\s]+$/, '').trim();
          if (bodyPrefixRe.test(cleanTitle)) cleanTitle = '';
        } else if (cleanTitle.length > 185 || bodyPrefixRe.test(cleanTitle)) {
          cleanTitle = '';
        } else {
          cleanTitle = cleanTitle.replace(/\.\-?\s*$/, '').trim();
        }
      }

      if (!cleanTitle && rawContentText) {
        const cleanBodyHead = rawContentText
          .replace(/\s+/g, ' ')
          .replace(
            /^\s*[“"«']?\s*(?:Art(?:[íi]culo|\.)?\s*(?:\(\.\.\.\)|[\d.]+|[A-Za-z0-9.-]+)\s*[:.-]*\s*)+/i,
            ''
          )
          .trim();
        const bodyEpMatch = cleanBodyHead.match(/^([^.\n]{4,140}?)\.\-\s+.+$/);
        if (bodyEpMatch) {
          const candidate = bodyEpMatch[1].replace(/[.:–—-\s]+$/, '').trim();
          if (!bodyPrefixRe.test(candidate) && !/^[a-zñ]\)\s+/i.test(candidate)) {
            cleanTitle = candidate;
          }
        }
      }
    }

    return {
      id: s.id,
      norm_id: s.norm_versions?.norm_id || s.norm_id || mappedNorm?.id || '',
      identifier: ident,
      label: formattedLabel,
      display_label: isInnumerado ? 'Art. (...)' : formattedLabel,
      is_innumerado: isInnumerado,
      after_article: afterArticle,
      innumerado_order: innumeradoOrder,
      title: cleanTitle,
      content: s.content || '',
      version_number: s.norm_versions?.version_number || s.version_number || 1,
      is_current: s.is_current ?? true,
      valid_from: s.valid_from || s.norm_versions?.published_on || null,
      valid_to: s.valid_until || s.valid_to || (s.norm_versions?.effective_during ? s.norm_versions.effective_during.split(',')[1]?.replace(/[)\]\s]/g, '') : null) || null,
      reform_source_cite: s.metadata?.reform_source_cite || s.norm_versions?.title || s.reform_source_cite || null,
      official_registry: s.metadata?.official_registry || null,
      summary_change: s.metadata?.summary_change || null,
      legal_status: s.legal_status || 'vigente',
      review_status: s.review_status || 'approved',
      order_index: s.ordinal ?? s.order_index ?? 1,
      norms: mappedNorm,
      structure_type: structType,
      parent_id: s.parent_id || null,
      parent_title: s.metadata?.parent_title || null,
      parent_chapter: s.metadata?.parent_chapter || null,
      ro_published_on: s.metadata?.ro_published_on || s.norm_versions?.published_on || null,
      tax_periodicity: s.metadata?.tax_periodicity || null,
      validity_rule: s.metadata?.validity_rule || null,
      is_fe_erratas: Boolean(s.metadata?.is_fe_erratas),
      is_fe_erratas_replaced: Boolean(s.metadata?.is_fe_erratas_replaced),
      validity_display_label: s.metadata?.validity_display_label || null,
      manual_validity_override: Boolean(s.metadata?.manual_validity_override),
      sub_kind: s.metadata?.sub_kind || null,
      sub_code: s.metadata?.sub_code || null,
      display_marker: s.metadata?.display_marker || null,
      article_identifier: s.metadata?.article_identifier || null,
      changed_in_this_version:
        s.metadata?.changed_in_this_version === undefined
          ? true
          : Boolean(s.metadata?.changed_in_this_version),
      superseded_duplicate: Boolean(s.metadata?.superseded_duplicate),
      obsolete_subelement: Boolean(s.metadata?.obsolete_subelement),
      table_diff_mode: s.metadata?.table_diff_mode || null
    };
  };

  const isFetchingDataRef = React.useRef(false);

  // Load all data from Supabase (carga prioritaria del texto normativo + relaciones en segundo plano)
  const fetchAllData = async () => {
    if (isFetchingDataRef.current) return;
    isFetchingDataRef.current = true;
    setLoading(true);
    const fetchAllPages = async (
      tableName: string,
      selectCols: string,
      orderCol?: string,
      customPageSize = 1000
    ) => {
      const allRows: any[] = [];
      let from = 0;
      while (true) {
        let q = supabase.from(tableName).select(selectCols).range(from, from + customPageSize - 1);
        if (tableName === 'normative_structures') {
          q = q.neq('structure_type', 'title').neq('structure_type', 'chapter');
        }
        if (orderCol) q = q.order(orderCol, { ascending: true });
        if (tableName === 'normative_structures' && orderCol !== 'id') {
          q = q.order('id', { ascending: true });
        }
        const { data, error } = await q;
        if (error) {
          console.error(`[fetchAllPages] Error cargando ${tableName}:`, error);
          break;
        }
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < customPageSize) break;
        from += customPageSize;
      }
      return { data: allRows };
    };

    try {
      // 1. Carga crítica sin JOINs pesados: norms (139), norm_versions (188) y normative_structures por PK id
      //    Luego se vinculan en memoria en <1ms evitando timeouts 57014 en Supabase
      const [conceptsRes, normsRes, normVersionsRes, structuresRes, tablesRes, taxpayerRes] = await Promise.all([
        supabase.from('tax_concepts').select('*').order('name'),
        supabase.from('norms').select('*').order('name'),
        supabase.from('norm_versions').select('id, norm_id, version_number, title, published_on, effective_during'),
        fetchAllPages('normative_structures', '*', 'id', 500),
        supabase.from('normative_tables').select('*').order('code'),
        supabase.from('taxpayer_types').select('*').order('name')
      ]);

      const visibleNorms = (normsRes.data || []).filter((n: any) => !n.metadata?.archived_hidden);

      const rawNormsById = new Map<string, any>();
      visibleNorms.forEach((n: any) => rawNormsById.set(n.id, n));

      const rawVersionsById = new Map<string, any>();
      if (normVersionsRes.data) {
        normVersionsRes.data.forEach((nv: any) => {
          rawVersionsById.set(nv.id, {
            ...nv,
            norms: rawNormsById.get(nv.norm_id) || null
          });
        });
      }

      if (conceptsRes.data) {
        setConcepts(
          conceptsRes.data.map((c: any, idx: number) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description || '',
            concept_type: c.concept_type || 'general',
            parent_id: c.parent_id || null,
            sort_order: c.metadata?.order ?? idx + 1
          }))
        );
      }

      if (normsRes.data) {
        setNorms(
          visibleNorms.map((n: any) => {
            const folder =
              n.metadata?.folder_category ||
              (n.code === 'CT'
                ? '01_codigos'
                : n.code === 'RALRTI' || n.code === 'RLRTI' || n.normative_type === 'regulation'
                  ? '03_reglamentos'
                  : n.normative_type === 'decree'
                    ? '08_decretos_ejecutivos'
                    : n.code.includes('DGER')
                      ? '05_resoluciones_sri'
                      : n.code.includes('DGECC')
                        ? '06_circulares_sri'
                        : '02_leyes');
            return {
              id: n.id,
              code: n.code,
              title: n.name || n.title || n.code,
              norm_type: n.normative_type || 'law',
              publication_date: n.publication_date || null,
              hierarchy_level: String(n.metadata?.hierarchy_level || '1'),
              is_secondary:
                n.normative_type === 'regulation' ||
                n.normative_type === 'decree' ||
                n.normative_type === 'resolution' ||
                n.normative_type === 'circular',
              drive_folder_path: folder,
              storage_object_path: `${folder}/${n.code}.pdf`
            };
          })
        );
      }

      if (structuresRes.data) {
        setStructures(
          structuresRes.data
            .map((s: any) =>
              mapStructureRow({
                ...s,
                norm_versions: s.norm_versions || rawVersionsById.get(s.norm_version_id) || null
              })
            )
            .filter((s: NormStructure) => Boolean(s.norms) && !s.superseded_duplicate && !s.obsolete_subelement)
        );
      }

      if (tablesRes.data) {
        setTables(
          tablesRes.data.map((t: any) => ({
            id: t.id,
            norm_id: t.norm_id,
            structure_id: t.structure_id,
            table_code: t.table_code || t.code || 'TBL',
            title: t.title,
            subtitle: t.subtitle || t.description || '',
            category: t.category || t.table_category || 'rates',
            fiscal_year: t.fiscal_year || 2026,
            effective_during: t.effective_during || null,
            columns_schema: t.columns_schema || [],
            rows_data: t.rows_data || [],
            notes: t.notes || null,
            is_active: t.is_active !== false,
            article_structure_id: t.metadata?.article_structure_id || null,
            sub_identifier: t.metadata?.sub_identifier || null,
            table_diff_mode: t.metadata?.table_diff_mode || null,
            emitter_norm_id: t.metadata?.emitter_norm_id || null,
            emitter_norm_code: t.metadata?.emitter_norm_code || null,
            emitter_norm_title: t.metadata?.emitter_norm_title || null,
            emitter_structure_id: t.metadata?.emitter_structure_id || null
          }))
        );
      }

      if (taxpayerRes.data) setTaxpayerTypes(taxpayerRes.data);
    } finally {
      setLoading(false);
      isFetchingDataRef.current = false;
    }

    // 2. Carga secundaria en segundo plano (no bloquea el texto normativo ni falla por timeouts)
    Promise.allSettled([
      fetchAllPages('structure_tax_concepts', '*, tax_concepts(*)', undefined, 1000),
      fetchAllPages(
        'structure_relations',
        '*, source:normative_structures!source_structure_id(*, norm_versions(*, norms(*))), target:normative_structures!target_structure_id(*, norm_versions(*, norms(*))), discovery:norm_discovery!target_discovery_id(*)',
        undefined,
        250
      ),
      supabase.from('structure_forms').select('*, forms(*)'),
      supabase.from('structure_annexes').select('*, annexes(*)'),
      supabase.from('norm_discovery').select('*').order('created_at', { ascending: false }),
      supabase.from('normative_discrepancies').select('*').order('created_at', { ascending: false })
    ]).then(([conceptLinksRes, relationsRes, formLinksRes, annexLinksRes, discoveriesRes, discrepanciesRes]) => {
      if (conceptLinksRes.status === 'fulfilled' && conceptLinksRes.value.data) {
        setConceptLinks(conceptLinksRes.value.data);
      }

      if (relationsRes.status === 'fulfilled' && relationsRes.value.data) {
        setRelations(
          relationsRes.value.data.map((r: any) => ({
            ...r,
            notes: r.description || r.notes || '',
            source: r.source ? mapStructureRow(r.source) : null,
            target: r.target ? mapStructureRow(r.target) : null
          }))
        );
      }

      if (formLinksRes.status === 'fulfilled' && formLinksRes.value.data) {
        setFormLinks(
          formLinksRes.value.data.map((fl: any) => ({
            ...fl,
            id: fl.id || `${fl.structure_id}-${fl.form_id}`,
            tax_form_box_reference: fl.casillero_code
              ? `Casillero ${fl.casillero_code}`
              : fl.notes || 'General'
          }))
        );
      }

      if (annexLinksRes.status === 'fulfilled' && annexLinksRes.value.data) {
        setAnnexLinks(
          annexLinksRes.value.data.map((al: any) => ({
            ...al,
            id: al.id || `${al.structure_id}-${al.annex_id}`,
            compliance_note: al.notes || 'Reporte obligatorio'
          }))
        );
      }

      if (discoveriesRes.status === 'fulfilled' && discoveriesRes.value.data) {
        setDiscoveries(discoveriesRes.value.data);
      }

      if (discrepanciesRes.status === 'fulfilled' && (discrepanciesRes.value as any)?.data) {
        setDiscrepancies((discrepanciesRes.value as any).data);
      }
    });
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data && !error) {
        setUserProfile(data);
        if (data.whatsapp_phone) {
          setWaPhone(data.whatsapp_phone);
        }
      }

      // 1. Si es administrador, acceso total
      const { data: isAdminData } = await supabase.rpc('is_current_user_admin');
      if (isAdminData) {
        setIsAdmin(true);
        setCurrentPlan('professional');
        return;
      }

      // 2. Consultar suscripción activa en Supabase
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData && subData.plans) {
        const code = (subData.plans as any).code;
        if (code === 'professional' || code === 'plus_yearly') {
          setCurrentPlan('professional');
        } else if (code === 'premium' || code === 'pro_yearly') {
          setCurrentPlan('premium');
        } else {
          setCurrentPlan('free');
        }
      } else {
        // Fallback a metadatos de sesión
        const { data: sessionData } = await supabase.auth.getSession();
        const metaPlan = sessionData?.session?.user?.app_metadata?.plan || sessionData?.session?.user?.user_metadata?.plan_code;
        if (metaPlan === 'professional') {
          setCurrentPlan('professional');
        } else if (metaPlan === 'premium' || sessionData?.session?.user?.user_metadata?.is_pro) {
          setCurrentPlan('premium');
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    fetchAllData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Comprobar si el usuario actual tiene rol administrador en Supabase
  useEffect(() => {
    if (!currentUser?.id) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc('is_current_user_admin')
      .then(({ data, error }) => {
        const admin = !error && Boolean(data);
        setIsAdmin(admin);
        if (admin) {
          setCurrentPlan('professional');
        }
      });
  }, [currentUser?.id]);

  // Guardar manualmente la vigencia de una estructura (solo administrador)
  const handleSaveValidity = async (
    structureId: string,
    validFrom: string,
    validUntil: string
  ): Promise<boolean> => {
    if (!validFrom) {
      alert('La fecha «Vigencia desde» es obligatoria.');
      return false;
    }
    if (validUntil && validUntil < validFrom) {
      alert('La fecha «Vigencia hasta» no puede ser anterior a «Vigencia desde».');
      return false;
    }
    const { data, error } = await supabase.rpc('admin_update_structure_validity', {
      p_structure_id: structureId,
      p_valid_from: validFrom,
      p_valid_until: validUntil || null,
      p_clear_valid_until: !validUntil,
      p_validity_note: 'Ajuste manual del administrador'
    });
    if (error || (data && data.ok === false)) {
      alert(`No se pudo guardar la vigencia: ${error?.message || data?.error}`);
      return false;
    }
    setCheckoutToast('✓ Vigencia actualizada correctamente.');
    setTimeout(() => setCheckoutToast(null), 4000);
    await fetchAllData();
    return true;
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);
    setCurrentView('portal');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserProfile(null);
    setCurrentView('landing');
  };

  const defaultLrtiNormId = useMemo(() => {
    const lrti = norms.find(n => n.code === 'LRTI');
    return lrti ? lrti.id : null;
  }, [norms]);

  type LibraryNormScope = 'principales' | 'suplementarias';
  type LibraryNormCategory =
    | 'convenios'
    | 'codigos'
    | 'leyes'
    | 'reglamentos'
    | 'decretos'
    | 'resoluciones'
    | 'circulares'
    | 'otras_normas';

  const LIBRARY_CATEGORIES: { key: LibraryNormCategory; label: string; shortBadge: string }[] = [
    { key: 'convenios', label: 'Convenios Internacionales', shortBadge: 'Convenio' },
    { key: 'codigos', label: 'Códigos', shortBadge: 'Código' },
    { key: 'leyes', label: 'Leyes', shortBadge: 'Ley' },
    { key: 'reglamentos', label: 'Reglamentos', shortBadge: 'Reglamento' },
    { key: 'decretos', label: 'Decretos', shortBadge: 'Decreto' },
    { key: 'resoluciones', label: 'Resoluciones', shortBadge: 'Resolución' },
    { key: 'circulares', label: 'Circulares', shortBadge: 'Circular' },
    { key: 'otras_normas', label: 'Otras Normas', shortBadge: 'Otra Norma' }
  ];

  const classifyLibraryNormDetailed = (
    n: Norm
  ): { scope: LibraryNormScope; category: LibraryNormCategory; badge: string } => {
    const code = (n.code || '').toUpperCase().trim();
    const title = (n.title || '').toUpperCase();
    const nt = (n.norm_type || '').toLowerCase();

    // 1. Convenios Internacionales (CDI, Decisión 578 CAN, tratados)
    if (
      /^(?:CDI|CONV-|TRATADO|DECISION-578|DEC-578)/.test(code) ||
      title.includes('CONVENIO') ||
      title.includes('TRATADO INTERNACIONAL') ||
      title.includes('DOBLE IMPOSICI') ||
      title.includes('DECISIÓN 578') ||
      title.includes('DECISION 578')
    ) {
      const isTaxPrincipal =
        title.includes('DOBLE IMPOSICI') ||
        title.includes('TRIBUTAR') ||
        title.includes('RENTA') ||
        title.includes('578') ||
        code.startsWith('CDI');
      return {
        scope: isTaxPrincipal ? 'principales' : 'suplementarias',
        category: 'convenios',
        badge: 'Convenio Internacional'
      };
    }

    // 2. Códigos
    if (code === 'CT' || title.includes('CÓDIGO TRIBUTARIO') || title.includes('CODIGO TRIBUTARIO')) {
      return { scope: 'principales', category: 'codigos', badge: 'Código' };
    }
    if (code.startsWith('COD') || title.startsWith('CÓDIGO ') || title.startsWith('CODIGO ')) {
      return { scope: 'suplementarias', category: 'codigos', badge: 'Código' };
    }

    // 3. Circulares
    if (nt === 'circular' || /^(?:CIRC|NAC-DGECC)/.test(code) || title.startsWith('CIRCULAR')) {
      const isSriCircular = code.includes('DGECC') || code.includes('NAC-') || title.includes('SERVICIO DE RENTAS INTERNAS') || title.includes('SRI');
      return {
        scope: isSriCircular ? 'principales' : 'suplementarias',
        category: 'circulares',
        badge: 'Circular'
      };
    }

    // 4. Otras Normas (Acuerdos Ministeriales, Ordenanzas Municipales, Instructivos, etc.)
    if (
      nt === 'ordinance' ||
      nt === 'agreement' ||
      /^(?:ORD-|ORDENANZA|ACUERDO-|AM-|MIPRO-)/.test(code) ||
      title.startsWith('ORDENANZA') ||
      title.startsWith('ACUERDO MINISTERIAL') ||
      title.startsWith('ACUERDO ')
    ) {
      const badge =
        nt === 'ordinance' || code.startsWith('ORD') || title.startsWith('ORDENANZA')
          ? 'Ordenanza'
          : 'Acuerdo Ministerial';
      const isTaxDirect = title.includes('SERVICIO DE RENTAS INTERNAS') || title.includes('RÉGIMEN TRIBUTARIO INTERNO');
      return {
        scope: isTaxDirect ? 'principales' : 'suplementarias',
        category: 'otras_normas',
        badge
      };
    }

    // 5. Reglamentos y Decretos Ejecutivos (antes de Resoluciones para evitar confusión por textos tipo "Dispónese...")
    const isTaxRegOrDecree =
      code === 'RALRTI' ||
      code === 'RLRTI' ||
      code === 'RALRUC' ||
      title.includes('TRIBUTARI') ||
      title.includes('IMPUESTO') ||
      title.includes('IVA') ||
      title.includes('TARIFA CERO') ||
      title.includes('REGISTRO ÚNICO DE CONTRIBUYENTES') ||
      title.includes('REGISTRO UNICO DE CONTRIBUYENTES') ||
      title.includes('SALIDA DE DIVISAS') ||
      title.includes('CONSUMOS ESPECIALES') ||
      title.includes('DECRETO EJECUTIVO 1232');

    if (
      nt === 'regulation' ||
      ((code === 'RALRTI' || code === 'RLRTI' || code === 'RALRUC') && nt !== 'decree')
    ) {
      return {
        scope: isTaxRegOrDecree ? 'principales' : 'suplementarias',
        category: 'reglamentos',
        badge: 'Reglamento'
      };
    }

    if (
      nt === 'decree' ||
      (!code.startsWith('DECRETO-LEY') && /^(?:DE-|DECRETO-EJECUTIVO)/.test(code))
    ) {
      return {
        scope: isTaxRegOrDecree ? 'principales' : 'suplementarias',
        category: 'decretos',
        badge: 'Decreto Ejecutivo'
      };
    }

    if (
      code.startsWith('REGLAMENTO') ||
      title.includes('REGLAMENTO PARA LA APLICACIÓN') ||
      title.includes('REGLAMENTO PARA LA APLICACION')
    ) {
      return {
        scope: isTaxRegOrDecree ? 'principales' : 'suplementarias',
        category: 'reglamentos',
        badge: 'Reglamento'
      };
    }

    // 6. Resoluciones
    if (
      nt === 'resolution' ||
      nt === 'sri_resolution' ||
      /^(?:NAC-|RES-|RSU-|RESOLUCION|9170104DGER)/.test(code) ||
      title.startsWith('RESOLUCIÓN') ||
      title.startsWith('RESOLUCION') ||
      title.startsWith('DISPÓNESE') ||
      title.startsWith('MODIFÍCANSE') ||
      title.startsWith('MODIFICANSE')
    ) {
      const isSriResolution =
        code.startsWith('NAC-') ||
        code.includes('DGER') ||
        title.includes('IMPUESTO A LA RENTA') ||
        title.includes('RÉGIMEN TRIBUTARIO INTERNO') ||
        title.includes('SERVICIO DE RENTAS INTERNAS');
      return {
        scope: isSriResolution ? 'principales' : 'suplementarias',
        category: 'resoluciones',
        badge: 'Resolución'
      };
    }

    // 7. Leyes
    if (['LRTI', 'LEY-2007-242'].includes(code)) {
      return { scope: 'principales', category: 'leyes', badge: 'Ley Orgánica' };
    }

    return {
      scope: 'suplementarias',
      category: 'leyes',
      badge:
        nt === 'organic_law'
          ? 'Ley Orgánica'
          : code.startsWith('DECRETO-LEY')
            ? 'Decreto-Ley'
            : 'Ley'
    };
  };

  const articlesByNormId = useMemo(() => {
    const map = new Map<string, number>();
    const seenByNorm = new Map<string, Set<string>>();
    for (const s of structures) {
      if (s.structure_type === 'title' || s.structure_type === 'chapter' || isSubElementType(s.structure_type)) continue;
      if (!s.norm_id) continue;
      let set = seenByNorm.get(s.norm_id);
      if (!set) {
        set = new Set<string>();
        seenByNorm.set(s.norm_id, set);
      }
      set.add(s.label);
    }
    seenByNorm.forEach((set, normId) => {
      map.set(normId, set.size);
    });
    return map;
  }, [structures]);

  // Mapa rápido de sub-elementos jerárquicos (literales, numerales, párrafos) agrupados por parent_id del artículo
  const subElementsByParentId = useMemo(() => {
    const map = new Map<string, NormStructure[]>();
    for (const s of structures) {
      if (!isSubElementType(s.structure_type) || !s.parent_id) continue;
      let arr = map.get(s.parent_id);
      if (!arr) {
        arr = [];
        map.set(s.parent_id, arr);
      }
      arr.push(s);
    }
    map.forEach(arr => arr.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    return map;
  }, [structures]);

  const normalizeTextMatch = (txt?: string | null) =>
    String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();

  const findReformTargetNormAndArticle = (
    cite?: string | null,
    officialRegistry?: string | null,
    excludeNormId?: string | null,
    versionIds?: string[]
  ): { norm: Norm; articleLabel?: string } | null => {
    const normCandidates = norms.filter(n => !excludeNormId || n.id !== excludeNormId);
    if (!normCandidates.length) return null;

    if (versionIds && versionIds.length > 0) {
      for (const rel of relations) {
        const linked = versionIds.includes(rel.source_structure_id)
          ? rel.target
          : versionIds.includes(rel.target_structure_id)
            ? rel.source
            : null;
        const linkedNorm = linked?.norms;
        if (!linkedNorm || (excludeNormId && linkedNorm.id === excludeNormId)) continue;
        const nObj = normCandidates.find(n => n.id === linkedNorm.id);
        if (nObj) {
          const linkedRo = normalizeTextMatch(linked?.official_registry || linkedNorm.title || linkedNorm.name);
          const citeNorm = normalizeTextMatch(`${cite || ''} ${officialRegistry || ''}`);
          const roMatch = citeNorm.match(/(?:R\.?O\.?|REGISTRO OFICIAL)[^0-9]{0,30}(\d{2,4})\b/);
          if (!roMatch || linkedRo.includes(roMatch[1]) || citeNorm.includes(normalizeTextMatch(nObj.code))) {
            return { norm: nObj, articleLabel: linked?.label || undefined };
          }
        }
      }
    }

    const citeClean = normalizeTextMatch(cite);
    const roClean = normalizeTextMatch(officialRegistry);
    const combined = `${citeClean} ${roClean}`.trim();
    if (!combined) return null;

    const byCode = normCandidates.find(n => {
      const codeNorm = normalizeTextMatch(n.code);
      if (codeNorm.length < 4) return false;
      if (combined.includes(codeNorm)) return true;
      const decMatch = codeNorm.match(/^DE-(\d+)$/);
      if (decMatch && combined.includes('DECRETO EJECUTIVO') && combined.includes(decMatch[1])) return true;
      return false;
    });
    if (byCode) return { norm: byCode };

    const roNumMatch = combined.match(/(?:R\.?O\.?|REGISTRO OFICIAL)[^0-9]{0,35}(\d{2,4})\b/);
    const roNum = roNumMatch ? roNumMatch[1] : null;
    const isResCite = /\b(?:RESOLUCION|NAC-|DGER)\b/.test(citeClean);
    const isLawCite = /^(?:LEY|CODIGO|DECRETO-LEY)\b/.test(citeClean);
    const isDecreeCite = /^DECRETO EJECUTIVO\b/.test(citeClean);

    let bestScore = 0;
    let bestNorm: Norm | null = null;

    const citeTokens = new Set(
      citeClean
        .replace(/[^A-Z0-9 ]/g, ' ')
        .split(' ')
        .filter(
          w =>
            w.length >= 5 &&
            ![
              'LEY',
              'ORGANICA',
              'REFORMATORIA',
              'INTERNA',
              'INTERNO',
              'REGIMEN',
              'TRIBUTARIO',
              'ECUADOR',
              'REGISTRO',
              'OFICIAL',
              'SUPLEMENTO',
              'SEGUNDO',
              'TERCER',
              'DICIEMBRE',
              'NOVIEMBRE',
              'SEPTIEMBRE',
              'OCTUBRE'
            ].includes(w)
        )
    );

    for (const n of normCandidates) {
      const nTitle = normalizeTextMatch(n.title);
      const nCode = normalizeTextMatch(n.code);
      const cat = classifyLibraryNormDetailed(n).category;
      const isResGroup = cat === 'resoluciones' || cat === 'circulares' || cat === 'otras_normas';

      if (isLawCite && !isResCite && !isDecreeCite && isResGroup) continue;
      if (isResCite && !isResGroup) continue;

      let score = 0;
      if (
        roNum &&
        (nTitle.includes(` ${roNum} `) ||
          nTitle.includes(`NO. ${roNum}`) ||
          nTitle.includes(`NO ${roNum}`) ||
          nCode.endsWith(`-${roNum}`))
      ) {
        score += 5;
      }

      for (const tok of citeTokens) {
        if (nTitle.includes(tok)) score += 3;
      }

      const citeHead = citeClean.split('(')[0].trim();
      if (citeHead.length > 15 && nTitle.includes(citeHead)) {
        score += 10;
      }

      if (cat === 'otras_normas' || n.code === 'LEY-2007-242') score += 1;

      if (score >= 5 && score > bestScore) {
        bestScore = score;
        bestNorm = n;
      }
    }

    return bestNorm ? { norm: bestNorm } : null;
  };

  const handleOpenFullNorm = (targetNorm: Norm, targetArticleLabel?: string) => {
    if (!targetNorm) return;
    setSelectedNormId(targetNorm.id);
    setSelectedConceptId(null);
    setSelectedTaxFilter('ALL');
    setStatusFilter('all');
    setSearchQuery('');
    setSearchValidFrom('');
    setSearchValidTo('');
    setEbookNavMode('index');
    setIsHistoryModalOpen(false);
    setIsCurrentColExpanded(false);
    setOpenSummaryId(null);
    setReaderSubView('document');

    const normArticles = structures
      .filter(
        s =>
          s.norm_id === targetNorm.id &&
          s.structure_type !== 'title' &&
          s.structure_type !== 'chapter' &&
          !isSubElementType(s.structure_type)
      )
      .sort(sortLegalStructures);

    let chosenLabel = normArticles[0]?.label || 'Art. 1';
    if (targetArticleLabel) {
      const normalizedTarget = targetArticleLabel.trim().toUpperCase();
      const exact = normArticles.find(
        s =>
          s.label.trim().toUpperCase() === normalizedTarget ||
          (s.identifier || '').trim().toUpperCase() === normalizedTarget
      );
      if (exact) {
        chosenLabel = exact.label;
      } else {
        const cleanNum = normalizedTarget.replace(/^(?:ART(?:[ÍI]CULO|\.)?\s*)+/i, '').trim();
        const byNum = normArticles.find(s => (s.identifier || '').trim().toUpperCase() === cleanNum);
        if (byNum) chosenLabel = byNum.label;
      }
    }

    setSelectedArticleLabel(chosenLabel);
    setOpenArticleSheets({});
  };

  const effectiveNormId =
    selectedNormId ||
    (!searchQuery.trim() && !searchValidFrom && !searchValidTo && !selectedConceptId && selectedTaxFilter !== 'ISD'
      ? defaultLrtiNormId
      : null);

  const handleChangeNormCategory = async (normId: string, targetType: 'regulation' | 'decree') => {
    if (updatingCategoryNormId === normId) return;
    setUpdatingCategoryNormId(normId);
    try {
      const { data, error } = await supabase.rpc('admin_set_norm_category', {
        p_norm_id: normId,
        p_target_category: targetType
      });
      if (error || data?.ok === false) {
        window.alert(error?.message || data?.error || 'No se pudo cambiar la categoría.');
        return;
      }
      const targetFolder = targetType === 'regulation' ? '03_reglamentos' : '08_decretos_ejecutivos';
      setNorms(prev =>
        prev.map(normItem =>
          normItem.id === normId
            ? {
                ...normItem,
                norm_type: targetType,
                is_secondary: true,
                drive_folder_path: targetFolder,
                storage_object_path: `${targetFolder}/${normItem.code}.pdf`
              }
            : normItem
        )
      );
      setStructures(prev =>
        prev.map(s =>
          s.norms?.id === normId
            ? {
                ...s,
                norms: {
                  ...s.norms,
                  norm_type: targetType,
                  is_secondary: true,
                  drive_folder_path: targetFolder,
                  storage_object_path: `${targetFolder}/${s.norms.code}.pdf`
                }
              }
            : s
        )
      );
      if (libraryRightView === 'ficha' && effectiveNormId === normId) {
        setSelectedLibraryCategory(targetType === 'regulation' ? 'reglamentos' : 'decretos');
      }
    } finally {
      setUpdatingCategoryNormId(null);
    }
  };

  // Group structures by (norm_id + label) so we show current version in center list
  // or the version in force during [searchValidFrom, searchValidTo] when Option B is active
  const currentArticles = useMemo(() => {
    const hasDateFilter = Boolean(searchValidFrom || searchValidTo);
    const queryFrom = searchValidFrom || '0001-01-01';
    const queryTo = searchValidTo || '9999-12-31';

    const candidateArticles = structures.filter(s => {
      if (s.structure_type === 'title' || s.structure_type === 'chapter' || isSubElementType(s.structure_type)) return false;
      if (!hasDateFilter) {
        return s.is_current;
      }
      // Un texto corregido por Fe de Erratas nunca debió estar vigente: no se devuelve en consultas por fecha
      if (s.is_fe_erratas_replaced) return false;
      const artFrom = s.valid_from || '0001-01-01';
      const artTo = s.valid_to || '9999-12-31';
      return artFrom <= queryTo && artTo >= queryFrom;
    });

    const filtered = candidateArticles.filter(art => {
      if (effectiveNormId && art.norm_id !== effectiveNormId) return false;
      if (statusFilter !== 'all' && art.legal_status !== statusFilter) return false;
      if (selectedConceptId) {
        const hasConcept = conceptLinks.some(
          cl => cl.structure_id === art.id && cl.tax_concept_id === selectedConceptId
        );
        if (!hasConcept) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = art.label.toLowerCase().includes(q);
        const matchTitle = (art.title || '').toLowerCase().includes(q);
        const matchContent = (art.content || '').toLowerCase().includes(q);
        const matchCite = (art.reform_source_cite || '').toLowerCase().includes(q);
        const matchRo = (art.official_registry || '').toLowerCase().includes(q);
        if (!matchLabel && !matchTitle && !matchContent && !matchCite && !matchRo) return false;
      }
      return true;
    });

    // Deduplicar por (norm_id + label) priorizando la versión más reciente dentro del rango consultado
    const byKey = new Map<string, NormStructure>();
    for (const art of filtered) {
      const key = `${art.norm_id}::${art.label}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, art);
      } else {
        const exDate = existing.valid_from || '';
        const newDate = art.valid_from || '';
        const exRo = existing.ro_published_on || '';
        const newRo = art.ro_published_on || '';
        if (
          newDate > exDate ||
          (newDate === exDate && newRo > exRo) ||
          (newDate === exDate && newRo === exRo && art.version_number > existing.version_number)
        ) {
          byKey.set(key, art);
        }
      }
    }

    return Array.from(byKey.values()).sort(sortLegalStructures);
  }, [structures, effectiveNormId, statusFilter, selectedConceptId, searchQuery, searchValidFrom, searchValidTo, conceptLinks]);

  // E-Book hierarchy grouping from currentArticles (Marcadores del PDF)
  const ebookTree = useMemo(() => {
    const titlesMap: Record<
      string,
      {
        titleText: string;
        chapters: Record<
          string,
          {
            chapterText: string;
            articles: NormStructure[];
          }
        >;
        orphanArticles: NormStructure[];
      }
    > = {};

    currentArticles.forEach(art => {
      let titleKey = art.parent_title?.trim() || '';
      if (!titleKey) {
        if (art.structure_type === 'transitory') titleKey = 'DISPOSICIONES TRANSITORIAS';
        else if (art.structure_type === 'final') titleKey = 'DISPOSICIONES FINALES';
        else if (art.structure_type === 'reform') titleKey = 'DISPOSICIONES REFORMATORIAS';
        else if (art.structure_type === 'other') titleKey = 'DISPOSICIONES GENERALES';
        else titleKey = art.norms?.title || 'CUERPO NORMATIVO PRINCIPAL';
      }

      if (!titlesMap[titleKey]) {
        titlesMap[titleKey] = {
          titleText: titleKey,
          chapters: {},
          orphanArticles: []
        };
      }

      const chapterKey = art.parent_chapter?.trim() || '';
      if (chapterKey) {
        if (!titlesMap[titleKey].chapters[chapterKey]) {
          titlesMap[titleKey].chapters[chapterKey] = {
            chapterText: chapterKey,
            articles: []
          };
        }
        titlesMap[titleKey].chapters[chapterKey].articles.push(art);
      } else {
        titlesMap[titleKey].orphanArticles.push(art);
      }
    });

    return Object.values(titlesMap);
  }, [currentArticles]);

  // Extrae el código exacto de un artículo soportando prefijos con guion (IA-1, IA-2), decimales (97.6) y sufijos (4A)
  const extractArticleCode = (label?: string | null, identifier?: string | null): string | null => {
    const cleanId = (identifier || '').trim();
    if (cleanId) return cleanId.toUpperCase();
    const raw = (label || '').trim();
    const m = raw.match(/^Art(?:[íi]culo|\.)?\s+([A-Za-z]+-\d+(?:\.\d+)?[A-Za-z]*|\d+(?:\.\d+)?[A-Za-z]*)\b/i);
    return m ? m[1].toUpperCase() : null;
  };

  // Currently selected article & all its historical versions (coincidencia estricta por norma + identificador exacto, sin mezclar Art. 2 con Art. IA-2)
  const selectedVersions = useMemo(() => {
    const target = (selectedArticleLabel || 'Art. 1').trim();
    const currentMatch = currentArticles.find(a => a.label === target);
    const targetNormId = selectedNormId || currentMatch?.norm_id || defaultLrtiNormId;
    const targetCode = extractArticleCode(target, currentMatch?.identifier);

    const matched = structures.filter(s => {
      if (s.structure_type === 'title' || s.structure_type === 'chapter' || isSubElementType(s.structure_type)) return false;
      if (targetNormId && s.norm_id !== targetNormId) return false;

      if (targetCode && /^Art/i.test(target)) {
        const sCode = extractArticleCode(s.label, s.identifier);
        return sCode === targetCode && /^Art/i.test(s.label || '');
      }

      const cleanTarget = target.replace(/[:.-]+$/, '').trim().toLowerCase();
      const cleanArtLabel = (s.label || '').replace(/[:.-]+$/, '').trim().toLowerCase();
      return cleanArtLabel === cleanTarget;
    });

    return matched.sort((a, b) => {
      const da = a.valid_from || '';
      const db = b.valid_from || '';
      if (da !== db) return db.localeCompare(da);
      const roA = a.ro_published_on || '';
      const roB = b.ro_published_on || '';
      if (roA !== roB) return roB.localeCompare(roA);
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return b.version_number - a.version_number;
    });
  }, [structures, selectedArticleLabel, selectedNormId, currentArticles, defaultLrtiNormId]);

  const activeCurrentArticle = useMemo(() => {
    if (searchValidFrom || searchValidTo) {
      const qFrom = searchValidFrom || '0001-01-01';
      const qTo = searchValidTo || '9999-12-31';
      const inRange = selectedVersions.find(v => {
        if (v.is_fe_erratas_replaced) return false;
        const vf = v.valid_from || '0001-01-01';
        const vt = v.valid_to || '9999-12-31';
        return vf <= qTo && vt >= qFrom;
      });
      if (inRange) return inRange;
    }
    return selectedVersions.find(v => v.is_current) || selectedVersions[0] || currentArticles[0];
  }, [selectedVersions, currentArticles, searchValidFrom, searchValidTo]);

  // Sub-elementos jerárquicos disponibles para el artículo activo (ej. Literal a), b), c), d) o Numeral 1, 2...)
  const activeArticleSubElements = useMemo(() => {
    if (!activeCurrentArticle) return [];
    const seen = new Map<string, NormStructure>();
    const currentChildren = subElementsByParentId.get(activeCurrentArticle.id) || [];
    for (const c of currentChildren) {
      if (c.sub_kind === 'intro') continue;
      if ((c.content || '').trim().length <= 3) continue;
      if (c.identifier && !seen.has(c.identifier)) seen.set(c.identifier, c);
    }
    // Incluir también sub-elementos históricos que pudieran existir en versiones anteriores del mismo artículo
    for (const ver of selectedVersions) {
      const children = subElementsByParentId.get(ver.id) || [];
      for (const c of children) {
        if (c.sub_kind === 'intro') continue;
        if ((c.content || '').trim().length <= 3) continue;
        if (c.identifier && !seen.has(c.identifier)) seen.set(c.identifier, c);
      }
    }
    return Array.from(seen.values()).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [activeCurrentArticle, selectedVersions, subElementsByParentId]);

  // Tables attached to the currently selected article (or any of its historical versions or sub-elements)
  const articleTables = useMemo(() => {
    if (!activeCurrentArticle) return [];
    const versionIds = selectedVersions.map(v => v.id);
    const subElementIds = new Set<string>();
    for (const vid of versionIds) {
      const children = subElementsByParentId.get(vid) || [];
      for (const c of children) {
        if (!selectedHistorySubId || c.identifier === selectedHistorySubId) {
          subElementIds.add(c.id);
        }
      }
    }
    const isLrtiArt36 =
      activeCurrentArticle.label?.trim().toUpperCase() === 'ART. 36' &&
      (!activeCurrentArticle.norms?.code || activeCurrentArticle.norms.code.toUpperCase() === 'LRTI');

    const matchedTables = tables.filter(t => {
      if (selectedHistorySubId) {
        if (t.sub_identifier === selectedHistorySubId) return true;
        if (t.structure_id && subElementIds.has(t.structure_id)) return true;
        return false;
      }
      if (
        t.structure_id === activeCurrentArticle.id ||
        t.emitter_structure_id === activeCurrentArticle.id ||
        (t.structure_id && (versionIds.includes(t.structure_id) || subElementIds.has(t.structure_id))) ||
        (t.article_structure_id && versionIds.includes(t.article_structure_id)) ||
        (t.emitter_structure_id && versionIds.includes(t.emitter_structure_id))
      ) {
        return true;
      }
      if (isLrtiArt36) {
        const code = (t.table_code || '').toUpperCase();
        if (
          code.startsWith('TBL_IR_PN_') ||
          code.startsWith('TBL_IR_HERENCIAS_') ||
          code.startsWith('TBL_IR_HLD_')
        ) {
          return true;
        }
      }
      return false;
    });

    const byCode = new Map<string, NormativeTable>();
    for (const tbl of matchedTables) {
      const key = `${tbl.table_code}::${tbl.fiscal_year}`;
      if (!byCode.has(key)) {
        byCode.set(key, tbl);
      }
    }

    return Array.from(byCode.values()).sort((a, b) => {
      if (b.fiscal_year !== a.fiscal_year) return b.fiscal_year - a.fiscal_year;
      return a.table_code.localeCompare(b.table_code);
    });
  }, [tables, activeCurrentArticle, selectedVersions, subElementsByParentId, selectedHistorySubId]);

  // Helper para conocer cuántas versiones históricas reales tiene cualquier artículo en la Pantalla 2
  const getArticleVersionsCount = (art: NormStructure): number => {
    const target = (art.label || '').trim();
    const targetCode = extractArticleCode(target, art.identifier);
    const rawMatches = structures.filter(s => {
      if (s.structure_type === 'title' || s.structure_type === 'chapter' || isSubElementType(s.structure_type)) return false;
      if (art.norm_id && s.norm_id !== art.norm_id) return false;
      if (targetCode && /^Art/i.test(target)) {
        const sCode = extractArticleCode(s.label, s.identifier);
        return sCode === targetCode && /^Art/i.test(s.label || '');
      }
      return (s.label || '').trim().toLowerCase() === target.toLowerCase();
    });
    const seen = new Set<string>();
    for (const v of rawMatches) {
      const vfKey = v.valid_from || `no-date-${v.version_number}`;
      const roKey = v.ro_published_on || 'no-ro';
      const errataFlag = v.is_fe_erratas_replaced ? 'errata-replaced' : v.is_fe_erratas ? 'errata' : 'standard';
      seen.add(`${vfKey}__${roKey}__${errataFlag}`);
    }
    return Math.max(1, seen.size);
  };

  // Hierarchical cascade (Reglamento, Circulares, Resoluciones, Norm Discovery)
  const articleCascade = useMemo(() => {
    if (!activeCurrentArticle) return [];
    const versionIds = selectedVersions.map(v => v.id);
    return relations.filter(
      r => versionIds.includes(r.source_structure_id) || versionIds.includes(r.target_structure_id)
    );
  }, [relations, activeCurrentArticle, selectedVersions]);

  // Cascada normativa secundaria activa (Reglamento RALRTI + Resoluciones SRI hijas)
  const activeSecondaryCascade = useMemo(() => {
    const versionIds = selectedVersions.map(v => v.id);
    return getSecondaryCascadeForArticle(activeCurrentArticle, relations, versionIds);
  }, [activeCurrentArticle, relations, selectedVersions]);

  // Trazabilidad histórica completa (Artículo íntegro o sub-elemento seleccionado: literal / numeral / párrafo)
  const articleHistoricalVersions = useMemo(() => {
    if (!selectedHistorySubId || !activeCurrentArticle) {
      return getHistoricalVersionsForArticle(activeCurrentArticle, selectedVersions);
    }

    const subMatches: NormStructure[] = [];
    for (const ver of selectedVersions) {
      const children = subElementsByParentId.get(ver.id) || [];
      const found = children.find(c => c.identifier === selectedHistorySubId);
      if (found) {
        subMatches.push({
          ...found,
          reform_source_cite: found.reform_source_cite || ver.reform_source_cite,
          official_registry: found.official_registry || ver.official_registry,
          summary_change: found.summary_change || ver.summary_change,
          ro_published_on: found.ro_published_on || ver.ro_published_on,
          tax_periodicity: found.tax_periodicity || ver.tax_periodicity,
          table_diff_mode: found.table_diff_mode || ver.table_diff_mode
        });
      }
    }

    if (subMatches.length === 0) {
      return getHistoricalVersionsForArticle(activeCurrentArticle, selectedVersions);
    }

    const allSubVersions = getHistoricalVersionsForArticle(subMatches[0], subMatches);
    // Mostrar solo las versiones donde ese sub-elemento cambió (conservando siempre la vigente [0] y la original [última])
    const filteredSubVersions = allSubVersions.filter((ver, idx, arr) => {
      if (idx === 0 || idx === arr.length - 1) return true;
      if (ver.changed_in_this_version !== false) return true;
      const prev = arr[idx + 1];
      return Boolean(prev && prev.content.trim() !== ver.content.trim());
    });

    return filteredSubVersions.map((ver, idx) => ({
      ...ver,
      version_number: filteredSubVersions.length - idx
    }));
  }, [activeCurrentArticle, selectedVersions, selectedHistorySubId, subElementsByParentId]);

  // Conteo de artículos por cada impuesto troncal
  const taxCounts = useMemo(() => {
    const counts: Record<TaxScopeCode, number> = {
      ALL: currentArticles.length,
      RENTA: 0,
      IVA: 0,
      ICE: 0,
      ISD: 0,
      RISE: 0,
      GENERAL: 0
    };
    currentArticles.forEach(art => {
      const scope = getArticleTaxScope(art).code;
      counts[scope] = (counts[scope] || 0) + 1;
    });
    return counts;
  }, [currentArticles]);

  // Artículos filtrados según el impuesto activo (Pestaña Navegación por Impuestos)
  const taxFilteredArticles = useMemo(() => {
    if (selectedTaxFilter === 'ALL') return currentArticles;
    return currentArticles.filter(art => getArticleTaxScope(art).code === selectedTaxFilter);
  }, [currentArticles, selectedTaxFilter]);

  // Connected Forms & Annexes (Horizontal Axis)
  const articleForms = useMemo(() => {
    if (!activeCurrentArticle) return [];
    return formLinks.filter(fl => fl.structure_id === activeCurrentArticle.id);
  }, [formLinks, activeCurrentArticle]);

  const articleAnnexes = useMemo(() => {
    if (!activeCurrentArticle) return [];
    return annexLinks.filter(al => al.structure_id === activeCurrentArticle.id);
  }, [annexLinks, activeCurrentArticle]);

  // Pending Human Review Articles (Orden natural legal estricto)
  const pendingReviewArticles = useMemo(() => {
    return structures
      .filter(
        s =>
          s.review_status === 'pending_review' &&
          s.structure_type !== 'title' &&
          s.structure_type !== 'chapter' &&
          !isSubElementType(s.structure_type)
      )
      .sort(sortLegalStructures);
  }, [structures]);

  // ============================================================================
  // INTERACTIVE CALCULATOR LOGIC (USING LIVE SUPABASE NORMATIVE_TABLES)
  // ============================================================================
  const irTable = useMemo(
    () =>
      tables.find(t => t.table_code === 'TBL_IR_PN_2026' && t.is_active !== false) ||
      tables.find(t => t.category === 'progressive_rates' && t.is_active !== false) ||
      tables.find(t => t.table_code === 'TBL_IR_PN_2026') ||
      tables[0],
    [tables]
  );
  const rimpeTable = useMemo(
    () => tables.find(t => t.table_code === 'TBL_RIMPE_EMPRENDEDOR_2026'),
    [tables]
  );
  const dividendTable = useMemo(
    () => tables.find(t => t.table_code === 'TBL_DIVIDENDOS_2026'),
    [tables]
  );

  const irCalculation = useMemo(() => {
    const baseImponible = Math.max(0, calcIncome - calcDeductions);
    if (!irTable || !irTable.rows_data) {
      return {
        baseImponible,
        fraccionBasica: 0,
        impBasica: 0,
        tarifaExcedente: 0,
        impuestoCausado: 0,
        rebajaGastos: 0,
        impuestoPagar: 0
      };
    }
    const bracket =
      irTable.rows_data.find(
        r =>
          baseImponible >= Number(r.fraccion_basica) &&
          (r.exceso_hasta === null || baseImponible <= Number(r.exceso_hasta))
      ) || irTable.rows_data[irTable.rows_data.length - 1];

    const fb = Number(bracket?.fraccion_basica || 0);
    const impFb = Number(bracket?.impuesto_fraccion_basica || 0);
    const pct = Number(bracket?.porcentaje_excedente || 0);
    const excedente = Math.max(0, baseImponible - fb);
    const impuestoCausado = impFb + excedente * (pct / 100);

    // Rebaja de gastos personales (Art. 10 LRTI: 18% del menor entre gastos declarados y tope según cargas)
    const canastaBasica = 798.31;
    const numCanastas =
      calcFamilyLoads === 0
        ? 7
        : calcFamilyLoads === 1
          ? 9
          : calcFamilyLoads === 2
            ? 11
            : calcFamilyLoads === 3
              ? 14
              : calcFamilyLoads === 4
                ? 17
                : 20;
    const topeGastos = canastaBasica * numCanastas;
    const baseRebaja = Math.min(calcPersonalExpenses, topeGastos);
    const rebajaGastos = baseRebaja * 0.18;
    const impuestoPagar = Math.max(0, impuestoCausado - rebajaGastos);

    return {
      baseImponible,
      fraccionBasica: fb,
      impBasica: impFb,
      tarifaExcedente: pct,
      impuestoCausado,
      rebajaGastos,
      topeGastos,
      impuestoPagar
    };
  }, [calcIncome, calcDeductions, calcPersonalExpenses, calcFamilyLoads, irTable]);

  const rimpeCalculation = useMemo(() => {
    if (!rimpeTable || !rimpeTable.rows_data) {
      return { impuestoTotal: 0, marginalRate: 0, base: 0 };
    }
    const bracket =
      rimpeTable.rows_data.find(
        r =>
          calcRimpeIncome >= Number(r.limite_inferior) &&
          calcRimpeIncome <= Number(r.limite_superior)
      ) || rimpeTable.rows_data[rimpeTable.rows_data.length - 1];

    const inf = Number(bracket?.limite_inferior || 0);
    const impBas = Number(bracket?.impuesto_fraccion_basica || 0);
    const rate = Number(bracket?.tipo_marginal_pct || 0);
    const excedente = Math.max(0, calcRimpeIncome - inf);
    const impuestoTotal = impBas + excedente * (rate / 100);
    return { impuestoTotal, marginalRate: rate, impBas, inf };
  }, [calcRimpeIncome, rimpeTable]);

  const dividendCalculation = useMemo(() => {
    const dividendoGravado = calcDividendAmount * 0.4; // 40% base gravada según LRTI Art. 37
    if (!dividendTable || !dividendTable.rows_data) {
      return { dividendoGravado, retencion: 0, rate: 0 };
    }
    const bracket =
      dividendTable.rows_data.find(
        r =>
          dividendoGravado >= Number(r.desde) &&
          (r.hasta === null || dividendoGravado <= Number(r.hasta))
      ) || dividendTable.rows_data[dividendTable.rows_data.length - 1];

    const desde = Number(bracket?.desde || 0);
    const fbTax = Number(bracket?.impuesto_fraccion_basica || 0);
    const rate = Number(bracket?.tarifa_excedente_pct || 0);
    const retencion = fbTax + Math.max(0, dividendoGravado - desde) * (rate / 100);
    return { dividendoGravado, retencion, rate };
  }, [calcDividendAmount, dividendTable]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptCode.trim() || !newConceptName.trim()) return;
    const { error } = await supabase.from('tax_concepts').insert({
      code: newConceptCode.toUpperCase().replace(/\s+/g, '_'),
      name: newConceptName.trim(),
      description: newConceptDesc.trim() || 'Agregado dinámicamente desde SmartLex UI'
    });
    if (!error) {
      setNewConceptCode('');
      setNewConceptName('');
      setNewConceptDesc('');
      setShowAddConceptModal(false);
      fetchAllData();
    }
  };

  const handleOpenReportModal = (article: NormStructure) => {
    setReportingArticle(article);
    setReportType('errata');
    setReportComment('');
    setReportUserContact(currentUser?.email || userProfile?.whatsapp_phone || '');
    setIsReportModalOpen(true);
  };

  const handleSubmitDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingArticle || !reportComment.trim()) return;

    setIsSubmittingReport(true);
    try {
      const { data, error } = await supabase
        .from('normative_discrepancies')
        .insert({
          structure_id: reportingArticle.id,
          article_label: reportingArticle.label,
          article_title: reportingArticle.title || '',
          feedback_type: reportType,
          user_comment: reportComment.trim(),
          user_email: reportUserContact.trim() || null,
          status: 'pending'
        })
        .select()
        .single();

      if (!error && data) {
        setDiscrepancies(prev => [data, ...prev]);
        setIsReportModalOpen(false);
        setCheckoutToast(`✓ ¡Gracias! Tu reporte para ${reportingArticle.label} ha sido enviado al equipo de revisión.`);
        setTimeout(() => setCheckoutToast(null), 5000);
      } else {
        alert('Error al enviar el reporte. Por favor inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Error submitting discrepancy:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleResolveDiscrepancy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('normative_discrepancies')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        setDiscrepancies(prev =>
          prev.map(d => (d.id === id ? { ...d, status: 'resolved', resolved_at: new Date().toISOString() } : d))
        );
        setCheckoutToast('✓ Discrepancia marcada como resuelta.');
        setTimeout(() => setCheckoutToast(null), 4000);
      }
    } catch (err) {
      console.error('Error resolving discrepancy:', err);
    }
  };

  const handleApproveArticle = async (structureId: string) => {
    await supabase
      .from('normative_structures')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', structureId);
    await fetchAllData();
  };

  const handleAddConceptToArticle = async (structureId: string, conceptId: string) => {
    if (!structureId || !conceptId) return;
    try {
      const { error } = await supabase
        .from('structure_tax_concepts')
        .upsert(
          {
            structure_id: structureId,
            tax_concept_id: conceptId,
            relevance_role: 'primary',
            review_status: 'approved'
          },
          { onConflict: 'structure_id,tax_concept_id' }
        );
      if (error) {
        console.error('Error al asociar concepto:', error);
        alert(`Error al asociar término: ${error.message}`);
        return;
      }
      await fetchAllData();
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  const handleRemoveConceptFromArticle = async (structureId: string, conceptId: string) => {
    if (!structureId || !conceptId) return;
    await supabase
      .from('structure_tax_concepts')
      .delete()
      .eq('structure_id', structureId)
      .eq('tax_concept_id', conceptId);
    await fetchAllData();
  };

  const handleCreateAndAssignTaxConcept = async (
    structureId: string,
    code: string,
    name: string,
    conceptType: string
  ) => {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = name.trim();
    if (!cleanCode || !cleanName) {
      alert('Por favor introduce el código y el nombre del término.');
      return;
    }

    try {
      const { data: newConcept, error: cErr } = await supabase
        .from('tax_concepts')
        .upsert(
          {
            code: cleanCode,
            name: cleanName,
            concept_type: conceptType || 'general',
            is_active: true
          },
          { onConflict: 'code' }
        )
        .select()
        .single();

      if (cErr) {
        console.error('Error al guardar concepto:', cErr);
        alert(`Error al guardar término: ${cErr.message}`);
        return;
      }

      if (newConcept) {
        const { error: lErr } = await supabase
          .from('structure_tax_concepts')
          .upsert(
            {
              structure_id: structureId,
              tax_concept_id: newConcept.id,
              relevance_role: 'primary',
              review_status: 'approved'
            },
            { onConflict: 'structure_id,tax_concept_id' }
          );

        if (lErr) {
          console.error('Error al vincular concepto:', lErr);
          alert(`Error al vincular: ${lErr.message}`);
          return;
        }

        setNewConceptForArticle(null);
        await fetchAllData();
      }
    } catch (err: any) {
      console.error('Error inesperado:', err);
      alert(`Error inesperado: ${err.message}`);
    }
  };

  const handleGeneratePlacetoPaySession = async (planCode: PlanCode, amount: number) => {
    const ref = `SLEX-${planCode.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const checkoutUrl = `https://checkout.placetopay.ec/session/${ref}`;
    await supabase.from('payment_sessions').insert({
      plan_code: planCode,
      reference: ref,
      amount_usd: amount,
      currency: 'USD',
      status: 'PENDING',
      process_url: checkoutUrl,
      sent_via_whatsapp: true,
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
    });
    setCurrentPlan(planCode);
    setCheckoutToast(
      `Sesión PlacetoPay generada (${ref} por USD ${amount.toFixed(
        2
      )}) y enviada por WhatsApp a ${waPhone}`
    );
    setTimeout(() => setCheckoutToast(null), 6000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (currentPlan !== 'professional') return;
    if (chatUsed >= 100) return;

    const userQ = chatInput.trim();
    setChatInput('');
    setChatUsed(prev => prev + 1);
    setChatMessages(prev => [
      ...prev,
      { role: 'user', text: userQ },
      {
        role: 'assistant',
        text: `Según la matriz normativa de SmartLex Ecuador:\n• En el Eje Vertical (LRTI Art. 10 y Art. 36), la operación consultada se sujeta a bancarización obligatoria desde USD 500.00 (VIGENTE Y REFORMADO) y se concilia en el Eje Horizontal mediante el Formulario 101 / 102 y el Anexo Transaccional Simplificado (ATS).`
      }
    ]);
  };

  const handleCopyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleGoToLibraryHome = () => {
    setToolsMenuOpen(false);
    setPortalMobileMenuOpen(false);
    setCurrentView('portal');
    setActiveTab('reader');
    setReaderSubView('library');
    setLibraryRightView('cards');
  };

  const handleGoToPricingPage = () => {
    setToolsMenuOpen(false);
    setPortalMobileMenuOpen(false);
    setCurrentView('landing');
    setTimeout(() => {
      const el = document.getElementById('planes');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  };

  // ============================================================================
  // RENDER LANDING PAGE VIEW
  // ============================================================================
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenRegister={handleOpenRegister}
          onOpenLogin={handleOpenLogin}
          onEnterLibrary={handleGoToLibraryHome}
          isDark={themeMode === 'dark'}
          onToggleTheme={() => setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'))}
          onSelectPlan={plan => {
            if (plan === 'free') {
              handleOpenRegister();
            } else {
              handleGeneratePlacetoPaySession(plan, plan === 'premium' ? 4.99 : 9.99);
            }
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // ============================================================================
  // RENDER PORTAL / NORMATIVE READER VIEW
  // ============================================================================
  return (
    <div
      className={`${
        activeTab === 'reader' ? 'h-screen overflow-hidden' : 'min-h-screen'
      } flex flex-col bg-[var(--color-fondo)] text-[var(--color-texto)] selection:bg-[var(--color-seleccion-fondo)] selection:text-[var(--color-seleccion-texto)]`}
    >
      {/* CABECERA DEL PORTAL SMARTLEX */}
      <header className="bg-[var(--color-superficie)] border-b border-[var(--color-borde)] sticky top-0 z-40 shrink-0">
        <div className="h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-3">
          {/* Izquierda: Marca */}
          <button
            type="button"
            onClick={handleGoToLibraryHome}
            title="Ir al inicio de la Biblioteca Normativa"
            className="flex items-center gap-2.5 cursor-pointer text-left group shrink-0"
          >
            <div className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] group-hover:border-[var(--color-secundario)] transition-colors">
              <RubikCubeLogo size={26} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-texto)]">
                SmartLex<span className="text-[var(--color-secundario)]">EC</span>
              </span>
              <span className="hidden 2xl:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]">
                Portal Tributario
              </span>
            </div>
          </button>

          {/* Centro: 5 vistas principales de consulta */}
          <nav
            aria-label="Navegación principal del portal"
            className="hidden lg:flex items-center gap-1 bg-[var(--color-fondo)] p-1 rounded-xl border border-[var(--color-borde)]"
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('reader');
                setReaderSubView('library');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'reader' && readerSubView === 'library'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Biblioteca</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('reader');
                setReaderSubView('document');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'reader' && readerSubView === 'document'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Documento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'tables'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span>Tablas</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                  activeTab === 'tables'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)]'
                    : 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]'
                }`}
              >
                {tables.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calculators')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'calculators'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>Calculadoras</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Asistente IA</span>
            </button>
          </nav>

          {/* Derecha: Plan, Tema, Menú Herramientas y Usuario */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Subir de plan / Obtener Premium */}
            <button
              type="button"
              onClick={handleGoToPricingPage}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] hover:bg-[var(--color-secundario)] hover:text-[var(--color-texto-sobre-secundario)] hover:border-[var(--color-secundario)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>{currentPlan === 'free' ? 'Obtener Premium' : 'Subir de plan'}</span>
            </button>

            {/* Botón compacto de tema */}
            <button
              type="button"
              onClick={() => setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'))}
              title={themeMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
              aria-label={themeMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
              className="w-9 h-9 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] flex items-center justify-center transition-colors cursor-pointer"
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Menú desplegable de Herramientas / Administración */}
            <div ref={toolsMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setToolsMenuOpen(prev => !prev)}
                aria-expanded={toolsMenuOpen}
                aria-haspopup="menu"
                title="Herramientas y administración"
                className={`px-2.5 h-9 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  toolsMenuOpen || activeTab === 'reviewer'
                    ? 'border-[var(--color-secundario)] bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                    : 'border-[var(--color-borde)] bg-[var(--color-fondo)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />
                <span className="hidden xl:inline">Herramientas</span>
                {discrepancies.filter(d => d.status === 'pending').length > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)] border border-[var(--color-aviso-borde)] font-bold text-[10px] leading-none">
                    {discrepancies.filter(d => d.status === 'pending').length}
                  </span>
                ) : activeTab === 'reviewer' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secundario)]" />
                ) : null}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[var(--color-texto-secundario)] transition-transform ${
                    toolsMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {toolsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xl p-1.5 z-50 text-left space-y-1"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                    Administración y herramientas
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab('reviewer');
                      setToolsMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      activeTab === 'reviewer'
                        ? 'bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)]'
                        : 'text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Control de discrepancias</span>
                    </span>
                    {discrepancies.filter(d => d.status === 'pending').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)] border border-[var(--color-aviso-borde)] font-bold text-[10px] leading-none">
                        {discrepancies.filter(d => d.status === 'pending').length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUploadModalOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 shrink-0 text-[var(--color-secundario)]" />
                    <span>Subir PDF normativo</span>
                  </button>

                  <div className="border-t border-[var(--color-borde)] my-1 pt-2 px-2 pb-1.5 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                      Vista rápida de plan
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-[var(--color-fondo)] p-1 rounded-lg border border-[var(--color-borde)] text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCurrentPlan('free')}
                        className={`py-1 rounded font-semibold transition-colors cursor-pointer ${
                          currentPlan === 'free'
                            ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPlan('premium')}
                        className={`py-1 rounded font-semibold transition-colors cursor-pointer ${
                          currentPlan === 'premium'
                            ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPlan('professional')}
                        className={`py-1 rounded font-semibold transition-colors cursor-pointer ${
                          currentPlan === 'professional'
                            ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Plus
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-borde)] pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setCurrentView('landing');
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Volver a la página de inicio</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cuenta de usuario o botón Ingresar */}
            <div className="hidden md:flex items-center gap-2 pl-1">
              {currentUser ? (
                <>
                  <span
                    title={userProfile?.whatsapp_phone || currentUser.email}
                    className="max-w-[140px] truncate text-[11px] font-medium text-[var(--color-texto)] bg-[var(--color-fondo)] px-2.5 h-9 inline-flex items-center rounded-lg border border-[var(--color-borde)]"
                  >
                    {userProfile?.whatsapp_phone || currentUser.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Cerrar sesión"
                    className="px-2.5 h-9 rounded-lg text-xs font-medium text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Salir</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="px-3.5 h-9 rounded-lg text-xs font-bold bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] transition-colors cursor-pointer"
                >
                  Ingresar
                </button>
              )}
            </div>

            {/* Botón de menú móvil / tablet */}
            <button
              type="button"
              onClick={() => setPortalMobileMenuOpen(prev => !prev)}
              aria-label={portalMobileMenuOpen ? 'Cerrar menú del portal' : 'Abrir menú del portal'}
              aria-expanded={portalMobileMenuOpen}
              className="lg:hidden w-9 h-9 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] flex items-center justify-center transition-colors cursor-pointer"
            >
              {portalMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Panel desplegable móvil y tablet */}
        {portalMobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 space-y-3 shadow-md text-left">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reader');
                  setReaderSubView('library');
                  setPortalMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                  activeTab === 'reader' && readerSubView === 'library'
                    ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Biblioteca</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('reader');
                  setReaderSubView('document');
                  setPortalMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                  activeTab === 'reader' && readerSubView === 'document'
                    ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Documento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('tables');
                  setPortalMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-1.5 border transition-colors cursor-pointer ${
                  activeTab === 'tables'
                    ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Table2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tablas</span>
                </span>
                <span className="text-[10px] font-mono opacity-80">{tables.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('calculators');
                  setPortalMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                  activeTab === 'calculators'
                    ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 shrink-0" />
                <span>Calculadoras</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('chat');
                  setPortalMobileMenuOpen(false);
                }}
                className={`col-span-2 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Asistente IA</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToPricingPage}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 shrink-0" />
              <span>{currentPlan === 'free' ? 'Obtener Premium' : 'Subir de plan'}</span>
            </button>

            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reviewer');
                  setPortalMobileMenuOpen(false);
                }}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'reviewer'
                    ? 'bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] border-[var(--color-secundario-borde)]'
                    : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Control</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(true);
                  setPortalMobileMenuOpen(false);
                }}
                className="px-2.5 py-2 rounded-lg text-[11px] font-semibold border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 shrink-0 text-[var(--color-secundario)]" />
                <span>Subir PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPortalMobileMenuOpen(false);
                  setCurrentView('landing');
                }}
                className="px-2.5 py-2 rounded-lg text-[11px] font-semibold border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Inicio</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-borde)]">
              {currentUser ? (
                <>
                  <span className="text-xs text-[var(--color-texto-secundario)] truncate">
                    {userProfile?.whatsapp_phone || currentUser.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPortalMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPortalMobileMenuOpen(false);
                    handleOpenLogin();
                  }}
                  className="w-full py-2.5 rounded-lg text-xs font-bold bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] cursor-pointer"
                >
                  Ingresar a tu cuenta
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* TOAST NOTIFICATION */}
      {checkoutToast && (
        <div className="bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] text-[var(--color-texto)] px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-texto)]" />
          <span>{checkoutToast}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: PANTALLA 1 (BIBLIOTECA EN ÁRBOL JERÁRQUICO) Y PANTALLA 2      */}
      {/* ==================================================================== */}
      {activeTab === 'reader' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[var(--color-fondo)]">
          {readerSubView === 'library' ? (
            /* ================================================================ */
            /* PANTALLA 1: BIBLIOTECA EN ÁRBOL JERÁRQUICO (SIN PALABRA "EBOOK") */
            /* ================================================================ */
            <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
              {/* COLUMNA IZQUIERDA (Cols 1-4): ÁRBOL POR JERARQUÍAS (NORMATIVA Y TRIBUTOS) */}
              <aside className="col-span-12 md:col-span-4 lg:col-span-4 bg-[var(--color-superficie)] border-r border-[var(--color-borde)] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-[var(--color-borde)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-texto-secundario)]">
                        Pantalla 1 • Explorador Jerárquico
                      </span>
                      <h2 className="text-sm font-bold text-[var(--color-texto)] mt-0.5">
                        Biblioteca Normativa y Tributaria
                      </h2>
                    </div>
                    {(selectedNormId || selectedTaxFilter !== 'ALL' || selectedConceptId) && (
                      <button
                        onClick={() => {
                          setSelectedNormId(null);
                          setSelectedTaxFilter('ALL');
                          setSelectedConceptId(null);
                        }}
                        className="text-[11px] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] underline cursor-pointer"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>

                  {/* Buscador rápido en la Biblioteca */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filtrar cuerpo legal, impuesto o artículo..."
                      className="w-full bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] focus:border-[var(--color-borde-fuerte)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-texto)] placeholder-[var(--color-icono-sutil)] outline-none"
                    />
                  </div>
                </div>

                {/* Árbol Jerárquico Desplegable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* GRUPO 1: NORMATIVA (CUERPOS LEGALES) */}
                  <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        setLibraryTreeOpen(prev => ({
                          ...prev,
                          group_normativa: !prev.group_normativa
                        }))
                      }
                      className="w-full px-3.5 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer border-b border-[var(--color-borde)]"
                    >
                      <div className="flex items-center gap-2">
                        {libraryTreeOpen.group_normativa ? (
                          <ChevronDown className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                        )}
                        <FolderOpen className="w-4 h-4 text-[var(--color-texto)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-texto)]">
                          Grupo 1: Normativa
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-mono">
                        {Math.max(norms.length, 3)} cuerpos
                      </span>
                    </button>

                    {libraryTreeOpen.group_normativa && (
                      <div className="p-2 space-y-2">
                        {(() => {
                          const renderCategoryIcon = (cat: LibraryNormCategory) => {
                            if (cat === 'convenios') return <Globe className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                            if (cat === 'codigos') return <BookOpen className="w-3.5 h-3.5 text-[var(--color-texto)] shrink-0" />;
                            if (cat === 'leyes') return <Scale className="w-3.5 h-3.5 text-[var(--color-texto)] shrink-0" />;
                            if (cat === 'reglamentos') return <Layers className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                            if (cat === 'decretos') return <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                            if (cat === 'resoluciones') return <FileText className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                            if (cat === 'circulares') return <Bookmark className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                            return <FileCode className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />;
                          };

                          const countFor = (scope: LibraryNormScope, cat?: LibraryNormCategory) =>
                            norms.filter(n => {
                              const c = classifyLibraryNormDetailed(n);
                              if (c.scope !== scope) return false;
                              return cat ? c.category === cat : true;
                            }).length;

                          const renderScopeBlock = (
                            scope: LibraryNormScope,
                            title: string,
                            treeKey: 'sub_normas_principales' | 'sub_normas_suplementarias'
                          ) => {
                            const totalInScope = countFor(scope);
                            const isOpen = Boolean(libraryTreeOpen[treeKey]);
                            return (
                              <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLibraryTreeOpen(prev => ({
                                      ...prev,
                                      [treeKey]: !prev[treeKey]
                                    }))
                                  }
                                  className="w-full px-2.5 py-2 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                    {isOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-[var(--color-texto)] shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />
                                    )}
                                    <span className="text-[11px] font-bold text-[var(--color-texto)] truncate">
                                      {title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-[var(--color-texto-secundario)] shrink-0">
                                    {totalInScope}
                                  </span>
                                </button>
                                {isOpen && (
                                  <div className="p-1.5 space-y-0.5 border-t border-[var(--color-borde)]">
                                    {LIBRARY_CATEGORIES.map(cat => {
                                      const count = countFor(scope, cat.key);
                                      const isActiveCat =
                                        selectedTaxFilter === 'ALL' &&
                                        selectedLibraryScope === scope &&
                                        selectedLibraryCategory === cat.key;
                                      return (
                                        <button
                                          key={`${scope}-${cat.key}`}
                                          type="button"
                                          onClick={() => {
                                            setSelectedLibraryScope(scope);
                                            setSelectedLibraryCategory(cat.key);
                                            setLibraryRightView('cards');
                                            setSelectedTaxFilter('ALL');
                                            setSelectedConceptId(null);
                                            setSearchValidFrom('');
                                            setSearchValidTo('');
                                          }}
                                          className={`w-full px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between gap-2 text-left cursor-pointer border ${
                                            isActiveCat
                                              ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border-[var(--color-borde-fuerte)] font-semibold'
                                              : 'text-[var(--color-texto-secundario)] border-transparent hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            {renderCategoryIcon(cat.key)}
                                            <span className="truncate">{cat.label}</span>
                                          </div>
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border ${
                                              count > 0
                                                ? 'bg-[var(--color-fondo)] text-[var(--color-texto)] border-[var(--color-borde)]'
                                                : 'bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] border-[var(--color-borde)]'
                                            }`}
                                          >
                                            {count}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <>
                              {renderScopeBlock('principales', 'Normas Tributarias Principales', 'sub_normas_principales')}
                              {renderScopeBlock('suplementarias', 'Normas Suplementarias', 'sub_normas_suplementarias')}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* GRUPO 2: TRIBUTOS (IMPUESTOS Y CATEGORÍA ADICIONAL) */}
                  <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        setLibraryTreeOpen(prev => ({
                          ...prev,
                          group_tributos: !prev.group_tributos
                        }))
                      }
                      className="w-full px-3.5 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer border-b border-[var(--color-borde)]"
                    >
                      <div className="flex items-center gap-2">
                        {libraryTreeOpen.group_tributos ? (
                          <ChevronDown className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                        )}
                        <Scale className="w-4 h-4 text-[var(--color-texto)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-texto)]">
                          Grupo 2: Tributos
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-mono">
                        Jerarquía Fiscal
                      </span>
                    </button>

                    {libraryTreeOpen.group_tributos && (
                      <div className="p-2.5 space-y-2">
                        {/* Sub-rama 2.1: Impuestos */}
                        <div className="border-l border-[var(--color-borde)] pl-2.5 space-y-1">
                          <button
                            onClick={() =>
                              setLibraryTreeOpen(prev => ({
                                ...prev,
                                sub_impuestos: !prev.sub_impuestos
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded-md hover:bg-[var(--color-superficie-hover)] flex items-center justify-between text-left cursor-pointer"
                          >
                            <span className="text-[11px] font-bold text-[var(--color-texto)] flex items-center gap-1.5">
                              {libraryTreeOpen.sub_impuestos ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              )}
                              <span>Impuestos Principales</span>
                            </span>
                            <span className="text-[10px] text-[var(--color-texto-secundario)]">5 tributos</span>
                          </button>

                          {libraryTreeOpen.sub_impuestos && (
                            <div className="pl-3 space-y-1 pt-0.5">
                              {(
                                [
                                  {
                                    code: 'RENTA' as TaxScopeCode,
                                    label: 'Impuesto a la Renta',
                                    sub: 'Título Primero LRTI • Arts. 1 al 51 y Tablas Art. 36',
                                    defaultArt: 'Art. 36'
                                  },
                                  {
                                    code: 'IVA' as TaxScopeCode,
                                    label: 'Impuesto al Valor Agregado (IVA)',
                                    sub: 'Título Segundo LRTI • Arts. 52 al 74',
                                    defaultArt: 'Art. 55'
                                  },
                                  {
                                    code: 'ISD' as TaxScopeCode,
                                    label: 'Impuesto a la Salida de Divisas (ISD)',
                                    sub: 'Ley de Equidad Tributaria • Hecho generador y tarifa',
                                    defaultArt: 'Art. 36'
                                  },
                                  {
                                    code: 'ICE' as TaxScopeCode,
                                    label: 'Impuesto a los Consumos Especiales (ICE)',
                                    sub: 'Título Tercero LRTI • Arts. 75 al 88',
                                    defaultArt: 'Art. 75'
                                  },
                                  {
                                    code: 'RISE' as TaxScopeCode,
                                    label: 'Régimen Impositivo Simplificado (RISE)',
                                    sub: 'Arts. 97.1 al 97.15 LRTI • Categorías y cuotas',
                                    defaultArt: 'Art. 97.6'
                                  }
                                ]
                              ).map(taxItem => {
                                const isSelected = selectedTaxFilter === taxItem.code;
                                const count = taxCounts[taxItem.code] || 0;
                                return (
                                  <button
                                    key={taxItem.code}
                                    onClick={() => {
                                      setSelectedTaxFilter(taxItem.code);
                                      setEbookNavMode(taxItem.code === 'ALL' ? 'index' : 'tax');
                                      setSelectedArticleLabel(taxItem.defaultArt);
                                      setOpenArticleSheets(prev => ({
                                        ...prev,
                                        [taxItem.defaultArt]: true
                                      }));
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between cursor-pointer border ${
                                      isSelected
                                        ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border-[var(--color-borde-fuerte)] font-semibold'
                                        : 'text-[var(--color-texto-secundario)] border-transparent hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                    }`}
                                  >
                                    <div className="pr-2 truncate">
                                      <div className="truncate">{taxItem.label}</div>
                                      <div className="text-[10px] text-[var(--color-texto-secundario)] truncate">{taxItem.sub}</div>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-mono shrink-0">
                                      {count} arts.
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Sub-rama 2.2: Categoría Adicional / Otra (Regímenes y Conceptos Transversales) */}
                        <div className="border-l border-[var(--color-borde)] pl-2.5 space-y-1">
                          <button
                            onClick={() =>
                              setLibraryTreeOpen(prev => ({
                                ...prev,
                                sub_adicionales: !prev.sub_adicionales
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded-md hover:bg-[var(--color-superficie-hover)] flex items-center justify-between text-left cursor-pointer"
                          >
                            <span className="text-[11px] font-bold text-[var(--color-texto)] flex items-center gap-1.5">
                              {libraryTreeOpen.sub_adicionales ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              )}
                              <span>Adicionales y Conceptos Tributarios</span>
                            </span>
                            <span className="text-[10px] text-[var(--color-texto-secundario)]">{concepts.length + 1}</span>
                          </button>

                          {libraryTreeOpen.sub_adicionales && (
                            <div className="pl-3 space-y-1 pt-0.5">
                              <button
                                onClick={() => {
                                  setSelectedTaxFilter('GENERAL');
                                  setEbookNavMode('tax');
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer border ${
                                  selectedTaxFilter === 'GENERAL'
                                    ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border-[var(--color-borde-fuerte)] font-semibold'
                                    : 'text-[var(--color-texto-secundario)] border-transparent hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                }`}
                              >
                                <span>Disposiciones Generales, Transitorias y Reformatorias</span>
                                <span className="text-[10px] text-[var(--color-texto-secundario)] font-mono">{taxCounts.GENERAL || 0}</span>
                              </button>

                              {concepts.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() =>
                                    setSelectedConceptId(selectedConceptId === c.id ? null : c.id)
                                  }
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer border ${
                                    selectedConceptId === c.id
                                      ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border-[var(--color-borde-fuerte)] font-semibold'
                                      : 'text-[var(--color-texto-secundario)] border-transparent hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                  }`}
                                >
                                  <span className="truncate">{c.name}</span>
                                  <span className="text-[10px] text-[var(--color-texto-secundario)]">{c.code}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* PANEL DERECHO (Cols 5-12): TARJETAS POR CATEGORÍA O APARTADO "FICHA DE LA LEY" */}
              <main className="col-span-12 md:col-span-8 lg:col-span-8 bg-[var(--color-fondo)] flex flex-col overflow-y-auto p-6 lg:p-8 space-y-6">
                {libraryRightView === 'cards' && selectedTaxFilter === 'ALL' ? (
                  (() => {
                    const scopeTitle =
                      selectedLibraryScope === 'principales'
                        ? 'Normas Tributarias Principales'
                        : 'Normas Suplementarias';
                    const catMeta =
                      LIBRARY_CATEGORIES.find(c => c.key === selectedLibraryCategory) ||
                      LIBRARY_CATEGORIES[2];

                    const q = searchQuery.trim().toLowerCase();
                    const categoryNorms = norms
                      .filter(n => {
                        const c = classifyLibraryNormDetailed(n);
                        if (c.scope !== selectedLibraryScope || c.category !== selectedLibraryCategory) {
                          return false;
                        }
                        if (!q) return true;
                        return (
                          (n.title || '').toLowerCase().includes(q) ||
                          (n.code || '').toLowerCase().includes(q) ||
                          (n.publication_date || '').toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => {
                        const pinA = isNormPinned(a);
                        const pinB = isNormPinned(b);
                        if (pinA !== pinB) return pinA ? -1 : 1;

                        const defA = isDefaultPrimaryNorm(a);
                        const defB = isDefaultPrimaryNorm(b);
                        if (defA !== defB) return defA ? -1 : 1;

                        const dateA = a.publication_date || '';
                        const dateB = b.publication_date || '';
                        if (dateA !== dateB) return dateB.localeCompare(dateA);
                        return (a.code || a.title || '').localeCompare(b.code || b.title || '');
                      });

                    return (
                      <>
                        {/* Cabecera de la Categoría Activa */}
                        <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-2xl p-6 shadow-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                  {scopeTitle}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                                <span className="text-[11px] text-[var(--color-texto-secundario)] font-semibold">
                                  {catMeta.label}
                                </span>
                              </div>
                              <h1 className="font-heading text-2xl font-extrabold text-[var(--color-texto)] tracking-tight">
                                {catMeta.label}
                              </h1>
                              <p className="text-xs text-[var(--color-texto-secundario)] max-w-2xl leading-relaxed">
                                Selecciona una tarjeta para consultar la <strong className="text-[var(--color-texto)]">Ficha de la Ley</strong> (índice, tablas y trazabilidad) o abre directamente el texto normativo consolidado.
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-xs px-3 py-1.5 rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto)] font-mono">
                                {categoryNorms.length} {categoryNorms.length === 1 ? 'cuerpo cargado' : 'cuerpos cargados'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cuadrícula de Tarjetas de Normas */}
                        {categoryNorms.length === 0 ? (
                          <div className="bg-[var(--color-superficie-secundaria)] border border-dashed border-[var(--color-borde)] rounded-2xl p-10 text-center space-y-2">
                            <div className="text-sm font-bold text-[var(--color-texto)]">
                              Aún no hay cuerpos normativos en «{scopeTitle} · {catMeta.label}»
                            </div>
                            <p className="text-xs text-[var(--color-texto-secundario)] max-w-md mx-auto">
                              {q
                                ? 'Prueba a limpiar el filtro de búsqueda en el panel izquierdo.'
                                : 'Cuando incorpores documentos de esta categoría desde «Subir PDF» o Google Drive, aparecerán aquí automáticamente como tarjetas navegables.'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {categoryNorms.map(n => {
                              const info = classifyLibraryNormDetailed(n);
                              const artCount = articlesByNormId.get(n.id) || 0;
                              const isCompactNormCard =
                                info.category === 'resoluciones' ||
                                info.category === 'circulares' ||
                                info.category === 'decretos';
                              const cardMeta = isCompactNormCard
                                ? getCompactNormCardMeta(n, info.category)
                                : null;
                              const isPinned = isNormPinned(n);
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => {
                                    setSelectedNormId(n.id);
                                    setSelectedConceptId(null);
                                    setSearchValidFrom('');
                                    setSearchValidTo('');
                                    setLibraryPreviewTab('summary');
                                    setLibraryRightView('ficha');
                                  }}
                                  className={`group w-full bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border rounded-2xl p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer shadow-lg ${
                                    isPinned
                                      ? 'border-[var(--color-secundario-borde)] hover:border-[var(--color-secundario)]'
                                      : 'border-[var(--color-borde)] hover:border-[var(--color-borde-fuerte)]'
                                  }`}
                                >
                                  <div className="space-y-1.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={e => handleTogglePinNorm(n, e)}
                                        title={
                                          isPinned
                                            ? 'Quitar de la parte superior'
                                            : 'Fijar esta norma en la parte superior'
                                        }
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold transition cursor-pointer ${
                                          isPinned
                                            ? 'bg-[var(--color-secundario-suave)] border-[var(--color-secundario-borde)] text-[var(--color-secundario)]'
                                            : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:border-[var(--color-borde-fuerte)]'
                                        }`}
                                      >
                                        <Star
                                          className="w-3 h-3"
                                          fill={isPinned ? 'currentColor' : 'none'}
                                        />
                                        {isPinned && <span>Fijada</span>}
                                      </button>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                        {info.badge}
                                      </span>
                                      {n.publication_date && (
                                        <span
                                          title={
                                            info.category === 'decretos'
                                              ? 'Fecha del decreto'
                                              : 'Fecha de publicación'
                                          }
                                          className="text-[11px] font-mono text-[var(--color-texto-secundario)]"
                                        >
                                          {n.publication_date}
                                        </span>
                                      )}
                                      {!isCompactNormCard && n.code && (
                                        <span className="text-[10px] font-mono text-[var(--color-texto-secundario)]">
                                          · {n.code}
                                        </span>
                                      )}
                                      <span className="text-[var(--color-texto-secundario)]">•</span>
                                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-texto-secundario)]">
                                        <FileText className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                                        {artCount} {artCount === 1 ? 'artículo' : 'artículos'}
                                      </span>
                                    </div>

                                    {cardMeta ? (
                                      <>
                                        <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-texto)] group-hover:text-[var(--color-texto)] tracking-tight leading-snug break-words">
                                          {cardMeta.heading}
                                        </h2>
                                        <p className="text-xs font-light text-[var(--color-texto-secundario)] leading-relaxed line-clamp-2 max-w-4xl">
                                          {cardMeta.description}
                                        </p>
                                      </>
                                    ) : (
                                      <h2 className="text-sm sm:text-base font-extrabold text-[var(--color-texto)] group-hover:text-[var(--color-texto)] leading-snug">
                                        {n.title}
                                      </h2>
                                    )}
                                  </div>

                                  <div className="pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--color-borde)] flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                                    {isAdmin &&
                                      (info.category === 'decretos' ||
                                        (info.category === 'reglamentos' && n.code !== 'RALRTI')) && (
                                        <button
                                          type="button"
                                          disabled={updatingCategoryNormId === n.id}
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleChangeNormCategory(
                                              n.id,
                                              info.category === 'decretos' ? 'regulation' : 'decree'
                                            );
                                          }}
                                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde-fuerte)] text-[var(--color-texto)] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                                          title={
                                            info.category === 'decretos'
                                              ? 'Ascender este decreto a la categoría Reglamentos'
                                              : 'Mover este cuerpo normativo de vuelta a la categoría Decretos'
                                          }
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-secundario)]" />
                                          <span>
                                            {updatingCategoryNormId === n.id
                                              ? 'Guardando...'
                                              : info.category === 'decretos'
                                                ? 'Ascender a Reglamento'
                                                : 'Mover a Decretos'}
                                          </span>
                                        </button>
                                      )}
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedNormId(n.id);
                                        setSelectedConceptId(null);
                                        setSearchValidFrom('');
                                        setSearchValidTo('');
                                        setLibraryPreviewTab('summary');
                                        setLibraryRightView('ficha');
                                      }}
                                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[var(--color-texto)] transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Layers className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                                      <span>Ficha de la Ley</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleOpenFullNorm(n);
                                      }}
                                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                      <span>Abrir Documento</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <>
                    {/* Barra de regreso desde el apartado "Ficha de la Ley" hacia las Tarjetas */}
                    {selectedTaxFilter === 'ALL' && (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setLibraryRightView('cards')}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span>
                            ← Volver a{' '}
                            {LIBRARY_CATEGORIES.find(c => c.key === selectedLibraryCategory)?.label ||
                              'Tarjetas'}
                          </span>
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]">
                          Apartado · Ficha de la Ley
                        </span>
                      </div>
                    )}

                {/* Tarjeta Principal con Botón "Abrir Documento" en la Parte Superior Derecha */}
                <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[var(--color-borde)]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                          {selectedTaxFilter !== 'ALL'
                            ? `Tributo Seleccionado: ${TAX_SCOPES[selectedTaxFilter].name}`
                            : 'Ficha de la Ley'}
                        </span>
                        <span className="text-[11px] text-[var(--color-texto-secundario)] font-mono">
                          • Vigencia Actual Consolidada
                        </span>
                      </div>
                      {(() => {
                        const activeFichaNorm = norms.find(n => n.id === effectiveNormId);
                        const fichaInfo = activeFichaNorm ? classifyLibraryNormDetailed(activeFichaNorm) : null;
                        const isFichaResOrCirc =
                          fichaInfo?.category === 'resoluciones' ||
                          fichaInfo?.category === 'circulares' ||
                          fichaInfo?.category === 'decretos';
                        if (activeFichaNorm && isFichaResOrCirc && fichaInfo) {
                          const fichaMeta = getCompactNormCardMeta(activeFichaNorm, fichaInfo.category);
                          return (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="font-heading text-2xl font-extrabold text-[var(--color-texto)] tracking-tight break-words">
                                  {fichaMeta.heading}
                                </h1>
                                {activeFichaNorm.publication_date && (
                                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto-secundario)]">
                                    {activeFichaNorm.publication_date}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-light text-[var(--color-texto-secundario)] max-w-3xl leading-relaxed">
                                {fichaMeta.description}
                              </p>
                            </>
                          );
                        }
                        return (
                          <>
                            <h1 className="font-heading text-2xl font-extrabold text-[var(--color-texto)] tracking-tight">
                              {activeFichaNorm?.title || 'Ley de Régimen Tributario Interno (LRTI)'}
                            </h1>
                            <p className="text-xs text-[var(--color-texto-secundario)] max-w-2xl leading-relaxed">
                              {selectedTaxFilter !== 'ALL'
                                ? TAX_SCOPES[selectedTaxFilter].description
                                : activeFichaNorm?.code === 'RALRTI'
                                  ? 'Expedido mediante Decreto Ejecutivo No. 374 (Suplemento del Registro Oficial No. 209 de 8 de junio de 2010), integrado cronológicamente con sus decretos ejecutivos reformatorios.'
                                  : activeFichaNorm && activeFichaNorm.code !== 'LRTI'
                                    ? `Código normativo: ${activeFichaNorm.code}`
                                    : 'Codificación 2004-026 publicada en el Suplemento del Registro Oficial No. 463, integrada con las reformas de la Ley Reformatoria para la Equidad Tributaria (R.O. 242), Ley Orgánica Reformatoria (R.O. 392) y resoluciones generales del SRI.'}
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    {/* OPCIÓN DE ABRIR DOCUMENTO EN LA PARTE SUPERIOR DERECHA */}
                    <div className="shrink-0 flex flex-wrap items-center gap-2 self-start">
                      {(() => {
                        const activeFichaNorm = norms.find(n => n.id === effectiveNormId);
                        const fichaInfo = activeFichaNorm ? classifyLibraryNormDetailed(activeFichaNorm) : null;
                        if (
                          !isAdmin ||
                          !activeFichaNorm ||
                          !fichaInfo ||
                          (fichaInfo.category !== 'decretos' &&
                            !(fichaInfo.category === 'reglamentos' && activeFichaNorm.code !== 'RALRTI'))
                        ) {
                          return null;
                        }
                        return (
                          <button
                            type="button"
                            disabled={updatingCategoryNormId === activeFichaNorm.id}
                            onClick={() =>
                              handleChangeNormCategory(
                                activeFichaNorm.id,
                                fichaInfo.category === 'decretos' ? 'regulation' : 'decree'
                              )
                            }
                            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-superficie)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde-fuerte)] text-[var(--color-texto)] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-sm"
                          >
                            <ShieldCheck className="w-4 h-4 text-[var(--color-secundario)]" />
                            <span>
                              {updatingCategoryNormId === activeFichaNorm.id
                                ? 'Guardando...'
                                : fichaInfo.category === 'decretos'
                                  ? 'Ascender a Reglamento'
                                  : 'Mover a Decretos'}
                            </span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => {
                          if (activeCurrentArticle) {
                            setOpenArticleSheets(prev => ({
                              ...prev,
                              [activeCurrentArticle.label]: true
                            }));
                          }
                          setReaderSubView('document');
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] transition flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Abrir Documento</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Métricas del Cuerpo Normativo / Tributo Seleccionado */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                        Artículos Disponibles
                      </div>
                      <div className="text-xl font-extrabold text-[var(--color-texto)] mt-1">
                        {selectedTaxFilter === 'ALL'
                          ? currentArticles.length
                          : taxFilteredArticles.length}
                      </div>
                      <div className="text-[10px] text-[var(--color-texto-secundario)] mt-0.5">
                        Redacción vigente consolidada
                      </div>
                    </div>

                    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                        Títulos y Capítulos
                      </div>
                      <div className="text-xl font-extrabold text-[var(--color-texto)] mt-1">
                        {ebookTree.length} Títulos
                      </div>
                      <div className="text-[10px] text-[var(--color-texto-secundario)] mt-0.5">
                        Índice navegable independiente
                      </div>
                    </div>

                    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                        Tablas Tarifarias
                      </div>
                      <div className="text-xl font-extrabold text-[var(--color-texto)] mt-1">
                        {tables.length} Tablas
                      </div>
                      <div className="text-[10px] text-[var(--color-texto-secundario)] mt-0.5">
                        Renta y Herencias (2004–2009)
                      </div>
                    </div>

                    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                        Trazabilidad Temporal
                      </div>
                      <div className="text-xl font-extrabold text-[var(--color-texto)] mt-1 flex items-center gap-1.5">
                        <Hourglass className="w-4 h-4 text-[var(--color-texto)]" />
                        <span>Activa</span>
                      </div>
                      <div className="text-[10px] text-[var(--color-texto-secundario)] mt-0.5">
                        Comparador horizontal por artículo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pestañas de Vista Previa Antes de Abrir el Documento */}
                <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-2xl overflow-hidden flex-1 flex flex-col">
                  <div className="px-5 py-3 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLibraryPreviewTab('summary')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          libraryPreviewTab === 'summary'
                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Índice de Títulos y Capítulos ({ebookTree.length})
                      </button>
                      <button
                        onClick={() => setLibraryPreviewTab('tables')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          libraryPreviewTab === 'tables'
                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Tablas del Art. 36 ({articleTables.length})
                      </button>
                      <button
                        onClick={() => setLibraryPreviewTab('reforms')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          libraryPreviewTab === 'reforms'
                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Artículos con Historial de Reformas
                      </button>
                    </div>
                    <span className="text-[11px] text-[var(--color-texto-secundario)]">
                      Haz clic en cualquier título o artículo para abrir el documento
                    </span>
                  </div>

                  <div className="p-5 overflow-y-auto space-y-3 flex-1">
                    {libraryPreviewTab === 'summary' && (
                      <div className="space-y-3">
                        {ebookTree.map((titleNode, tIdx) => {
                          const chaptersList = Object.values(titleNode.chapters);
                          const firstArticle =
                            chaptersList[0]?.articles[0] || titleNode.orphanArticles[0];
                          const totalArts =
                            titleNode.orphanArticles.length +
                            chaptersList.reduce((acc, c) => acc + c.articles.length, 0);

                          return (
                            <div
                              key={`lib-preview-title-${tIdx}`}
                              className="bg-[var(--color-superficie)] border border-[var(--color-borde)] hover:border-[var(--color-borde-fuerte)] rounded-xl p-4 transition"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-texto)]">
                                    {titleNode.titleText}
                                  </h3>
                                  <p className="text-[11px] text-[var(--color-texto-secundario)] mt-0.5">
                                    {chaptersList.length} capítulos • {totalArts} artículos vigentes
                                  </p>
                                </div>
                                {firstArticle && (
                                  <button
                                    onClick={() => {
                                      setSelectedArticleLabel(firstArticle.label);
                                      setOpenArticleSheets(prev => ({
                                        ...prev,
                                        [firstArticle.label]: true
                                      }));
                                      setReaderSubView('document');
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] transition cursor-pointer shrink-0"
                                  >
                                    Ir a {firstArticle.label} →
                                  </button>
                                )}
                              </div>

                              {chaptersList.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[var(--color-borde)] grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {chaptersList.map((chap, cIdx) => (
                                    <button
                                      key={`lib-chap-${tIdx}-${cIdx}`}
                                      onClick={() => {
                                        const targetArt = chap.articles[0];
                                        if (targetArt) {
                                          setSelectedArticleLabel(targetArt.label);
                                          setOpenArticleSheets(prev => ({
                                            ...prev,
                                            [targetArt.label]: true
                                          }));
                                        }
                                        setReaderSubView('document');
                                      }}
                                      className="text-left p-2 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] transition flex items-center justify-between gap-2 cursor-pointer"
                                    >
                                      <span className="text-[11px] text-[var(--color-texto)] truncate">
                                        {chap.chapterText}
                                      </span>
                                      <span className="text-[10px] text-[var(--color-texto-secundario)] font-mono shrink-0">
                                        {chap.articles.length} arts.
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {libraryPreviewTab === 'tables' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {articleTables.map(tbl => (
                          <div
                            key={tbl.id}
                            className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-4 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                  Año {tbl.fiscal_year} • {tbl.table_code}
                                </span>
                                <span className="text-[10px] text-[var(--color-texto-secundario)]">
                                  {tbl.rows_data.length} tramos
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[var(--color-texto)] mt-2">{tbl.title}</h4>
                              <p className="text-[11px] text-[var(--color-texto-secundario)] mt-0.5 line-clamp-2">
                                {tbl.subtitle}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-borde)]">
                              <span className="text-[10px] text-[var(--color-texto-secundario)] font-mono">
                                Vigencia: {formatEffectiveRange(tbl.effective_during, tbl.fiscal_year)}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedArticleLabel('Art. 36');
                                  setOpenArticleSheets(prev => ({ ...prev, 'Art. 36': true }));
                                  setReaderSubView('document');
                                }}
                                className="text-[11px] font-semibold text-[var(--color-texto)] hover:underline cursor-pointer"
                              >
                                Ver en Art. 36 →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {libraryPreviewTab === 'reforms' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(selectedTaxFilter === 'ALL' ? currentArticles : taxFilteredArticles)
                          .filter(a => a.legal_status === 'vigente_reformado' || getArticleVersionsCount(a) > 1)
                          .slice(0, 24)
                          .map(art => {
                            const verCount = getArticleVersionsCount(art);
                            return (
                              <div
                                key={art.id}
                                className="bg-[var(--color-superficie)] border border-[var(--color-borde)] hover:border-[var(--color-borde-fuerte)] rounded-xl p-3.5 flex items-center justify-between gap-3 transition"
                              >
                                <button
                                  onClick={() => {
                                    setSelectedArticleLabel(art.label);
                                    setOpenArticleSheets(prev => ({ ...prev, [art.label]: true }));
                                    setReaderSubView('document');
                                  }}
                                  className="text-left min-w-0 flex-1 cursor-pointer"
                                >
                                  <div className="text-xs font-bold text-[var(--color-texto)] truncate flex items-center gap-1.5">
                                    <span className="truncate">
                                      {art.display_label || art.label}
                                      {art.title ? `: ${art.title}` : ''}
                                    </span>
                                    {art.is_innumerado && art.after_article && (
                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] shrink-0">
                                        {art.innumerado_order || 1} tras Art. {art.after_article}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[var(--color-texto-secundario)] truncate mt-0.5">
                                    {art.reform_source_cite || 'Reforma consolidada en Registro Oficial'}
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedArticleLabel(art.label);
                                    setIsHistoryModalOpen(true);
                                  }}
                                  title="Abrir línea del tiempo histórica de este artículo"
                                  className="px-2.5 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[var(--color-texto)] text-[11px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                  <Hourglass className="w-3.5 h-3.5 text-[var(--color-texto)]" />
                                  <span>{verCount} vers.</span>
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
                  </>
                )}
              </main>
            </div>
          ) : (
            /* ================================================================ */
            /* PANTALLA 2: LECTOR DEL DOCUMENTO CON ÍNDICE INDEPENDIENTE Y      */
            /* ARTÍCULOS DESPLEGABLES COMO HOJAS CON ENCABEZADO STICKY + ⏳     */
            /* ================================================================ */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sub-barra superior del Lector del Documento */}
              <div className="px-5 py-2.5 bg-[var(--color-superficie)] border-b border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setReaderSubView('library')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>← Volver a la Biblioteca</span>
                  </button>
                  <div className="h-4 w-[1px] bg-[var(--color-superficie-secundaria)]" />
                  <div className="min-w-0 flex-1">
                    {(() => {
                      const docNorm = norms.find(n => n.id === effectiveNormId);
                      const docInfo = docNorm ? classifyLibraryNormDetailed(docNorm) : null;
                      const isDocResOrCirc =
                        docInfo?.category === 'resoluciones' ||
                        docInfo?.category === 'circulares' ||
                        docInfo?.category === 'decretos';
                      if (docNorm && isDocResOrCirc && docInfo) {
                        const docMeta = getCompactNormCardMeta(docNorm, docInfo.category);
                        return (
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                {docInfo.badge}
                              </span>
                              <span className="text-sm font-extrabold text-[var(--color-texto)] tracking-tight">
                                {docMeta.heading}
                              </span>
                              {docNorm.publication_date && (
                                <span className="text-[10px] font-mono text-[var(--color-texto-secundario)]">
                                  · {docNorm.publication_date}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-light text-[var(--color-texto-secundario)] leading-snug line-clamp-2 max-w-3xl">
                              {docMeta.description}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-bold text-[var(--color-texto)]">
                            {docNorm?.title || 'Ley de Régimen Tributario Interno (LRTI)'}
                          </span>
                          {docNorm?.code && (
                            <span className="text-[10px] font-mono text-[var(--color-texto-secundario)]">
                              · {docNorm.code}
                            </span>
                          )}
                          {selectedTaxFilter !== 'ALL' && (
                            <span className="px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[10px] font-semibold text-[var(--color-texto)]">
                              {TAX_SCOPES[selectedTaxFilter].name}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Controles de Hojas y Filtro de Vigencia */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar artículo o término..."
                      className="w-full bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] focus:border-[var(--color-borde-fuerte)] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[var(--color-texto)] placeholder-[var(--color-icono-sutil)] outline-none"
                    />
                  </div>

                  <button
                    onClick={() => setOpenArticleSheets({})}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] transition cursor-pointer"
                  >
                    Desplegar todos
                  </button>

                  <button
                    onClick={() => {
                      const list = ebookNavMode === 'tax' ? taxFilteredArticles : currentArticles;
                      const allCollapsed: Record<string, boolean> = {};
                      list.forEach(a => {
                        allCollapsed[a.label] = false;
                      });
                      setOpenArticleSheets(allCollapsed);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] transition cursor-pointer"
                  >
                    Colapsar todos
                  </button>

                  <button
                    onClick={() => setShowAdvancedDateSearch(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 cursor-pointer ${
                      showAdvancedDateSearch || searchValidFrom || searchValidTo
                        ? 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde-fuerte)] text-[var(--color-texto)]'
                        : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                    }`}
                  >
                    <Hourglass className="w-3 h-3" />
                    <span>Filtro de Vigencia</span>
                  </button>
                </div>
              </div>

              {/* Barra opcional de filtro por fechas */}
              {(showAdvancedDateSearch || searchValidFrom || searchValidTo) && (
                <div className="px-5 py-2.5 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-texto)]">
                      Vigencia histórica (Art. 11 CT):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--color-texto-secundario)]">Desde:</span>
                      <input
                        type="date"
                        value={searchValidFrom}
                        onChange={e => setSearchValidFrom(e.target.value)}
                        className="bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded px-2 py-0.5 text-[11px] text-[var(--color-texto)]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--color-texto-secundario)]">Hasta:</span>
                      <input
                        type="date"
                        value={searchValidTo}
                        onChange={e => setSearchValidTo(e.target.value)}
                        className="bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded px-2 py-0.5 text-[11px] text-[var(--color-texto)]"
                      />
                    </div>
                  </div>
                  {(searchValidFrom || searchValidTo) && (
                    <button
                      onClick={() => {
                        setSearchValidFrom('');
                        setSearchValidTo('');
                      }}
                      className="text-[11px] text-[var(--color-texto)] hover:underline cursor-pointer"
                    >
                      Restablecer a Vigente Hoy
                    </button>
                  )}
                </div>
              )}

              {/* Cuerpo dividido: Columna Izquierda (Títulos y Capítulos con scroll propio) + Lienzo Derecho (Hojas Desplegables con scroll propio) */}
              <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
                {/* COLUMNA IZQUIERDA (Cols 1-4 o 1-3): ÍNDICE DE TÍTULOS Y CAPÍTULOS INDEPENDIENTE */}
                <aside className="col-span-12 md:col-span-4 lg:col-span-3 bg-[var(--color-superficie)] border-r border-[var(--color-borde)] flex flex-col overflow-hidden min-h-0">
                  <div className="p-3 border-b border-[var(--color-borde)] flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-texto-secundario)]">
                      Índice de Títulos y Capítulos
                    </span>
                    <div className="flex items-center gap-1 bg-[var(--color-superficie-secundaria)] p-0.5 rounded-md border border-[var(--color-borde)]">
                      <button
                        onClick={() => setEbookNavMode('index')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          ebookNavMode === 'index'
                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Por Capítulos
                      </button>
                      <button
                        onClick={() => setEbookNavMode('tax')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          ebookNavMode === 'tax'
                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]'
                            : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        Por Tributo
                      </button>
                    </div>
                  </div>

                  {ebookNavMode === 'tax' && (
                    <div className="p-2.5 border-b border-[var(--color-borde)] flex flex-wrap gap-1 bg-[var(--color-superficie-secundaria)] shrink-0">
                      {(['ALL', 'RENTA', 'IVA', 'ICE', 'ISD', 'RISE', 'GENERAL'] as TaxScopeCode[]).map(
                        scopeCode => {
                          const scope = TAX_SCOPES[scopeCode];
                          const isSelected = selectedTaxFilter === scopeCode;
                          const count = taxCounts[scopeCode] || 0;
                          return (
                            <button
                              key={scopeCode}
                              onClick={() => setSelectedTaxFilter(scopeCode)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                                  : 'bg-[var(--color-superficie)] text-[var(--color-texto-secundario)] border-[var(--color-borde)] hover:text-[var(--color-texto)]'
                              }`}
                            >
                              {scope.shortName} ({count})
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Árbol de Títulos y Capítulos con Scroll Independiente */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {ebookTree.map((titleNode, tIdx) => {
                      const isTitleCollapsed = collapsedNodes[`title-${tIdx}`];
                      const chaptersList = Object.values(titleNode.chapters);
                      const totalArts =
                        titleNode.orphanArticles.length +
                        chaptersList.reduce((acc, c) => acc + c.articles.length, 0);

                      return (
                        <div
                          key={`doc-title-${tIdx}`}
                          className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setCollapsedNodes(prev => ({
                                ...prev,
                                [`title-${tIdx}`]: !prev[`title-${tIdx}`]
                              }))
                            }
                            className="w-full p-2.5 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer border-b border-[var(--color-borde)]"
                          >
                            <span className="text-[11px] font-bold text-[var(--color-texto)] line-clamp-2 pr-2">
                              {titleNode.titleText}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-fondo)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] font-mono">
                                {totalArts}
                              </span>
                              {isTitleCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              )}
                            </div>
                          </button>

                          {!isTitleCollapsed && (
                            <div className="p-2 space-y-2">
                              {chaptersList.map((chapNode, cIdx) => {
                                const chapKey = `chap-${tIdx}-${cIdx}`;
                                const isChapCollapsed = collapsedNodes[chapKey];

                                return (
                                  <div
                                    key={chapKey}
                                    className="pl-2 border-l border-[var(--color-borde)] space-y-1"
                                  >
                                    <button
                                      onClick={() =>
                                        setCollapsedNodes(prev => ({
                                          ...prev,
                                          [chapKey]: !prev[chapKey]
                                        }))
                                      }
                                      className="w-full py-1 px-2 rounded hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                                    >
                                      <span className="text-[11px] font-semibold text-[var(--color-texto)] line-clamp-1">
                                        {chapNode.chapterText}
                                      </span>
                                      {isChapCollapsed ? (
                                        <ChevronRight className="w-3 h-3 text-[var(--color-texto-secundario)]" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-[var(--color-texto-secundario)]" />
                                      )}
                                    </button>

                                    {!isChapCollapsed && (
                                      <div className="pl-2 space-y-0.5 pt-0.5">
                                        {chapNode.articles.map(art => {
                                          const isSelected = art.label === selectedArticleLabel;
                                          const isSheetOpen = openArticleSheets[art.label] !== false;
                                          return (
                                            <button
                                              key={art.id}
                                              onClick={() => {
                                                setSelectedArticleLabel(art.label);
                                                setOpenArticleSheets(prev => ({
                                                  ...prev,
                                                  [art.label]: true
                                                }));
                                                setTimeout(() => {
                                                  const container = document.getElementById(
                                                    'document-sheets-scroll-container'
                                                  );
                                                  const el = document.getElementById(
                                                    `article-sheet-${art.id}`
                                                  );
                                                  if (container && el) {
                                                    const topPos =
                                                      el.getBoundingClientRect().top -
                                                      container.getBoundingClientRect().top +
                                                      container.scrollTop;
                                                    container.scrollTo({
                                                      top: Math.max(0, topPos),
                                                      behavior: 'smooth'
                                                    });
                                                  }
                                                }, 40);
                                              }}
                                              className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition flex items-center justify-between gap-1.5 cursor-pointer ${
                                                isSelected
                                                  ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] font-semibold'
                                                  : 'text-[var(--color-texto-secundario)] hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                              }`}
                                            >
                                              <span className="truncate flex items-center gap-1.5 min-w-0">
                                                <span className="truncate">
                                                  {art.display_label || art.label}
                                                  {art.title ? ` · ${art.title}` : ''}
                                                </span>
                                                {art.is_innumerado && art.after_article && (
                                                  <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] shrink-0">
                                                    {art.innumerado_order || 1} tras Art. {art.after_article}
                                                  </span>
                                                )}
                                              </span>
                                              {isSheetOpen && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-superficie-secundaria)] shrink-0" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {titleNode.orphanArticles.length > 0 && (
                                <div className="space-y-0.5 pl-1">
                                  {titleNode.orphanArticles.map(art => {
                                    const isSelected = art.label === selectedArticleLabel;
                                    return (
                                      <button
                                        key={art.id}
                                        onClick={() => {
                                          setSelectedArticleLabel(art.label);
                                          setOpenArticleSheets(prev => ({
                                            ...prev,
                                            [art.label]: true
                                          }));
                                          setTimeout(() => {
                                            const container = document.getElementById(
                                              'document-sheets-scroll-container'
                                            );
                                            const el = document.getElementById(
                                              `article-sheet-${art.id}`
                                            );
                                            if (container && el) {
                                              const topPos =
                                                el.getBoundingClientRect().top -
                                                container.getBoundingClientRect().top +
                                                container.scrollTop;
                                              container.scrollTo({
                                                top: Math.max(0, topPos),
                                                behavior: 'smooth'
                                              });
                                            }
                                          }, 40);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition flex items-center justify-between cursor-pointer ${
                                          isSelected
                                            ? 'bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] font-semibold'
                                            : 'text-[var(--color-texto-secundario)] hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)]'
                                        }`}
                                      >
                                        <span className="truncate flex items-center gap-1.5 min-w-0">
                                          <span className="truncate">
                                            {art.display_label || art.label}
                                            {art.title ? ` · ${art.title}` : ''}
                                          </span>
                                          {art.is_innumerado && art.after_article && (
                                            <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)] shrink-0">
                                              {art.innumerado_order || 1} tras Art. {art.after_article}
                                            </span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* LIENZO DERECHO INDEPENDIENTE (Cols 5-12 o 4-12): ARTÍCULOS UNIDOS Y DESPLEGADOS CON TÍTULO STICKY AL HACER SCROLL */}
                <main
                  id="document-sheets-scroll-container"
                  className="col-span-12 md:col-span-8 lg:col-span-9 bg-[var(--color-superficie)] overflow-y-auto p-0 min-h-0"
                >
                  {loading ? (
                    <div className="p-12 text-center text-xs text-[var(--color-texto-secundario)]">
                      Cargando texto normativo consolidado...
                    </div>
                  ) : (ebookNavMode === 'tax' ? taxFilteredArticles : currentArticles).length === 0 ? (
                    <div className="p-12 text-center text-xs text-[var(--color-texto-secundario)]">
                      No hay artículos que coincidan con el filtro actual.
                    </div>
                  ) : (
                    (() => {
                      const visibleArticles =
                        ebookNavMode === 'tax' ? taxFilteredArticles : currentArticles;
                      return (
                        <div className="bg-[var(--color-superficie)] divide-y divide-[var(--color-borde)]">
                          {visibleArticles.map(art => {
                            const isSheetOpen = openArticleSheets[art.label] !== false;
                            const isSourceOpen = Boolean(openArticleSources[art.id]);
                            const isActiveArt = art.label === selectedArticleLabel;
                            const verCount = getArticleVersionsCount(art);
                            const displayContent = art.content;

                            return (
                              <article
                                id={`article-sheet-${art.id}`}
                                key={art.id}
                                className={isActiveArt ? 'bg-[var(--color-superficie-secundaria)]' : 'bg-[var(--color-superficie)]'}
                              >
                                {/* ENCABEZADO DEL ARTÍCULO: STICKY TOP-0 AL RAS SUPERIOR SIN ESPACIOS NI SALTOS */}
                                <div
                                  className={`${
                                    isSheetOpen
                                      ? 'sticky top-0 z-20 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)]'
                                      : 'bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)]'
                                  } px-5 lg:px-7 py-3 flex items-center justify-between gap-3`}
                                >
                                  {/* Botón izquierdo para desplegar / contraer el artículo */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextState = !isSheetOpen;
                                      setSelectedArticleLabel(art.label);
                                      setOpenArticleSheets(prev => ({
                                        ...prev,
                                        [art.label]: nextState
                                      }));
                                    }}
                                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                                  >
                                    <div className="w-6 h-6 rounded-md bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] flex items-center justify-center shrink-0">
                                      {isSheetOpen ? (
                                        <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-extrabold text-[var(--color-texto)] shrink-0">
                                          {art.display_label || art.label}
                                        </span>
                                        {art.title && (
                                          <span
                                            title={art.title}
                                            className="text-xs sm:text-[13px] font-semibold text-[var(--color-texto-secundario)] line-clamp-2 leading-snug"
                                          >
                                            — {art.title}
                                          </span>
                                        )}
                                        {art.is_innumerado && art.after_article && (
                                          <span
                                            title={`Código interno de orden: ${art.identifier || art.label}`}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]"
                                          >
                                            {art.innumerado_order || 1} tras Art. {art.after_article}
                                          </span>
                                        )}
                                        <LegalStatusButton status={art.legal_status} size="sm" />
                                      </div>
                                      {(art.parent_title || art.parent_chapter) && (
                                        <div className="text-[10px] text-[var(--color-texto-secundario)] truncate mt-0.5">
                                          {[art.parent_title, art.parent_chapter]
                                            .filter(Boolean)
                                            .join(' • ')}
                                        </div>
                                      )}
                                    </div>
                                  </button>

                                  {/* COSTADO DERECHO DEL ARTÍCULO: BOTÓN FUENTE Y BOTÓN HISTÓRICO (⏳) */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        const nextSourceState = !isSourceOpen;
                                        if (nextSourceState && !isSheetOpen) {
                                          setSelectedArticleLabel(art.label);
                                          setOpenArticleSheets(prev => ({
                                            ...prev,
                                            [art.label]: true
                                          }));
                                        }
                                        setOpenArticleSources(prev => ({
                                          ...prev,
                                          [art.id]: nextSourceState
                                        }));
                                      }}
                                      title="Desplegar u ocultar fuente, vigencia y opciones del artículo"
                                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                                        isSourceOpen
                                          ? 'bg-[var(--color-superficie-secundaria)] border-[var(--color-secundario-borde)] text-[var(--color-secundario)]'
                                          : 'bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border-[var(--color-borde-fuerte)] text-[var(--color-texto)] hover:text-[var(--color-texto)]'
                                      }`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Fuente</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedArticleLabel(art.label);
                                        setSelectedHistorySubId(null);
                                        setPopupCascadeGroupsOpen({
                                          reglamentos: false,
                                          resoluciones: false,
                                          tablas: false
                                        });
                                        setIsHistoryModalOpen(true);
                                      }}
                                      title="Ver evolución temporal y normativa conexa jerárquica (Pop-up)"
                                      className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde-fuerte)] text-[var(--color-texto)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                    >
                                      <Hourglass className="w-3.5 h-3.5 text-[var(--color-texto)]" />
                                      <span className="hidden sm:inline">Histórico</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] font-mono">
                                        {verCount}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* CUERPO DEL ARTÍCULO (VISIBLE POR DEFECTO SALVO QUE EL USUARIO LO COLAPSE) */}
                                {isSheetOpen && (
                                  <div className="px-5 lg:px-7 py-4 space-y-3 bg-[var(--color-superficie)]">
                                    {/* Metadatos de vigencia y fuente del artículo (solo se despliegan al pulsar el botón "Fuente") */}
                                    {isSourceOpen &&
                                      (() => {
                                        const cleanLawFromCite = art.reform_source_cite
                                          ? art.reform_source_cite
                                              .replace(
                                                /\s*\((?:[^)]*(?:R\.?\s*O\.?|Registro\s+Oficial|Suplemento|Art(?:s|\.|ículo|ículos)?|\.pdf)[^)]*)\)/gi,
                                                ''
                                              )
                                              .replace(
                                                /\s*(?:[-—•,]|:\s*)\s*Art(?:s|\.|ículo|ículos)?\s+\d+[^,)]*$/i,
                                                ''
                                              )
                                              .trim()
                                          : '';
                                        const matchedLaw = findReformTargetNormAndArticle(
                                          art.reform_source_cite,
                                          art.official_registry,
                                          art.norm_id,
                                          [art.id]
                                        );
                                        const matchedLawClean = matchedLaw?.norm?.title
                                          ? matchedLaw.norm.title
                                              .replace(
                                                /\s*\((?:[^)]*(?:R\.?\s*O\.?|Registro\s+Oficial|Suplemento)[^)]*)\)/gi,
                                                ''
                                              )
                                              .trim()
                                          : '';
                                        const rawLawName = cleanLawFromCite || matchedLawClean;
                                        const showLawName =
                                          Boolean(rawLawName) &&
                                          rawLawName.toLowerCase() !==
                                            (art.official_registry || '').trim().toLowerCase();

                                        return (
                                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)]">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] font-mono text-[var(--color-texto)]">
                                                {periodicityLabel(art.tax_periodicity)}:{' '}
                                                {formatValidityRange(
                                                  art.valid_from,
                                                  art.valid_to,
                                                  art.legal_status === 'derogado'
                                                )}
                                              </span>
                                              {art.official_registry && (
                                                <span className="text-[var(--color-texto-secundario)]">
                                                  Fuente: {art.official_registry}
                                                </span>
                                              )}
                                              {showLawName && (
                                                <>
                                                  {art.official_registry && (
                                                    <span className="text-[var(--color-texto-secundario)]">•</span>
                                                  )}
                                                  <span className="text-[var(--color-texto)] font-medium">
                                                    {art.legal_status === 'vigente_reformado' ||
                                                    art.legal_status === 'derogado'
                                                      ? 'Ley modificatoria: '
                                                      : 'Norma: '}
                                                    {rawLawName}
                                                  </span>
                                                </>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const directArtTables = tables.filter(
                                                    t => t.structure_id === art.id || t.emitter_structure_id === art.id
                                                  );
                                                  const hasMdTbl = /\|\s*[^|\n]+\s*\|/.test(displayContent || '');
                                                  const extraTablesText =
                                                    !hasMdTbl && directArtTables.length > 0
                                                      ? `\n\n${directArtTables.map(buildTableMarkdownText).filter(Boolean).join('\n\n')}`
                                                      : '';
                                                  handleCopyCitation(
                                                    `${art.norms?.code || 'LRTI'} ${art.label}${
                                                      art.title ? `: ${art.title}` : ''
                                                    }\n\n${displayContent}${extraTablesText}`
                                                  );
                                                }}
                                                className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto)] flex items-center gap-1 cursor-pointer"
                                              >
                                                <Copy className="w-3 h-3" />
                                                <span>Copiar texto</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenReportModal(art)}
                                                className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] flex items-center gap-1 cursor-pointer"
                                              >
                                                <Flag className="w-3 h-3" />
                                                <span>Reportar observación</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                    {/* Texto normativo vigente del artículo + tablas integradas y salto directo a sección Tablas */}
                                    {(() => {
                                      const directArtTables = tables.filter(
                                        t => t.structure_id === art.id || t.emitter_structure_id === art.id
                                      );
                                      const contentHasMdTable = /\|\s*[^|\n]+\s*\|/.test(displayContent || '');
                                      const fallbackArtTables = !contentHasMdTable ? directArtTables : [];

                                      const handleJumpToArticleTables = () => {
                                        if (directArtTables.length === 0) return;
                                        if (directArtTables.some(t => t.is_active === false)) {
                                          setShowInactiveTablesTab(true);
                                        }
                                        if (directArtTables.some(t => t.is_active !== false)) {
                                          setShowActiveTablesTab(true);
                                        }
                                        const targetGroup = classifyTableTaxGroup(directArtTables[0]).group;
                                        setSelectedTableTaxGroup(targetGroup);
                                        setExpandedIndexGroups(prev => ({ ...prev, [targetGroup]: true }));
                                        const distinctSeries = Array.from(
                                          new Set(directArtTables.map(t => getTableSeriesMeta(t).seriesKey))
                                        );
                                        setSelectedTableSeriesKey(distinctSeries.length === 1 ? distinctSeries[0] : null);
                                        setTableSearchQuery('');
                                        setExpandedTableIds(prev => {
                                          const next = { ...prev };
                                          for (const t of directArtTables) delete next[t.id];
                                          return next;
                                        });
                                        setActiveTab('tables');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      };

                                      return (
                                        <>
                                          <div className="text-sm text-[var(--color-texto)] leading-relaxed space-y-3 w-full text-justify">
                                            {renderMarkdownContent(displayContent)}
                                            {fallbackArtTables.length > 0 && (
                                              <div className="space-y-3 pt-1">
                                                {fallbackArtTables.map(tbl => {
                                                  const grid = getTableDisplayGrid(tbl);
                                                  if (grid.headers.length === 0) return null;
                                                  return (
                                                    <CollapsibleMarkdownTable
                                                      key={tbl.id}
                                                      headers={grid.headers}
                                                      rows={grid.rows}
                                                      caption={tbl.title || tbl.table_code}
                                                      defaultOpen={true}
                                                    />
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>

                                          {directArtTables.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-[var(--color-borde)] flex justify-end">
                                              <button
                                                type="button"
                                                onClick={handleJumpToArticleTables}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--color-secundario-suave)] hover:bg-[var(--color-secundario)]/20 border border-[var(--color-secundario-borde)] text-[11px] font-bold text-[var(--color-secundario)] inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
                                              >
                                                <Table2 className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  Ver en sección Tablas ({directArtTables.length})
                                                </span>
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </main>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: TABLAS TRIBUTARIAS (ÍNDICE LATERAL IZQUIERDO + VISOR DERECHO) */}
      {/* ==================================================================== */}
      {activeTab === 'tables' && (() => {

        // Resuelve con precisión la Resolución o Ley EMISORA que creó/actualizó la tabla y el artículo exacto dentro de ella
        const resolveTableOrigin = (tbl: NormativeTable) => {
          const targetNormId = tbl.emitter_norm_id || tbl.norm_id;
          const targetNorm = norms.find(n => n.id === targetNormId) || null;

          // Artículos renderizables en el lector para la norma emisora
          const normRenderableArticles = structures.filter(
            s =>
              s.norm_id === targetNormId &&
              s.structure_type !== 'title' &&
              s.structure_type !== 'chapter' &&
              !isSubElementType(s.structure_type)
          );
          const normCurrentArticles = normRenderableArticles.filter(s => s.is_current);
          const pool = normCurrentArticles.length > 0 ? normCurrentArticles : normRenderableArticles;

          const preferredStructId = tbl.emitter_structure_id || tbl.article_structure_id || tbl.structure_id;
          const st = preferredStructId ? structures.find(s => s.id === preferredStructId) : undefined;
          const parentArt =
            (st?.parent_id && structures.find(s => s.id === st.parent_id && !isSubElementType(s.structure_type))) ||
            (st && !isSubElementType(st.structure_type) ? st : undefined);

          let targetArt: NormStructure | undefined;
          if (parentArt && parentArt.norm_id === targetNormId) {
            const pCode = extractArticleCode(parentArt.label, parentArt.identifier);
            targetArt =
              pool.find(a => a.id === parentArt.id) ||
              (pCode ? pool.find(a => extractArticleCode(a.label, a.identifier) === pCode) : undefined) ||
              pool.find(a => (a.label || '').trim().toLowerCase() === (parentArt.label || '').trim().toLowerCase()) ||
              parentArt;
          } else if (pool.length > 0) {
            // Si no se encontró por ID directo, elegir el artículo que contiene la tabla en la norma emisora
            targetArt = pool.find(a => (a.content || '').includes('|')) || pool[0];
          }

          const normShort = tbl.emitter_norm_code || targetNorm?.code || targetNorm?.title || 'la norma emisora';
          const artShort = targetArt?.display_label || targetArt?.label || '';
          const buttonLabel = artShort
            ? `Ver ${artShort} en ${normShort}`
            : `Ver norma emisora (${normShort})`;

          const emitterHeading =
            tbl.emitter_norm_title ||
            (targetNorm ? `${targetNorm.title}` : tbl.subtitle || '');

          return { targetNorm, targetArt, buttonLabel, emitterHeading };
        };

        const handleNavigateToTableOrigin = (tbl: NormativeTable) => {
          const { targetNorm, targetArt } = resolveTableOrigin(tbl);
          if (!targetNorm && !targetArt) return;

          if (targetNorm) {
            setSelectedNormId(targetNorm.id);
          }
          // Limpiar filtros del lector para garantizar que el artículo destino sea visible
          setSelectedConceptId(null);
          setSelectedTaxFilter('ALL');
          setStatusFilter('all');
          setSearchQuery('');
          setSearchValidFrom('');
          setSearchValidTo('');
          setEbookNavMode('index');
          setIsHistoryModalOpen(false);

          if (targetArt) {
            setSelectedArticleLabel(targetArt.label);
            setOpenArticleSheets(prev => ({ ...prev, [targetArt.label]: true }));
          }
          setActiveTab('reader');
          setReaderSubView('document');

          if (targetArt) {
            const scrollToArt = () => {
              const container = document.getElementById('document-sheets-scroll-container');
              const el = document.getElementById(`article-sheet-${targetArt.id}`);
              if (container && el) {
                const topPos =
                  el.getBoundingClientRect().top -
                  container.getBoundingClientRect().top +
                  container.scrollTop;
                container.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
                return true;
              }
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
              }
              return false;
            };
            setTimeout(() => {
              if (!scrollToArt()) {
                setTimeout(scrollToArt, 300);
              }
            }, 140);
          }
        };

        const q = tableSearchQuery.trim().toLowerCase();

        // Filtrar respetando siempre vigentes e históricas según los interruptores activos
        const filteredTables = tables
          .filter(t => {
            const isActive = t.is_active !== false;
            if (isActive && !showActiveTablesTab) return false;
            if (!isActive && !showInactiveTablesTab) return false;
            if (q) {
              const hay = `${t.title || ''} ${t.subtitle || ''} ${t.table_code || ''} ${t.fiscal_year || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            const ca = classifyTableTaxGroup(a);
            const cb = classifyTableTaxGroup(b);
            const actA = a.is_active !== false ? 1 : 0;
            const actB = b.is_active !== false ? 1 : 0;
            // En Impuesto a la Renta: vigentes siempre primero (con Personas Naturales #1 y Herencias #2 ancladas),
            // y luego históricas ordenadas por año fiscal descendente
            if (actA !== actB) return actB - actA;
            if (ca.pinRank !== cb.pinRank) return ca.pinRank - cb.pinRank;
            if ((b.fiscal_year || 0) !== (a.fiscal_year || 0)) return (b.fiscal_year || 0) - (a.fiscal_year || 0);
            return (a.title || '').localeCompare(b.title || '', 'es');
          });

        const tablesByGroup = new Map<string, NormativeTable[]>();
        for (const g of TABLE_TAX_GROUPS) {
          tablesByGroup.set(g.key, []);
        }
        for (const tbl of filteredTables) {
          const { group: gKey } = classifyTableTaxGroup(tbl);
          const arr = tablesByGroup.get(gKey) || [];
          arr.push(tbl);
          tablesByGroup.set(gKey, arr);
        }

        // Construir las entradas únicas (series) por tributo para el menú lateral izquierdo
        type SeriesIndexEntry = {
          seriesKey: string;
          displayLabel: string;
          pinRank: number;
          items: NormativeTable[];
          hasActive: boolean;
          latestYear: number | null;
        };

        const seriesByGroup = new Map<string, SeriesIndexEntry[]>();
        const allSeriesMap = new Map<string, SeriesIndexEntry>();

        for (const g of TABLE_TAX_GROUPS) {
          const items = tablesByGroup.get(g.key) || [];
          const localMap = new Map<string, SeriesIndexEntry>();

          for (const tbl of items) {
            const { pinRank } = classifyTableTaxGroup(tbl);
            const { seriesKey, displayLabel } = getTableSeriesMeta(tbl);
            const existing = localMap.get(seriesKey);
            if (existing) {
              existing.items.push(tbl);
              if (tbl.is_active !== false) existing.hasActive = true;
              if ((tbl.fiscal_year || 0) > (existing.latestYear || 0)) {
                existing.latestYear = tbl.fiscal_year || existing.latestYear;
              }
            } else {
              const entry: SeriesIndexEntry = {
                seriesKey,
                displayLabel,
                pinRank,
                items: [tbl],
                hasActive: tbl.is_active !== false,
                latestYear: tbl.fiscal_year || null
              };
              localMap.set(seriesKey, entry);
              allSeriesMap.set(seriesKey, entry);
            }
          }

          // Dentro de cada serie: vigente(s) siempre arriba del todo, seguidas por históricas ordenadas por año descendente
          const orderedEntries = Array.from(localMap.values()).map(entry => {
            entry.items.sort((a, b) => {
              const actA = a.is_active !== false ? 1 : 0;
              const actB = b.is_active !== false ? 1 : 0;
              if (actA !== actB) return actB - actA;
              if ((b.fiscal_year || 0) !== (a.fiscal_year || 0)) return (b.fiscal_year || 0) - (a.fiscal_year || 0);
              return (a.table_code || '').localeCompare(b.table_code || '');
            });
            return entry;
          });

          orderedEntries.sort((a, b) => {
            if (a.hasActive !== b.hasActive) return a.hasActive ? -1 : 1;
            if (a.pinRank !== b.pinRank) return a.pinRank - b.pinRank;
            return a.displayLabel.localeCompare(b.displayLabel, 'es');
          });

          seriesByGroup.set(g.key, orderedEntries);
        }

        const visibleGroups = TABLE_TAX_GROUPS.filter(g => (tablesByGroup.get(g.key) || []).length > 0);

        const activeGroupMeta = selectedTableTaxGroup
          ? TABLE_TAX_GROUPS.find(g => g.key === selectedTableTaxGroup) || null
          : null;
        const activeGroupTables = selectedTableTaxGroup ? (tablesByGroup.get(selectedTableTaxGroup) || []) : [];
        const activeSeriesEntry = selectedTableSeriesKey ? allSeriesMap.get(selectedTableSeriesKey) || null : null;

        // Las tablas se muestran descolapsadas por defecto, con opción de colapsarlas individualmente o en bloque.
        const rightPanelTables = activeSeriesEntry ? activeSeriesEntry.items : activeGroupTables;
        const anyExpandedInRightPanel = rightPanelTables.some(t => expandedTableIds[t.id] !== false);
        const anyCollapsedInRightPanel = rightPanelTables.some(t => expandedTableIds[t.id] === false);

        // Interruptores independientes: activar Históricas NUNCA apaga Vigentes; solo se apaga uno si el usuario desmarca ese mismo botón (y nunca quedan ambos apagados a la vez)
        const toggleActiveFilter = () => {
          if (showActiveTablesTab && !showInactiveTablesTab) {
            return; // Mantener al menos un filtro encendido
          }
          setShowActiveTablesTab(prev => !prev);
        };

        const toggleInactiveFilter = () => {
          if (showInactiveTablesTab && !showActiveTablesTab) {
            return; // Mantener al menos un filtro encendido
          }
          setShowInactiveTablesTab(prev => !prev);
        };

        const renderTableCard = (tbl: NormativeTable) => {
          const isExpanded = expandedTableIds[tbl.id] !== false;
          const isActive = tbl.is_active !== false;
          const { pinRank } = classifyTableTaxGroup(tbl);
          const isPinnedMain = isActive && (pinRank === 1 || pinRank === 2);
          const originInfo = resolveTableOrigin(tbl);

          return (
            <div
              key={tbl.id}
              className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden shadow-md transition"
            >
              {/* Cabecera clicable de la tarjeta (desplegada por defecto con opción de colapsar) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedTableIds(prev => ({
                    ...prev,
                    [tbl.id]: prev[tbl.id] === false ? true : false
                  }))
                }
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedTableIds(prev => ({
                      ...prev,
                      [tbl.id]: prev[tbl.id] === false ? true : false
                    }));
                  }
                }}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-superficie-hover)] transition cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 mt-0.5 rounded-md bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] flex items-center justify-center shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPinnedMain && (
                        <Star className="w-3.5 h-3.5 text-[var(--color-aviso)] fill-[var(--color-aviso)] shrink-0" />
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isActive ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]' : 'bg-amber-600/85 text-white'
                        }`}
                      >
                        {isActive ? 'Vigente' : 'Histórica / Derogada'}
                      </span>
                      {tbl.fiscal_year && (
                        <span className="px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[10px] font-mono font-bold text-[var(--color-texto)]">
                          Año {tbl.fiscal_year}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[var(--color-texto-secundario)]">
                        {tbl.table_code}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-extrabold text-[var(--color-texto)] mt-1 leading-snug">
                      {tbl.title}
                    </h3>
                    {originInfo.emitterHeading ? (
                      <p className="text-xs text-[var(--color-texto-secundario)] mt-0.5">
                        <span className="font-semibold text-[var(--color-texto)]">Emitida por:</span>{' '}
                        {originInfo.emitterHeading}
                      </p>
                    ) : tbl.subtitle ? (
                      <p className="text-xs text-[var(--color-texto-secundario)] mt-0.5">{tbl.subtitle}</p>
                    ) : null}
                  </div>
                </div>

                <span className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[11px] font-bold text-[var(--color-texto)] shrink-0 flex items-center gap-1.5">
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Colapsar tabla</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Desplegar tabla</span>
                    </>
                  )}
                </span>
              </div>

              {/* Contenido desplegable de la tabla */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 border-t border-[var(--color-borde)] space-y-4 bg-[var(--color-superficie)]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded bg-[var(--color-superficie-secundaria)] border border-[var(--color-secundario-borde)] text-[var(--color-secundario)] text-[11px] font-mono font-bold">
                      Vigencia Art. 11 CT ({tbl.fiscal_year}): {formatEffectiveRange(tbl.effective_during, tbl.fiscal_year)}
                    </span>
                    {(originInfo.targetNorm || originInfo.targetArt) && (
                      <button
                        type="button"
                        onClick={() => handleNavigateToTableOrigin(tbl)}
                        className="btn-chess-dark px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{originInfo.buttonLabel}</span>
                      </button>
                    )}
                  </div>

                  <div className="w-full flex justify-center">
                    <div className="w-fit max-w-full overflow-x-auto rounded-xl border border-[var(--color-borde)]">
                      <table className="w-auto max-w-full text-left text-xs">
                        <thead className="bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] uppercase text-[11px]">
                          <tr>
                            {tbl.columns_schema.map(col => (
                              <th key={col.key} className={`py-3 px-4 font-extrabold ${getAdaptiveCellClass(col.label, true)}`}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-borde)] bg-[var(--color-fondo)]">
                          {tbl.rows_data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[var(--color-superficie-hover)]">
                              {tbl.columns_schema.map(col => {
                                const val = row[col.key];
                                const displayVal =
                                  val === null
                                    ? 'En adelante'
                                    : col.type === 'currency'
                                      ? `USD ${Number(val).toLocaleString('en-US', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}`
                                      : col.type === 'percentage'
                                        ? `${val}%`
                                        : val;
                                return (
                                  <td
                                    key={col.key}
                                    className={`py-2.5 px-4 font-medium text-[var(--color-texto)] ${getAdaptiveCellClass(displayVal)}`}
                                  >
                                    {displayVal}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {tbl.notes && (
                    <div className="text-xs text-[var(--color-texto-secundario)] bg-[var(--color-superficie)] p-3 rounded-lg border border-[var(--color-borde)]">
                      <strong className="text-[var(--color-secundario)]">Base Legal:</strong> {tbl.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5">
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* ========================================================== */}
              {/* MENÚ ÍNDICE LATERAL IZQUIERDO (TRIBUTOS Y TABLAS)          */}
              {/* ========================================================== */}
              <aside className="w-full lg:w-80 xl:w-96 shrink-0 bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl overflow-hidden shadow-lg lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-6.5rem)]">
                <div className="p-4 border-b border-[var(--color-borde)] space-y-3 bg-[var(--color-superficie)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-[var(--color-secundario)]" />
                      <h2 className="font-heading text-sm font-black text-[var(--color-texto)]">
                        Índice de Tablas
                      </h2>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[10px] font-bold text-[var(--color-texto-secundario)]">
                      {filteredTables.length} disponibles
                    </span>
                  </div>

                  {/* Interruptores combinables: Vigentes y/o Históricas-Derogadas */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={toggleActiveFilter}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition ${
                          showActiveTablesTab
                            ? 'bg-[var(--color-secundario-suave)] border-[var(--color-secundario)] text-[var(--color-secundario)]'
                            : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Vigentes</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleInactiveFilter}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition ${
                          showInactiveTablesTab
                            ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                            : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span>Históricas / Derog.</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-[var(--color-texto-secundario)] text-center">
                      Mostrando:{' '}
                      <strong className="text-[var(--color-texto-secundario)]">
                        {showActiveTablesTab && showInactiveTablesTab
                          ? 'Vigentes + Históricas'
                          : showActiveTablesTab
                            ? 'Solo vigentes'
                            : 'Solo históricas / derogadas'}
                      </strong>
                    </div>
                  </div>

                  {/* Buscador rápido del índice */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={tableSearchQuery}
                      onChange={e => setTableSearchQuery(e.target.value)}
                      placeholder="Filtrar por nombre, impuesto o año..."
                      className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-xs text-[var(--color-texto)] placeholder:text-[var(--color-texto-secundario)] focus:outline-none focus:border-[var(--color-secundario)]"
                    />
                    {tableSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTableSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Árbol limpio de Tributos -> Tablas directas (sin subcategorías intermedias) */}
                <nav className="overflow-y-auto p-2.5 space-y-1 flex-1">
                  {visibleGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--color-texto-secundario)]">
                      No hay tablas que coincidan con el filtro actual.
                    </div>
                  ) : (
                    visibleGroups.map(group => {
                      const groupItems = tablesByGroup.get(group.key) || [];
                      const groupSeries = seriesByGroup.get(group.key) || [];
                      const isGroupSelected = selectedTableTaxGroup === group.key;
                      const isGroupOpen = Boolean(expandedIndexGroups[group.key]) || Boolean(q);

                      return (
                        <div key={group.key} className="rounded-xl overflow-hidden">
                          {/* Fila del Tributo en el índice */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTableTaxGroup(group.key);
                              setSelectedTableSeriesKey(null);
                              setExpandedIndexGroups(prev => ({
                                ...prev,
                                [group.key]: !prev[group.key]
                              }));
                            }}
                            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                              isGroupSelected && !selectedTableSeriesKey
                                ? 'bg-[var(--color-secundario-suave)] border border-[var(--color-secundario-borde)] text-[var(--color-texto)]'
                                : 'hover:bg-[var(--color-superficie-hover)] border border-transparent text-[var(--color-texto)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isGroupOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-texto-secundario)] shrink-0" />
                              )}
                              <span className="text-xs font-extrabold truncate">
                                {group.label}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[10px] font-mono font-bold text-[var(--color-texto-secundario)] shrink-0">
                              {groupItems.length}
                            </span>
                          </button>

                          {/* Lista directa de tablas/series del tributo (en Impuesto a la Renta: Personas Naturales y Herencias ancladas arriba con ★) */}
                          {isGroupOpen && (
                            <div className="mt-1 ml-4 pl-2.5 border-l border-[var(--color-borde)] space-y-0.5 pb-1">
                              {groupSeries.map(series => {
                                const isSeriesSelected = selectedTableSeriesKey === series.seriesKey;
                                const isPinned = series.pinRank === 1 || series.pinRank === 2;
                                const histCount = series.items.filter(t => t.is_active === false).length;

                                return (
                                  <button
                                    key={series.seriesKey}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTableTaxGroup(group.key);
                                      setSelectedTableSeriesKey(series.seriesKey);
                                      // Asegurar que las tarjetas de la serie inicien desplegadas por defecto al seleccionarla desde el índice
                                      setExpandedTableIds(prev => {
                                        const next = { ...prev };
                                        for (const t of series.items) delete next[t.id];
                                        return next;
                                      });
                                    }}
                                    className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer flex items-start gap-2 ${
                                      isSeriesSelected
                                        ? 'bg-[var(--color-secundario-suave)] text-[var(--color-texto)] font-bold border border-[var(--color-secundario-borde)]'
                                        : 'text-[var(--color-texto-secundario)] hover:bg-[var(--color-superficie-hover)] hover:text-[var(--color-texto)] border border-transparent'
                                    }`}
                                  >
                                    {isPinned ? (
                                      <Star className="w-3 h-3 text-[var(--color-aviso)] fill-[var(--color-aviso)] mt-1 shrink-0" />
                                    ) : (
                                      <span
                                        title={series.hasActive ? 'Vigente' : 'Histórica / Derogada'}
                                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                          series.hasActive ? 'bg-[var(--color-secundario)]' : 'bg-amber-500'
                                        }`}
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className={`text-[11px] leading-snug line-clamp-2 ${isPinned ? 'font-bold text-[var(--color-texto)]' : ''}`}>
                                        {series.displayLabel}
                                      </div>
                                      <div className="text-[10px] text-[var(--color-texto-secundario)] font-mono mt-0.5">
                                        {series.hasActive
                                          ? histCount > 0
                                            ? `Vigente${series.latestYear ? ` ${series.latestYear}` : ''} + ${histCount} hist.`
                                            : `Vigente${series.latestYear ? ` ${series.latestYear}` : ''}`
                                          : `${series.items.length} ${series.items.length === 1 ? 'histórica' : 'históricas'}`}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </nav>

                {/* Acceso a calculadoras en el pie del índice */}
                <div className="p-3 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('calculators')}
                    className="btn-chess-green w-full px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Abrir Calculadoras Conectadas</span>
                  </button>
                </div>
              </aside>

              {/* ========================================================== */}
              {/* PANTALLA DERECHA LIBRE (TARJETAS DE TABLAS SELECCIONADAS)  */}
              {/* ========================================================== */}
              <section className="flex-1 min-w-0 w-full space-y-4">
                {!activeGroupMeta && !activeSeriesEntry ? (
                  <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-10 text-center space-y-3 shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] flex items-center justify-center mx-auto">
                      <Table2 className="w-6 h-6 text-[var(--color-secundario)]" />
                    </div>
                    <h1 className="font-heading text-xl font-black text-[var(--color-texto)]">
                      Tablas Tributarias del Ecuador
                    </h1>
                    <p className="text-xs text-[var(--color-texto-secundario)] max-w-lg mx-auto leading-relaxed">
                      Usa el índice de la izquierda para elegir un tributo o seleccionar directamente una tabla específica.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cabecera contextual del tributo / serie elegida */}
                    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-secundario)]">
                            {activeGroupMeta?.label || 'Tablas'}
                            {activeSeriesEntry ? ` › ${activeSeriesEntry.displayLabel}` : ''}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[10px] font-bold text-[var(--color-texto-secundario)]">
                            {rightPanelTables.length} {rightPanelTables.length === 1 ? 'tabla' : 'tablas'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-texto-secundario)] mt-0.5">
                          {activeSeriesEntry
                            ? showInactiveTablesTab
                              ? 'Tabla vigente arriba y sus versiones históricas debajo. Puedes colapsar cada tabla desde su cabecera.'
                              : 'Tablas desplegadas automáticamente; puedes colapsarlas individualmente o activar "Históricas / Derog." en el índice.'
                            : activeGroupMeta?.shortDesc || 'Tablas desplegadas automáticamente; haz clic en la cabecera de cualquier tarjeta para colapsarla.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeSeriesEntry && activeGroupMeta && (
                          <button
                            type="button"
                            onClick={() => setSelectedTableSeriesKey(null)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                              Ver todas en {activeGroupMeta.label} ({activeGroupTables.length})
                            </span>
                          </button>
                        )}
                        {anyCollapsedInRightPanel && (
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedTableIds(prev => {
                                const next = { ...prev };
                                for (const t of rightPanelTables) delete next[t.id];
                                return next;
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Desplegar todas</span>
                          </button>
                        )}
                        {anyExpandedInRightPanel && (
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedTableIds(prev => {
                                const next = { ...prev };
                                for (const t of rightPanelTables) next[t.id] = false;
                                return next;
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>Contraer todas</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tarjetas colapsadas de la tabla/serie elegida (o de todo el tributo si eligió la categoría padre) */}
                    {rightPanelTables.length === 0 ? (
                      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-8 text-center text-xs text-[var(--color-texto-secundario)]">
                        No hay tablas visibles con el filtro de vigencia actual. Activa &ldquo;Históricas / Derog.&rdquo; en el índice izquierdo para ver años anteriores.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {rightPanelTables.map(tbl => renderTableCard(tbl))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* TAB 3: CALCULADORAS TRIBUTARIAS INTERACTIVAS (PLAN PLUS $9.99)       */}
      {/* ==================================================================== */}
      {activeTab === 'calculators' && (
        <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
          {currentPlan !== 'professional' && (
            <div className="bg-[var(--color-superficie)] border-2 border-[var(--color-aviso)] rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-[var(--color-aviso)]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--color-texto)]">
                    Calculadoras Tributarias Exclusivas del Plan Plus (USD 9.99/mes)
                  </h3>
                  <p className="text-xs text-[var(--color-texto-secundario)]">
                    Activa la vista del Plan Plus para usar todas las calculadoras conectadas en
                    tiempo real a public.normative_tables.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentPlan('professional')}
                className="btn-chess-green px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Simular Plan Plus ($9.99)
              </button>
            </div>
          )}

          <div
            className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${currentPlan !== 'professional' ? 'opacity-50 pointer-events-none' : ''
              }`}
          >
            {/* CALCULADORA 1: IMPUESTO A LA RENTA PERSONAS NATURALES + REBAJA GASTOS PERSONALES */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-borde)] pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]">
                      Art. 36 y Art. 10 LRTI
                    </span>
                    <h3 className="font-heading text-base font-extrabold text-[var(--color-texto)] mt-1">
                      1. Impuesto a la Renta PN + Rebaja Gastos Personales
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                      Ingresos Gravados Anuales (USD)
                    </label>
                    <input
                      type="number"
                      value={calcIncome}
                      onChange={e => setCalcIncome(Number(e.target.value))}
                      className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                      Aporte IESS y Deducciones de Ley (USD)
                    </label>
                    <input
                      type="number"
                      value={calcDeductions}
                      onChange={e => setCalcDeductions(Number(e.target.value))}
                      className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                        Gastos Personales (USD)
                      </label>
                      <input
                        type="number"
                        value={calcPersonalExpenses}
                        onChange={e => setCalcPersonalExpenses(Number(e.target.value))}
                        className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                        Cargas Familiares (0 a 5+)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={calcFamilyLoads}
                        onChange={e => setCalcFamilyLoads(Number(e.target.value))}
                        className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-superficie)] rounded-xl p-4 border border-[var(--color-borde)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Base Imponible Gravada:</span>
                  <span className="font-bold">USD {irCalculation.baseImponible.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Tramo Art. 36 Aplicado:</span>
                  <span className="font-bold text-[var(--color-aviso)]">
                    FB USD {irCalculation.fraccionBasica} ({irCalculation.tarifaExcedente}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Impuesto Causado:</span>
                  <span className="font-bold">USD {irCalculation.impuestoCausado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-secundario)]">
                  <span>(-) Rebaja Gastos Personales (18%):</span>
                  <span className="font-bold">- USD {irCalculation.rebajaGastos.toFixed(2)}</span>
                </div>
                <div className="border-t border-[var(--color-borde)] pt-2 flex justify-between text-sm font-black">
                  <span>Impuesto Neto a Pagar (Form 102):</span>
                  <span className="text-[var(--color-secundario)]">
                    USD {irCalculation.impuestoPagar.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* CALCULADORA 2: RIMPE EMPRENDEDOR Y NEGOCIO POPULAR */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-[var(--color-borde)] pb-3">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]">
                    Art. 97.6 LRTI
                  </span>
                  <h3 className="font-heading text-base font-extrabold text-[var(--color-texto)] mt-1">
                    2. Calculadora RIMPE Emprendedor / Negocio Popular
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                      Ingresos Brutos Anuales (USD 0 a USD 300,000)
                    </label>
                    <input
                      type="number"
                      value={calcRimpeIncome}
                      onChange={e => setCalcRimpeIncome(Number(e.target.value))}
                      className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-texto-secundario)]">
                    Hasta USD 20,000 califica como RIMPE Negocio Popular. De USD 20,000.01 a USD
                    300,000 tributa con la tabla progresiva de RIMPE Emprendedor.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--color-superficie)] rounded-xl p-4 border border-[var(--color-borde)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Régimen Aplicable:</span>
                  <span className="font-bold text-[var(--color-secundario)]">
                    {calcRimpeIncome <= 20000
                      ? 'RIMPE Negocio Popular'
                      : calcRimpeIncome <= 300000
                        ? 'RIMPE Emprendedor'
                        : 'Régimen General (> $300k)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Tipo Marginal sobre Excedente:</span>
                  <span className="font-bold text-[var(--color-aviso)]">
                    {rimpeCalculation.marginalRate}%
                  </span>
                </div>
                <div className="border-t border-[var(--color-borde)] pt-2 flex justify-between text-sm font-black">
                  <span>Impuesto RIMPE Causado:</span>
                  <span className="text-[var(--color-secundario)]">
                    USD {rimpeCalculation.impuestoTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* CALCULADORA 3: RETENCIÓN EN DISTRIBUCIÓN DE DIVIDENDOS */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-[var(--color-borde)] pb-3">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)]">
                    Art. 37 LRTI + Anexo ADI
                  </span>
                  <h3 className="font-heading text-base font-extrabold text-[var(--color-texto)] mt-1">
                    3. Retención de Dividendos Societarios
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[var(--color-texto-secundario)] mb-1 font-bold">
                      Dividendo Distribuido al Accionista Residente (USD)
                    </label>
                    <input
                      type="number"
                      value={calcDividendAmount}
                      onChange={e => setCalcDividendAmount(Number(e.target.value))}
                      className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-texto-secundario)]">
                    El ingreso gravado corresponde al 40% del dividendo efectivamente distribuido,
                    aplicando la tabla progresiva de retención en la fuente.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--color-superficie)] rounded-xl p-4 border border-[var(--color-borde)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Dividendo Gravado (40%):</span>
                  <span className="font-bold">
                    USD {dividendCalculation.dividendoGravado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-texto-secundario)]">Tarifa Marginal Aplicada:</span>
                  <span className="font-bold text-[var(--color-aviso)]">{dividendCalculation.rate}%</span>
                </div>
                <div className="border-t border-[var(--color-borde)] pt-2 flex justify-between text-sm font-black">
                  <span>Retención a Practicar (Form 103):</span>
                  <span className="text-[var(--color-secundario)]">
                    USD {dividendCalculation.retencion.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: CHATBOT IA CON LÍMITE DE 100 CONSULTAS MENSUALES              */}
      {/* ==================================================================== */}
      {activeTab === 'chat' && (
        <div className="max-w-4xl mx-auto w-full p-6 flex-1 flex flex-col">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl flex-1 flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 bg-[var(--color-superficie)] border-b border-[var(--color-borde)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[var(--color-secundario)]" />
                <div>
                  <h2 className="text-sm font-extrabold text-[var(--color-texto)]">
                    Asistente Jurídico-Tributario SmartLex IA (Google Gemini RAG)
                  </h2>
                  <p className="text-[11px] text-[var(--color-texto-secundario)]">
                    Conectado a Código Tributario, LRTI, RLRTI y Tablas 2026
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[var(--color-fondo)] border border-[var(--color-secundario)] text-[var(--color-secundario)]">
                  {chatUsed} / 100 consultas usadas este mes
                </span>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${m.role === 'user'
                      ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] font-semibold'
                      : 'bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]'
                      }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-4 bg-[var(--color-superficie)] border-t border-[var(--color-borde)] flex items-center gap-3"
            >
              <input
                type="text"
                disabled={currentPlan !== 'professional'}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={
                  currentPlan === 'professional'
                    ? 'Pregunta sobre deducciones, retenciones, casilleros o vigencia de artículos...'
                    : 'El Chatbot IA requiere Plan Plus (USD 9.99/mes)'
                }
                className="flex-1 bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-texto)] outline-none focus:border-[var(--color-secundario)]"
              />
              <button
                type="submit"
                disabled={currentPlan !== 'professional'}
                className="btn-chess-green px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Consultar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: BANDEJA DE CONTROL DE CALIDAD Y DISCREPANCIAS NOTIFICADAS    */}
      {/* ==================================================================== */}
      {activeTab === 'reviewer' && (
        <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase text-[var(--color-secundario)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--color-secundario)]" />
                Auditoría Colaborativa • Control de Calidad Humano
              </span>
              <h1 className="font-heading text-xl font-black text-[var(--color-texto)] mt-1">
                Bandeja de Discrepancias y Reportes Notificados
              </h1>
              <p className="text-xs text-[var(--color-texto-secundario)]">
                Los artículos extraídos por la IA se publican directamente en producción. Aquí los revisores auditan y corrigen puntualmente las incidencias y sugerencias reportadas por los usuarios.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-chess-green px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-bold shadow-md"
              >
                <Plus className="w-4 h-4" /> Nueva Ingesta de Norma (PDF)
              </button>
              <button
                onClick={fetchAllData}
                className="btn-chess-dark px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Actualizar Bandeja
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Discrepancias Reportadas por Usuarios */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[var(--color-texto)] flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[var(--color-error)]" />
                  <span>Discrepancias Notificadas por Usuarios ({discrepancies.filter(d => d.status === 'pending').length})</span>
                </h3>
                <span className="text-[11px] text-[var(--color-texto-secundario)]">
                  Total histórico: {discrepancies.length}
                </span>
              </div>

              {discrepancies.filter(d => d.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-secundario)] bg-[var(--color-superficie)] border border-[var(--color-secundario-borde)] rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-secundario-suave)] text-[var(--color-secundario)] flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-[var(--color-texto)] text-sm">¡Sin discrepancias pendientes!</p>
                  <p className="text-[var(--color-texto-secundario)]">
                    Todo el repositorio normativo se encuentra sin errores o inconsistencias reportadas por los usuarios.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discrepancies
                    .filter(d => d.status === 'pending')
                    .map(disc => {
                      const meta = FEEDBACK_TYPE_META[disc.feedback_type] || {
                        label: disc.feedback_type,
                        badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
                        icon: '⚠️'
                      };
                      return (
                        <div
                          key={disc.id}
                          className="bg-[var(--color-superficie)] border border-[var(--color-error-borde)] rounded-xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-[var(--color-texto)] flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--color-secundario-suave)] text-[var(--color-secundario)] border border-[var(--color-secundario-borde)]">
                                {disc.article_label}
                              </span>
                              <span>{disc.article_title || ''}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-xs text-[var(--color-texto)] leading-relaxed">
                            <strong className="text-[var(--color-aviso)]">Observación del usuario: </strong>
                            "{disc.user_comment}"
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[var(--color-texto-secundario)] flex-wrap gap-2 pt-1 border-t border-[var(--color-borde)]">
                            <div className="flex items-center gap-2">
                              <span>📅 {disc.created_at ? new Date(disc.created_at).toLocaleDateString() : 'Hoy'}</span>
                              {disc.user_email && (
                                <span>• 👤 {disc.user_email}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedArticleLabel(disc.article_label);
                                  setActiveTab('reader');
                                }}
                                className="px-2.5 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] border border-[var(--color-borde)] transition cursor-pointer text-[11px] font-semibold"
                              >
                                Ver artículo
                              </button>
                              <button
                                onClick={() => handleResolveDiscrepancy(disc.id)}
                                className="btn-chess-green px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Resuelto
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Historial de reportes resueltos */}
              {discrepancies.some(d => d.status === 'resolved') && (
                <div className="pt-3 border-t border-[var(--color-borde)]">
                  <span className="text-[11px] font-bold text-[var(--color-texto-secundario)] block mb-2">
                    ✓ Discrepancias Resueltas ({discrepancies.filter(d => d.status === 'resolved').length}):
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {discrepancies
                      .filter(d => d.status === 'resolved')
                      .map(d => (
                        <div
                          key={d.id}
                          className="p-2 rounded-lg bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] text-[11px] flex items-center justify-between text-[var(--color-texto-secundario)]"
                        >
                          <span className="font-semibold text-[var(--color-texto)] truncate max-w-xs">
                            {d.article_label}: {d.user_comment}
                          </span>
                          <span className="text-[10px] text-[var(--color-secundario)] font-bold shrink-0">Resuelto</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Norm Discovery Queue */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-[var(--color-texto)]">
                Radar de Normas Citadas Aún No Cargadas (public.norm_discovery)
              </h3>
              <p className="text-xs text-[var(--color-texto-secundario)]">
                Cuando una reforma menciona una Ley o Resolución que aún no está en las 7 carpetas
                de Google Drive / Supabase Storage, el agente la registra aquí automáticamente:
              </p>

              <div className="space-y-3">
                {discoveries.map(d => (
                  <div
                    key={d.id}
                    className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[var(--color-secundario)]">
                        {d.referenced_code} — {d.referenced_title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-aviso-fondo)] text-[var(--color-aviso)]">
                        Estado: {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-texto-secundario)]">
                      Cita detectada: &ldquo;{d.citation_context}&rdquo;
                    </p>
                    <p className="text-[11px] text-[var(--color-texto-secundario)]">
                      Subir PDF a Google Drive en: <code>04_leyes_reformas/</code> para completar el
                      grafo.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: AGREGAR NUEVO CONCEPTO AL EJE VERTICAL                        */}
      {/* ==================================================================== */}
      {showAddConceptModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-heading text-lg font-black text-[var(--color-texto)]">
              Expandir Eje Vertical (Nuevo Concepto Tributario)
            </h3>
            <p className="text-xs text-[var(--color-texto-secundario)]">
              La arquitectura de SmartLex es 100% dinámica: cualquier concepto agregado aquí se
              guarda en <code>public.tax_concepts</code> sin tocar código.
            </p>
            <form onSubmit={handleAddConcept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">Código Único</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PRECIOS_TRANSFERENCIA"
                  value={newConceptCode}
                  onChange={e => setNewConceptCode(e.target.value)}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)]"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">Nombre Visible</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Precios de Transferencia y Partes Relacionadas"
                  value={newConceptName}
                  onChange={e => setNewConceptName(e.target.value)}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)]"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción breve del eje vertical"
                  value={newConceptDesc}
                  onChange={e => setNewConceptDesc(e.target.value)}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddConceptModal(false)}
                  className="btn-chess-dark px-4 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-chess-green px-4 py-2 rounded-lg text-xs">
                  Guardar en Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SUSCRIPCIÓN PLACETOPAY + ALERTAS WHATSAPP NOVENO DÍGITO RUC   */}
      {/* ==================================================================== */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-borde)] pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-[var(--color-secundario)]">
                  Pasarela WebCheckout PlacetoPay + WhatsApp Cloud API
                </span>
                <h2 className="font-heading text-xl font-black text-[var(--color-texto)]">
                  Planes SmartLex Ecuador y Perfil de Alertas Tributarias
                </h2>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="btn-chess-dark px-3 py-1.5 rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>

            {/* WhatsApp & 9th RUC Digit Config */}
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">
                  WhatsApp para Alertas y Link de Pago
                </label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">
                  9no Dígito del RUC (Calendario SRI)
                </label>
                <select
                  value={rucNinthDigit}
                  onChange={e => setRucNinthDigit(Number(e.target.value))}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => (
                    <option key={d} value={d}>
                      Dígito {d} (Vence el día {d === 0 ? 28 : 8 + d * 2} de cada mes)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[var(--color-texto-secundario)] mb-1">
                  Tipo de Contribuyente
                </label>
                <select
                  value={selectedTaxpayerType}
                  onChange={e => setSelectedTaxpayerType(e.target.value)}
                  className="w-full bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-lg px-3 py-2 text-[var(--color-texto)] font-bold"
                >
                  {taxpayerTypes.map(t => (
                    <option key={t.id} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* FREE */}
              <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-[var(--color-texto-secundario)]">Plan Gratuito</span>
                  <div className="text-2xl font-black text-[var(--color-texto)] mt-1">USD 0.00</div>
                  <ul className="mt-4 space-y-2 text-xs text-[var(--color-texto-secundario)]">
                    <li>✓ Código Tributario, LRTI y RLRTI vigentes</li>
                    <li>✓ Semáforo visual de vigencia</li>
                    <li className="text-[var(--color-texto-secundario)] line-through">✗ Columnas históricas de reformas</li>
                    <li className="text-[var(--color-texto-secundario)] line-through">✗ Resoluciones NAC y Circulares</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setCurrentPlan('free');
                    setShowSubModal(false);
                  }}
                  className="btn-chess-dark w-full py-2 rounded-lg text-xs mt-5 cursor-pointer"
                >
                  Usar Plan Gratuito
                </button>
              </div>

              {/* PRO $4.99 */}
              <div className="bg-[var(--color-superficie)] border-2 border-[var(--color-aviso)] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-[var(--color-aviso)]">
                    Plan Pro • Investigador
                  </span>
                  <div className="text-2xl font-black text-[var(--color-texto)] mt-1">
                    USD 4.99 <span className="text-xs font-normal text-[var(--color-texto-secundario)]">/ mes</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-aviso)]">o USD 49.99 / año (ahorra 2 meses)</div>
                  <ul className="mt-4 space-y-2 text-xs text-[var(--color-texto)]">
                    <li>✓ Todo el Plan Gratuito</li>
                    <li>✓ Columnas paralelas de reformas históricas</li>
                    <li>✓ Cascada completa (Resoluciones y Circulares SRI)</li>
                    <li>✓ Apartado exclusivo de Tablas Tributarias</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGeneratePlacetoPaySession('premium', 4.99)}
                  className="w-full py-2.5 rounded-lg text-xs font-extrabold bg-[var(--color-aviso)] text-[#111317] mt-5 cursor-pointer"
                >
                  Generar Link PlacetoPay ($4.99)
                </button>
              </div>

              {/* PLUS $9.99 */}
              <div className="bg-[var(--color-superficie)] border-2 border-[var(--color-secundario)] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-[var(--color-secundario)]">
                    Plan Plus • Corporativo Total
                  </span>
                  <div className="text-2xl font-black text-[var(--color-texto)] mt-1">
                    USD 9.99 <span className="text-xs font-normal text-[var(--color-texto-secundario)]">/ mes</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-secundario)]">o USD 99.99 / año (ahorra 2 meses)</div>
                  <ul className="mt-4 space-y-2 text-xs text-[var(--color-texto)]">
                    <li>✓ Todo el Plan Pro</li>
                    <li>✓ Calculadoras SRI Interactivas (IR, RIMPE, Dividendos)</li>
                    <li>✓ Formularios, Casilleros y Anexos (ATS, RDEP, ADI)</li>
                    <li>✓ Alertas WhatsApp por 9no dígito del RUC</li>
                    <li>✓ Chatbot IA (hasta 100 consultas / mes)</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGeneratePlacetoPaySession('professional', 9.99)}
                  className="btn-chess-green w-full py-2.5 rounded-lg text-xs mt-5 cursor-pointer"
                >
                  Generar Link PlacetoPay ($9.99)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VENTANA FLOTANTE DE E-BOOK PARA NORMAS CONCORDANTES */}
      {floatingEbookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[var(--color-superficie)] border-b border-[var(--color-borde)] flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-secundario-suave)] text-[var(--color-secundario)] border border-[var(--color-secundario-borde)]">
                  {floatingEbookModal.levelLabel}
                </span>
                <span className="text-xs font-bold text-[var(--color-texto)]">
                  {floatingEbookModal.normCode} — {floatingEbookModal.articleLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LegalStatusButton status={floatingEbookModal.legalStatus} size="sm" />
                <button
                  onClick={() => setFloatingEbookModal(null)}
                  className="p-1 rounded-lg text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subtitle / Context */}
            <div className="px-6 pt-4 pb-2 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)]">
              <div className="text-[11px] text-[var(--color-texto-secundario)]">
                <span>Norma fuente: </span>
                <strong className="text-[var(--color-texto)]">{floatingEbookModal.normName}</strong>
              </div>
              <h2 className="text-base font-black text-[var(--color-texto)] mt-1">
                {floatingEbookModal.articleLabel}: {floatingEbookModal.articleTitle}
              </h2>
            </div>

            {/* Modal Body: Solamente el texto del artículo en mención */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-[var(--color-texto)] leading-relaxed">
              {renderMarkdownContent(floatingEbookModal.content)}
              <div className="p-3 rounded-lg bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] mt-4">
                <strong className="text-[var(--color-secundario)]">Nota de concordancia: </strong>
                {floatingEbookModal.relationNote}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[var(--color-superficie-secundaria)] border-t border-[var(--color-borde)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-texto-secundario)]">
                SmartLex Ecuador • E-Book Jurídico Autónomo
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopyCitation(
                      `${floatingEbookModal.normCode} ${floatingEbookModal.articleLabel}: ${floatingEbookModal.articleTitle}\n\n${floatingEbookModal.content}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-fondo)] hover:bg-[var(--color-superficie-hover)] text-xs font-bold text-[var(--color-texto)] flex items-center gap-1.5 transition cursor-pointer border border-[var(--color-borde)]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Cita</span>
                </button>
                <button
                  onClick={() => setFloatingEbookModal(null)}
                  className="btn-chess-green px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTIFICAR ERROR O SUGERENCIA SOBRE EL ARTÍCULO */}
      {isReportModalOpen && reportingArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-borde)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-error-fondo)] text-[var(--color-error)] border border-[var(--color-error-borde)]">
                  <Flag className="w-5 h-5 text-[var(--color-error)]" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-[var(--color-texto)]">
                    Notificar Discrepancia o Sugerencia
                  </h3>
                  <p className="text-xs text-[var(--color-secundario)] font-semibold">
                    {reportingArticle.label}{reportingArticle.title ? `: ${reportingArticle.title}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] p-1 rounded-lg hover:bg-[var(--color-superficie-hover)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contexto prellenado del artículo para no obligar al usuario o revisor a reescribir */}
            <div className="p-3 rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-[var(--color-texto-secundario)]">
                <span>Norma: <strong className="text-[var(--color-texto)]">{reportingArticle.norms?.title || 'Ley de Régimen Tributario Interno'}</strong></span>
                <span className="px-2 py-0.5 rounded bg-[var(--color-secundario-suave)] text-[var(--color-secundario)] font-bold border border-[var(--color-secundario-borde)] text-[10px]">
                  {reportingArticle.legal_status === 'vigente_reformado' ? 'Vigente y Reformado' : reportingArticle.legal_status === 'derogado' ? 'Derogado' : 'Vigente'}
                </span>
              </div>
              <div className="text-[var(--color-texto)] font-bold text-xs">
                {reportingArticle.label}{reportingArticle.title ? `: ${reportingArticle.title}` : ''}
              </div>
              <div className="p-2 bg-[var(--color-superficie-secundaria)] rounded-lg border border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] italic line-clamp-3">
                "{reportingArticle.content?.slice(0, 220)}..."
              </div>
            </div>

            <form onSubmit={handleSubmitDiscrepancy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-texto)] mb-1.5">
                  Tipo de incidencia:
                </label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-[var(--color-superficie)] border border-[var(--color-borde)] focus:border-[var(--color-secundario)] rounded-lg px-3 py-2 text-xs text-[var(--color-texto)] outline-none cursor-pointer"
                >
                  <option value="errata">✏️ Error tipográfico o errata en el texto</option>
                  <option value="missing_content">📄 Falta un literal, inciso o sección</option>
                  <option value="table_error">📊 Discrepancia en cifras o tabla tarifaria</option>
                  <option value="outdated_reform">⏳ Reforma o vigencia desactualizada</option>
                  <option value="suggestion">💡 Sugerencia general o mejora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-texto)] mb-1.5">
                  Describe el error o tu sugerencia:
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportComment}
                  onChange={e => setReportComment(e.target.value)}
                  placeholder="Explícanos qué has detectado (ej: En el literal b la tarifa debería ser 25% según el R.O. 478...)"
                  className="w-full bg-[var(--color-superficie)] border border-[var(--color-borde)] focus:border-[var(--color-secundario)] rounded-lg p-3 text-xs text-[var(--color-texto)] placeholder-[var(--color-icono-sutil)] outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-texto)] mb-1.5">
                  Tu contacto o email (opcional para darte seguimiento):
                </label>
                <input
                  type="text"
                  value={reportUserContact}
                  onChange={e => setReportUserContact(e.target.value)}
                  placeholder="ej: abogado@tuempresa.com o 0991234567"
                  className="w-full bg-[var(--color-superficie)] border border-[var(--color-borde)] focus:border-[var(--color-secundario)] rounded-lg px-3 py-2 text-xs text-[var(--color-texto)] placeholder-[var(--color-icono-sutil)] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-borde)]">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportComment.trim()}
                  className="btn-chess-green px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReport ? 'Enviando...' : 'Enviar Reporte'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANTALLA 3: POP-UP DE EVOLUCIÓN HISTÓRICA (BARRA DE DESPLAZAMIENTO HORIZONTAL ARRIBA + NORMATIVA CONEXA JERÁRQUICA COLAPSADA ABAJO) */}
      {isHistoryModalOpen && activeCurrentArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-fondo)] border border-[var(--color-borde)] rounded-2xl max-w-[1440px] w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header Minimalista Oscuro */}
            <div className="px-5 py-3.5 bg-[var(--color-superficie)] border-b border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                  <Hourglass className="w-4 h-4 text-[var(--color-texto)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]">
                      Pantalla 3 • Evolución Temporal y Normativa Conexa
                    </span>
                    <span className="text-xs font-extrabold text-[var(--color-texto)]">
                      {activeCurrentArticle.display_label || activeCurrentArticle.label}
                      {activeCurrentArticle.title ? `: ${activeCurrentArticle.title}` : ''}
                    </span>
                    {activeCurrentArticle.is_innumerado && activeCurrentArticle.after_article && (
                      <span
                        title={`Código interno de orden: ${activeCurrentArticle.identifier || activeCurrentArticle.label}`}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border border-[var(--color-borde)]"
                      >
                        {activeCurrentArticle.innumerado_order || 1} tras Art. {activeCurrentArticle.after_article}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap mt-1 text-[10px] text-[var(--color-texto-secundario)]">
                    <span>
                      Versión actual fija a la izquierda • Desplaza la barra horizontal hacia la derecha ➡️ para comparar cada reforma
                    </span>
                    <span className="inline-flex items-center gap-1 text-[var(--color-secundario)]">
                      + Texto incorporado respecto a la versión previa
                    </span>
                    <span className="inline-flex items-center gap-1 text-[var(--color-error)] line-through">
                      Texto suprimido respecto a la versión previa
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles de Desplazamiento Horizontal y Selector de Versiones */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const track = document.getElementById('popup-horizontal-versions-track');
                    if (track) track.scrollBy({ left: -400, behavior: 'smooth' });
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto)] cursor-pointer"
                  title="Desplazar barra de versiones hacia la izquierda"
                >
                  ◀
                </button>
                {articleHistoricalVersions.map(ver => (
                  <button
                    key={ver.id}
                    onClick={() => {
                      setActiveHistoryYear(ver.version_year);
                      const el = document.getElementById(`hist-col-${ver.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border ${
                      ver.is_current
                        ? 'bg-[var(--color-secundario)] border-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] font-bold'
                        : activeHistoryYear === ver.version_year
                          ? 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde-fuerte)] text-[var(--color-texto)] font-bold'
                          : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:border-[var(--color-borde-fuerte)]'
                    }`}
                  >
                    <span>{ver.version_year}</span>
                    <span className="text-[9px] opacity-75">
                      {ver.is_current ? '(Vigente)' : `(v${ver.version_number})`}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const track = document.getElementById('popup-horizontal-versions-track');
                    if (track) track.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[11px] text-[var(--color-texto)] cursor-pointer"
                  title="Desplazar barra de versiones hacia la derecha"
                >
                  ▶
                </button>

                <button
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setSelectedHistorySubId(null);
                  }}
                  className="p-1.5 rounded-lg text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-hover)] transition cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BARRA SELECTORA DE SUB-NIVELES (ARTÍCULO COMPLETO vs LITERAL / NUMERAL / PÁRRAFO) */}
            {activeArticleSubElements.length > 0 && (
              <div className="px-5 py-2 bg-[var(--color-fondo)] border-b border-[var(--color-borde)] flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-texto-secundario)] mr-1">
                  Ámbito del histórico:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHistorySubId(null);
                    setActiveHistoryYear(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                    selectedHistorySubId === null
                      ? 'bg-[var(--color-secundario)] border-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] font-bold'
                      : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:border-[var(--color-borde-fuerte)]'
                  }`}
                >
                  Artículo completo
                </button>
                {activeArticleSubElements.map(sub => {
                  const isActiveSub = selectedHistorySubId === sub.identifier;
                  return (
                    <button
                      key={sub.identifier}
                      type="button"
                      onClick={() => {
                        setSelectedHistorySubId(sub.identifier || null);
                        setActiveHistoryYear(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                        isActiveSub
                          ? 'bg-[var(--color-secundario)] border-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] font-bold'
                          : 'bg-[var(--color-superficie-secundaria)] border-[var(--color-borde)] text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:border-[var(--color-borde-fuerte)]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CUERPO DEL POP-UP CON SCROLL VERTICAL GENERAL: ARRIBA COMPARADOR HORIZONTAL + ABAJO NORMATIVA CONEXA COLAPSADA */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-borde)] min-h-0">
              {/* ============================================================ */}
              {/* SECCIÓN SUPERIOR: COMPARADOR PARALELO CON BARRA DE           */}
              {/* DESPLAZAMIENTO HORIZONTAL (COMO EL POP-UP DE SMARTLEX)       */}
              {/* ============================================================ */}
              <div className="flex h-[54vh] min-h-[370px] overflow-hidden bg-[var(--color-fondo)]">
                {/* COLUMNA 1: VERSIÓN ACTUAL VIGENTE (CONGELADA A LA IZQUIERDA) */}
                <div
                  className={`${
                    isCurrentColExpanded ? 'w-[520px] sm:w-[600px]' : 'w-[360px] sm:w-[430px]'
                  } shrink-0 bg-[var(--color-superficie)] border-r-2 border-[var(--color-borde-fuerte)] flex flex-col shadow-xl z-20 transition-all duration-200`}
                >
                  <div className="px-3.5 py-2.5 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-texto)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-secundario)] shrink-0" />
                      Vigente Hoy ({articleHistoricalVersions[0]?.version_year || 2009})
                    </span>
                    <button
                      onClick={() => setIsCurrentColExpanded(!isCurrentColExpanded)}
                      className="px-2 py-1 rounded-md bg-[var(--color-superficie)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      {isCurrentColExpanded ? (
                        <>
                          <Minimize2 className="w-3 h-3" />
                          <span>Reducir</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3 h-3" />
                          <span>Ampliar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="px-3.5 py-2.5 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] text-[11px] text-[var(--color-texto-secundario)] space-y-1">
                    <div className="text-[var(--color-texto)] font-semibold line-clamp-2">
                      {articleHistoricalVersions[0]?.reform_cite || 'Texto Consolidado Vigente'}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                        {periodicityLabel(articleHistoricalVersions[0]?.tax_periodicity)}:{' '}
                        {formatValidityRange(
                          articleHistoricalVersions[0]?.raw_valid_from ??
                            articleHistoricalVersions[0]?.valid_from,
                          articleHistoricalVersions[0]?.raw_valid_to,
                          articleHistoricalVersions[0]?.legal_status === 'derogado'
                        )}
                      </span>
                      {articleHistoricalVersions[0]?.official_registry &&
                        articleHistoricalVersions[0]?.official_registry !==
                          articleHistoricalVersions[0]?.reform_cite && (
                          <span className="text-[10px] text-[var(--color-texto-secundario)] truncate">
                            {articleHistoricalVersions[0]?.official_registry}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Texto Íntegro Actual con Resaltado Diferencial respecto a la versión inmediata anterior */}
                  <div className="p-4 overflow-y-auto flex-1 text-xs text-[var(--color-texto)] leading-relaxed space-y-2.5">
                    {renderDiffMarkdownContent(
                      articleHistoricalVersions[0]?.content || activeCurrentArticle.content,
                      articleHistoricalVersions[1]?.content || null,
                      articleHistoricalVersions[0]?.table_diff_mode
                    )}
                  </div>

                  {openSummaryId === (articleHistoricalVersions[0]?.id || 'vigente') && (
                    <div className="p-3 bg-[var(--color-superficie-secundaria)] border-t border-[var(--color-borde-fuerte)] text-xs text-[var(--color-texto)] shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-[var(--color-texto)]">
                          Resumen del cambio vigente ({articleHistoricalVersions[0]?.version_year})
                        </span>
                        <button
                          onClick={() => setOpenSummaryId(null)}
                          className="text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--color-texto)] leading-relaxed">
                        {articleHistoricalVersions[0]?.summary_change}
                      </p>
                    </div>
                  )}

                  <div className="px-3.5 py-2 bg-[var(--color-superficie-secundaria)] border-t border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--color-texto-secundario)]">
                    <span>Columna Fija de Referencia</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const headVer = articleHistoricalVersions[0];
                        const matchedCurrent = headVer
                          ? findReformTargetNormAndArticle(
                              headVer.reform_cite,
                              headVer.official_registry,
                              activeCurrentArticle.norm_id,
                              headVer.id ? [headVer.id] : []
                            )
                          : null;
                        return matchedCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFullNorm(matchedCurrent.norm, matchedCurrent.articleLabel)}
                            title={`Abrir norma completa: ${matchedCurrent.norm.title}`}
                            className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde-fuerte)] font-semibold flex items-center gap-1 cursor-pointer transition"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Ver norma modificatoria completa</span>
                          </button>
                        ) : null;
                      })()}
                      <button
                        onClick={() =>
                          setOpenSummaryId(
                            openSummaryId === (articleHistoricalVersions[0]?.id || 'vigente')
                              ? null
                              : articleHistoricalVersions[0]?.id || 'vigente'
                          )
                        }
                        className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Cambio introducido</span>
                      </button>
                      <button
                        onClick={() =>
                          handleCopyCitation(
                            `${articleHistoricalVersions[0]?.reform_cite}\nVigente desde: ${articleHistoricalVersions[0]?.valid_from}\n\n${articleHistoricalVersions[0]?.content}`
                          )
                        }
                        className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* COLUMNAS 2, 3, 4...: PISTA CON BARRA DE DESPLAZAMIENTO HORIZONTAL (SCROLLBAR) */}
                <div
                  id="popup-horizontal-versions-track"
                  className="flex-1 overflow-x-scroll flex gap-4 p-4 items-stretch scroll-smooth bg-[var(--color-fondo)]"
                >
                  {articleHistoricalVersions.slice(1).map((ver, idx) => {
                    const isHighlighted = activeHistoryYear === ver.version_year;
                    const immediatePreviousVersion = articleHistoricalVersions[idx + 2] || null;
                    return (
                      <div
                        id={`hist-col-${ver.id}`}
                        key={ver.id}
                        className={`w-[360px] sm:w-[410px] shrink-0 bg-[var(--color-superficie)] rounded-xl flex flex-col border transition-all duration-200 overflow-hidden shadow-lg ${
                          isHighlighted
                            ? 'border-[var(--color-secundario)] ring-1 ring-[var(--color-secundario)]'
                            : 'border-[var(--color-borde)] hover:border-[var(--color-borde-fuerte)]'
                        }`}
                      >
                        <div className="px-3.5 py-2.5 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[var(--color-texto)] flex items-center gap-1">
                              <Hourglass className="w-3.5 h-3.5 text-[var(--color-texto-secundario)]" />
                              Versión {ver.version_year}
                            </span>
                            <span className="text-[10px] text-[var(--color-texto-secundario)] font-mono bg-[var(--color-fondo)] px-2 py-0.5 rounded border border-[var(--color-borde)]">
                              {formatValidityRange(
                                ver.raw_valid_from ?? ver.valid_from,
                                ver.raw_valid_to ?? ver.valid_to,
                                true
                              )}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[var(--color-texto-secundario)] px-2 py-0.5 rounded bg-[var(--color-superficie)] border border-[var(--color-borde)] shrink-0">
                            {ver.is_fe_erratas_replaced ? 'Fe de Erratas' : 'Histórico'}
                          </span>
                        </div>

                        <div className="px-3.5 py-2 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] text-[11px] space-y-0.5">
                          <div className="text-[var(--color-texto)] font-semibold line-clamp-1">
                            {ver.reform_cite}
                          </div>
                          {ver.official_registry && ver.official_registry !== ver.reform_cite && (
                            <div className="text-[10px] text-[var(--color-texto-secundario)] truncate">
                              {ver.official_registry}
                            </div>
                          )}
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 text-xs text-[var(--color-texto)] leading-relaxed">
                          {renderDiffMarkdownContent(
                            ver.content,
                            immediatePreviousVersion?.content || null,
                            ver.table_diff_mode
                          )}
                        </div>

                        {openSummaryId === ver.id && (
                          <div className="p-3 bg-[var(--color-superficie-secundaria)] border-t border-[var(--color-borde-fuerte)] text-xs text-[var(--color-texto)] shrink-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase text-[var(--color-texto)]">
                                Cambio introducido ({ver.version_year})
                              </span>
                              <button
                                onClick={() => setOpenSummaryId(null)}
                                className="text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-[var(--color-texto)] leading-relaxed">
                              {ver.summary_change}
                            </p>
                          </div>
                        )}

                        <div className="px-3.5 py-2 bg-[var(--color-superficie-secundaria)] border-t border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--color-texto-secundario)]">
                          <span>Versión #{ver.version_number}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const matchedOrigin = findReformTargetNormAndArticle(
                                ver.reform_cite,
                                ver.official_registry,
                                activeCurrentArticle.norm_id,
                                ver.id ? [ver.id] : []
                              );
                              return matchedOrigin ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFullNorm(matchedOrigin.norm, matchedOrigin.articleLabel)}
                                  title={`Abrir norma completa: ${matchedOrigin.norm.title}`}
                                  className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde-fuerte)] font-semibold flex items-center gap-1 cursor-pointer transition"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>Ver norma modificatoria completa</span>
                                </button>
                              ) : null;
                            })()}
                            <button
                              onClick={() =>
                                setOpenSummaryId(openSummaryId === ver.id ? null : ver.id)
                              }
                              className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Cambio introducido</span>
                            </button>
                            <button
                              onClick={() =>
                                handleCopyCitation(
                                  `${ver.reform_cite} (${ver.official_registry})\n${ver.valid_from} al ${ver.valid_to}\n\n${ver.content}`
                                )
                              }
                              className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde)] flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {articleHistoricalVersions.length <= 1 && (
                    <div className="w-96 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--color-texto-secundario)] bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-xl">
                      <Bookmark className="w-7 h-7 text-[var(--color-texto-secundario)] mb-2" />
                      <p className="font-bold text-[var(--color-texto)] mb-1">
                        Sin reformas anteriores registradas
                      </p>
                      <p>
                        Este artículo mantiene su redacción original sin modificaciones posteriores en el período consultado.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================ */}
              {/* SECCIÓN INFERIOR: NORMATIVA CONEXA Y DESARROLLO JERÁRQUICO   */}
              {/* COLAPSADA POR ORDEN JERÁRQUICO + LÍNEA DEL TIEMPO PROPIA (⏳) */}
              {/* ============================================================ */}
              <div className="p-5 bg-[var(--color-superficie)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-borde)]">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-texto)] flex items-center gap-2">
                      <SplitSquareVertical className="w-4 h-4 text-[var(--color-texto)]" />
                      <span>
                        Normativa conexa y desarrollo jerárquico ({activeCurrentArticle.label})
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--color-texto-secundario)] mt-0.5">
                      Las categorías inferiores permanecen colapsadas por orden jerárquico. Despliégalas para examinar cada artículo relacionado y consultar su propia línea del tiempo con el reloj de arena (⏳).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPopupCascadeGroupsOpen({
                          modificatorias: true,
                          reglamentos: true,
                          resoluciones: true,
                          tablas: true
                        })
                      }
                      className="px-2.5 py-1 rounded-md bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[10px] font-semibold text-[var(--color-texto)] cursor-pointer"
                    >
                      Desplegar jerarquías
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPopupCascadeGroupsOpen({
                          modificatorias: false,
                          reglamentos: false,
                          resoluciones: false,
                          tablas: false
                        })
                      }
                      className="px-2.5 py-1 rounded-md bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[10px] font-semibold text-[var(--color-texto-secundario)] cursor-pointer"
                    >
                      Colapsar jerarquías
                    </button>
                  </div>
                </div>

                {(() => {
                  const leyModificatoriaFromRelations = activeSecondaryCascade.filter(
                    item => item.level === 'ley_modificatoria'
                  );
                  const seenModNormIds = new Set(
                    leyModificatoriaFromRelations.map(item => item.normId || item.normCode)
                  );
                  const leyModificatoriaFromVersions: SecondaryCascadeItem[] = [];
                  const reglamentoFromVersions: SecondaryCascadeItem[] = [];
                  const seenRegNormIds = new Set(
                    activeSecondaryCascade
                      .filter(item => item.level === 'reglamento')
                      .map(item => item.normId || item.normCode)
                  );
                  for (const ver of articleHistoricalVersions) {
                    const matched = findReformTargetNormAndArticle(
                      ver.reform_cite,
                      ver.official_registry,
                      activeCurrentArticle.norm_id,
                      ver.id ? [ver.id] : []
                    );
                    if (!matched) continue;
                    const cat = classifyLibraryNormDetailed(matched.norm).category;
                    if (cat === 'reglamentos' || cat === 'decretos') {
                      if (!seenRegNormIds.has(matched.norm.id) && !seenRegNormIds.has(matched.norm.code)) {
                        seenRegNormIds.add(matched.norm.id);
                        const artCount = articlesByNormId.get(matched.norm.id) || 0;
                        reglamentoFromVersions.push({
                          id: `reg-ver-${matched.norm.id}`,
                          level: 'reglamento',
                          levelLabel: cat === 'decretos' ? 'Decreto Ejecutivo Vinculado' : 'Reglamento Vinculado',
                          normId: matched.norm.id,
                          normName: matched.norm.title,
                          normCode: matched.norm.code,
                          articleLabel: matched.articleLabel || 'Norma completa',
                          articleTitle: `${matched.norm.title}${artCount > 0 ? ` (${artCount} artículos cargados)` : ''}`,
                          content: ver.summary_change || ver.reform_cite,
                          legalStatus: 'vigente',
                          relationNote: `Reforma vinculada a ${activeCurrentArticle.label} (${ver.official_registry})`,
                          historicalVersions: []
                        });
                      }
                      continue;
                    }
                    if (
                      cat === 'resoluciones' ||
                      cat === 'circulares' ||
                      cat === 'otras_normas'
                    ) {
                      continue;
                    }
                    if (seenModNormIds.has(matched.norm.id) || seenModNormIds.has(matched.norm.code)) continue;
                    seenModNormIds.add(matched.norm.id);
                    const artCount = articlesByNormId.get(matched.norm.id) || 0;
                    leyModificatoriaFromVersions.push({
                      id: `mod-ver-${matched.norm.id}`,
                      level: 'ley_modificatoria',
                      levelLabel: matched.norm.norm_type === 'code' ? 'Código Vinculado' : 'Ley Modificatoria / Reformatoria',
                      normId: matched.norm.id,
                      normName: matched.norm.title,
                      normCode: matched.norm.code,
                      articleLabel: matched.articleLabel || 'Norma completa',
                      articleTitle: `${matched.norm.title}${artCount > 0 ? ` (${artCount} artículos cargados)` : ''}`,
                      content: ver.summary_change || ver.reform_cite,
                      legalStatus: 'vigente',
                      relationNote: `Modificó ${activeCurrentArticle.label} (${ver.official_registry})`,
                      historicalVersions: []
                    });
                  }
                  const leyModificatoriaItems = [
                    ...leyModificatoriaFromRelations,
                    ...leyModificatoriaFromVersions
                  ];

                  const reglamentoItems = [
                    ...activeSecondaryCascade.filter(item => item.level === 'reglamento'),
                    ...reglamentoFromVersions
                  ];
                  const resolucionItems: SecondaryCascadeItem[] = [
                    ...activeSecondaryCascade.filter(
                      item => item.level === 'resolucion' || item.level === 'circular'
                    ),
                    ...activeSecondaryCascade.flatMap(item => item.childItems || [])
                  ];

                  const renderCascadeArticleSheet = (item: SecondaryCascadeItem) => {
                    const isItemOpen = Boolean(popupCascadeItemsOpen[item.id]);
                    const isItemHistOpen = Boolean(popupCascadeHistoryOpen[item.id]);
                    const itemVersions = item.historicalVersions || [
                      {
                        year: 2009,
                        label: 'Vigente',
                        cite: item.normCode,
                        validFrom: '2008-01-01',
                        validTo: 'Presente',
                        summary: item.relationNote,
                        content: item.content
                      }
                    ];
                    const selectedYr =
                      popupCascadeSelectedYear[item.id] ?? itemVersions[0]?.year ?? 2009;
                    const activeVer =
                      itemVersions.find(v => v.year === selectedYr) || itemVersions[0];

                    return (
                      <div
                        key={item.id}
                        className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden transition"
                      >
                        {/* Cabecera desplegable del artículo relacionado con su propio Reloj de Arena (⏳) a la derecha */}
                        <div className="px-4 py-3 bg-[var(--color-superficie-secundaria)] flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPopupCascadeItemsOpen(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }))
                            }
                            className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                          >
                            {isItemOpen ? (
                              <ChevronDown className="w-4 h-4 text-[var(--color-texto)] shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)] shrink-0" />
                            )}
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)] shrink-0">
                              {item.normCode}
                            </span>
                            <span className="text-xs font-bold text-[var(--color-texto)] truncate">
                              {item.articleLabel}: {item.articleTitle}
                            </span>
                          </button>

                          {/* Reloj de Arena (⏳) exclusivo de este artículo de la jerarquía inferior */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPopupCascadeItemsOpen(prev => ({
                                  ...prev,
                                  [item.id]: true
                                }));
                                setPopupCascadeHistoryOpen(prev => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }));
                              }}
                              title="Ver línea del tiempo histórica de este artículo relacionado"
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isItemHistOpen
                                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)]'
                                  : 'bg-[var(--color-superficie)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border-[var(--color-borde)]'
                              }`}
                            >
                              <Hourglass className="w-3.5 h-3.5" />
                              <span>Línea del Tiempo ({itemVersions.length})</span>
                            </button>
                          </div>
                        </div>

                        {/* Contenido desplegable del artículo relacionado + su propia barra de Línea del Tiempo */}
                        {isItemOpen && (
                          <div className="p-4 space-y-3 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                            {/* Línea del tiempo propia del artículo inferior (se activa al pulsar su reloj ⏳ o siempre disponible) */}
                            {isItemHistOpen && (
                              <div className="p-3 rounded-xl bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-texto)] flex items-center gap-1.5">
                                    <Hourglass className="w-3.5 h-3.5 text-[var(--color-texto)]" />
                                    <span>
                                      Evolución Histórica de {item.normCode} • {item.articleLabel}
                                    </span>
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {itemVersions.map(v => (
                                      <button
                                        key={v.year}
                                        type="button"
                                        onClick={() =>
                                          setPopupCascadeSelectedYear(prev => ({
                                            ...prev,
                                            [item.id]: v.year
                                          }))
                                        }
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                          activeVer?.year === v.year
                                            ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] border-[var(--color-secundario)] font-bold'
                                            : 'bg-[var(--color-superficie)] text-[var(--color-texto-secundario)] border-[var(--color-borde)] hover:text-[var(--color-texto)]'
                                        }`}
                                      >
                                        {v.year} · {v.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {activeVer && (
                                  <div className="text-[11px] text-[var(--color-texto-secundario)] flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-borde)]">
                                    <span>
                                      <strong className="text-[var(--color-texto)]">Fuente:</strong>{' '}
                                      {activeVer.cite} ({activeVer.validFrom} al {activeVer.validTo})
                                    </span>
                                    <span className="text-[var(--color-texto)]">{activeVer.summary}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-[var(--color-texto)] leading-relaxed">
                              {renderMarkdownContent(
                                isItemHistOpen && activeVer ? activeVer.content : item.content
                              )}
                            </div>

                            <div className="pt-2 border-t border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-texto-secundario)]">
                              <span>Concordancia con {activeCurrentArticle.label}: {item.relationNote}</span>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const targetFullNorm =
                                    (item.normId ? norms.find(n => n.id === item.normId) : null) ||
                                    norms.find(n => n.code.toUpperCase() === item.normCode.toUpperCase()) ||
                                    findReformTargetNormAndArticle(item.normName, item.normCode, activeCurrentArticle.norm_id)?.norm ||
                                    null;
                                  return targetFullNorm && targetFullNorm.id !== activeCurrentArticle.norm_id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFullNorm(targetFullNorm, item.articleLabel)}
                                      className="px-2 py-1 rounded bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] text-[var(--color-texto)] border border-[var(--color-borde-fuerte)] font-semibold flex items-center gap-1 cursor-pointer transition"
                                    >
                                      <BookOpen className="w-3 h-3" />
                                      <span>Ver norma completa</span>
                                    </button>
                                  ) : null;
                                })()}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyCitation(
                                      `${item.normCode} ${item.articleLabel}: ${item.articleTitle}\n\n${
                                        isItemHistOpen && activeVer ? activeVer.content : item.content
                                      }`
                                    )
                                  }
                                  className="text-[var(--color-texto)] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar concordancia</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-2.5">
                      {/* NIVEL SUPERIOR / PARALELO: LEYES MODIFICATORIAS Y REFORMATORIAS COMPLETAS */}
                      <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setPopupCascadeGroupsOpen(prev => ({
                              ...prev,
                              modificatorias: !prev.modificatorias
                            }))
                          }
                          className="w-full px-4 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {popupCascadeGroupsOpen.modificatorias ? (
                              <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                            )}
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                              Leyes y Códigos
                            </span>
                            <span className="text-xs font-bold text-[var(--color-texto)]">
                              Leyes y Códigos vinculados a {activeCurrentArticle.label} (Abrir norma completa)
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--color-texto-secundario)] font-mono">
                            {leyModificatoriaItems.length} norm.
                          </span>
                        </button>

                        {popupCascadeGroupsOpen.modificatorias && (
                          <div className="p-3 space-y-2.5 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                            {leyModificatoriaItems.length > 0 ? (
                              leyModificatoriaItems.map(renderCascadeArticleSheet)
                            ) : (
                              <p className="text-xs text-[var(--color-texto-secundario)] px-2 py-1">
                                No se han vinculado otras leyes o códigos para este artículo.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* NIVEL JERÁRQUICO 1: REGLAMENTOS Y DECRETOS EJECUTIVOS (COLAPSADO POR DEFECTO) */}
                      <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setPopupCascadeGroupsOpen(prev => ({
                              ...prev,
                              reglamentos: !prev.reglamentos
                            }))
                          }
                          className="w-full px-4 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {popupCascadeGroupsOpen.reglamentos ? (
                              <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                            )}
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                              Jerarquía 1
                            </span>
                            <span className="text-xs font-bold text-[var(--color-texto)]">
                              Reglamentos y Decretos Ejecutivos vinculados a {activeCurrentArticle.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--color-texto-secundario)] font-mono">
                            {reglamentoItems.length} disp.
                          </span>
                        </button>

                        {popupCascadeGroupsOpen.reglamentos && (
                          <div className="p-3 space-y-2.5 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                            {reglamentoItems.map(renderCascadeArticleSheet)}
                          </div>
                        )}
                      </div>

                      {/* NIVEL JERÁRQUICO 2: RESOLUCIONES Y CIRCULARES DEL SRI (COLAPSADO POR DEFECTO) */}
                      <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setPopupCascadeGroupsOpen(prev => ({
                              ...prev,
                              resoluciones: !prev.resoluciones
                            }))
                          }
                          className="w-full px-4 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {popupCascadeGroupsOpen.resoluciones ? (
                              <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                            )}
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                              Jerarquía 2
                            </span>
                            <span className="text-xs font-bold text-[var(--color-texto)]">
                              Resoluciones Generales y Circulares vinculadas a {activeCurrentArticle.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--color-texto-secundario)] font-mono">
                            {resolucionItems.length} res.
                          </span>
                        </button>

                        {popupCascadeGroupsOpen.resoluciones && (
                          <div className="p-3 space-y-2.5 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                            {resolucionItems.map(renderCascadeArticleSheet)}
                          </div>
                        )}
                      </div>

                      {/* NIVEL JERÁRQUICO 3: TABLAS TRIBUTARIAS OFICIALES DEL ARTÍCULO (COLAPSADO POR DEFECTO) */}
                      {articleTables.length > 0 && (
                        <div className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setPopupCascadeGroupsOpen(prev => ({
                                ...prev,
                                tablas: !prev.tablas
                              }))
                            }
                            className="w-full px-4 py-3 bg-[var(--color-superficie-secundaria)] hover:bg-[var(--color-superficie-hover)] transition flex items-center justify-between text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              {popupCascadeGroupsOpen.tablas ? (
                                <ChevronDown className="w-4 h-4 text-[var(--color-texto)]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--color-texto-secundario)]" />
                              )}
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                Jerarquía 3
                              </span>
                              <span className="text-xs font-bold text-[var(--color-texto)]">
                                Serie Histórica de Tablas Tarifarias Oficiales ({activeCurrentArticle.label})
                              </span>
                            </div>
                            <span className="text-[11px] text-[var(--color-texto-secundario)] font-mono">
                              {articleTables.length} tablas
                            </span>
                          </button>

                          {popupCascadeGroupsOpen.tablas && (
                            <div className="p-3 space-y-3 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]">
                              {articleTables.map(tbl => {
                                const isTblOpen = expandedTableIds[tbl.id] !== false;
                                return (
                                  <div
                                    key={tbl.id}
                                    className="bg-[var(--color-superficie-secundaria)] border border-[var(--color-borde)] rounded-xl p-4 space-y-2.5"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-fondo)] text-[var(--color-texto)] border border-[var(--color-borde)]">
                                          Ejercicio {tbl.fiscal_year} • {tbl.table_code}
                                        </span>
                                        <h4 className="text-xs font-bold text-[var(--color-texto)] mt-1">
                                          {tbl.title}
                                        </h4>
                                        {tbl.subtitle && (
                                          <p className="text-[11px] text-[var(--color-texto-secundario)]">{tbl.subtitle}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-[var(--color-texto-secundario)]">
                                          Vigencia: {formatEffectiveRange(tbl.effective_during, tbl.fiscal_year)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedTableIds(prev => ({
                                              ...prev,
                                              [tbl.id]: prev[tbl.id] === false ? true : false
                                            }))
                                          }
                                          className="px-2.5 py-1 rounded-md bg-[var(--color-superficie)] hover:bg-[var(--color-superficie-hover)] border border-[var(--color-borde)] text-[10px] font-bold text-[var(--color-texto)] inline-flex items-center gap-1 cursor-pointer transition"
                                        >
                                          {isTblOpen ? (
                                            <>
                                              <Minimize2 className="w-3 h-3" />
                                              <span>Colapsar</span>
                                            </>
                                          ) : (
                                            <>
                                              <Maximize2 className="w-3 h-3" />
                                              <span>Desplegar</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {isTblOpen && (
                                      <div className="w-full flex justify-center">
                                        <div className="w-fit max-w-full overflow-x-auto rounded-lg border border-[var(--color-borde)]">
                                          <table className="w-auto max-w-full text-left text-xs">
                                            <thead className="bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] uppercase text-[10px]">
                                              <tr>
                                                {tbl.columns_schema.map(col => (
                                                  <th
                                                    key={col.key}
                                                    className={`py-2 px-3 font-bold ${getAdaptiveCellClass(col.label, true)}`}
                                                  >
                                                    {col.label}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-borde)] bg-[var(--color-superficie)]">
                                              {tbl.rows_data.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-[var(--color-superficie-hover)]">
                                                  {tbl.columns_schema.map(col => {
                                                    const val = row[col.key];
                                                    const displayVal =
                                                      val === null
                                                        ? 'En adelante'
                                                        : col.type === 'currency'
                                                          ? `USD ${Number(val).toLocaleString('en-US', {
                                                              minimumFractionDigits: 2,
                                                              maximumFractionDigits: 2
                                                            })}`
                                                          : col.type === 'percentage'
                                                            ? `${val}%`
                                                            : val;
                                                    return (
                                                      <td
                                                        key={col.key}
                                                        className={`py-1.5 px-3 text-[var(--color-texto)] ${getAdaptiveCellClass(displayVal)}`}
                                                      >
                                                        {displayVal}
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[var(--color-superficie)] border-t border-[var(--color-borde)] flex items-center justify-between text-xs text-[var(--color-texto-secundario)] shrink-0">
              <div className="flex items-center gap-2">
                <span>
                  Mostrando <strong>{articleHistoricalVersions.length} versiones consolidadas</strong> de{' '}
                  {activeCurrentArticle.label} (sin duplicados de prueba).
                </span>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] transition cursor-pointer"
              >
                Cerrar Pop-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK DE COPIADO */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4" />
          <span>¡Cita legal copiada al portapapeles!</span>
        </div>
      )}

      {/* MODAL DE INGESTA DE NORMATIVA PDF (ADMIN) */}
      <NormIngestionModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchAllData();
          setActiveTab('reviewer');
        }}
      />
    </div>
  );
}
