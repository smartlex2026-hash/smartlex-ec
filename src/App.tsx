import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { NormIngestionModal } from './components/admin/NormIngestionModal';
import { RubikCubeLogo } from './components/common/RubikCubeLogo';
import {
  BookOpen,
  Scale,
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
  AlertCircle
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
}

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
}

// ============================================================================
// SEMÁFORO DE VIGENCIA LEGAL ESTILO LED MINIMALISTA
// ============================================================================
export const LegalStatusButton: React.FC<{
  status: LegalStatus;
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, size = 'md' }) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5'
      : size === 'lg'
        ? 'px-3.5 py-1.5 text-xs rounded-xl gap-2'
        : 'px-3 py-1 text-xs rounded-lg gap-2';

  if (status === 'vigente') {
    return (
      <span
        title="Artículo vigente sin reformas posteriores"
        className={`inline-flex items-center font-bold tracking-wide text-white bg-[#192218] border border-[#81B64C]/50 shadow-sm select-none ${sizeClasses}`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#81B64C] shadow-[0_0_8px_#81B64C] shrink-0" />
        <span className="text-[#DFDFDE]">Vigente</span>
      </span>
    );
  }

  if (status === 'vigente_reformado') {
    return (
      <span
        title="Artículo vigente con reformas históricas registradas"
        className={`inline-flex items-center font-bold tracking-wide text-white bg-[#241F14] border border-[#F7C631]/50 shadow-sm select-none ${sizeClasses}`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#F7C631] shadow-[0_0_8px_#F7C631] shrink-0" />
        <span className="text-[#DFDFDE]">Vigente y Reformado</span>
      </span>
    );
  }

  return (
    <span
      title="Disposición derogada expresamente"
      className={`inline-flex items-center font-bold tracking-wide text-white bg-[#261717] border border-[#FA412D]/50 shadow-sm select-none ${sizeClasses}`}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-[#FA412D] shadow-[0_0_8px_#FA412D] shrink-0" />
      <span className="text-[#DFDFDE]">Derogado</span>
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
        className={`inline-flex items-center gap-1 rounded-md border border-[#F7C631]/40 bg-[#241F14] hover:bg-[#30291A] text-[#F7C631] font-bold transition cursor-pointer ${
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
    <div className="mt-1.5 w-full rounded-lg border border-[#F7C631]/45 bg-[#1B1A17] p-2 flex flex-wrap items-end gap-2 text-[10px]">
      <div>
        <label className="block text-[#9E9C98] font-semibold mb-0.5">Desde</label>
        <input
          type="date"
          value={fromVal}
          onChange={e => setFromVal(e.target.value)}
          className="bg-[#262522] border border-[#3C3A36] rounded px-1.5 py-0.5 text-white font-mono focus:outline-none focus:border-[#81B64C]"
        />
      </div>
      <div>
        <label className="block text-[#9E9C98] font-semibold mb-0.5">Hasta (vacío = Presente)</label>
        <input
          type="date"
          value={toVal}
          onChange={e => setToVal(e.target.value)}
          className="bg-[#262522] border border-[#3C3A36] rounded px-1.5 py-0.5 text-white font-mono focus:outline-none focus:border-[#81B64C]"
        />
      </div>
      <div className="flex items-center gap-1.5">
        {toVal && (
          <button
            type="button"
            onClick={() => setToVal('')}
            className="px-2 py-1 rounded bg-[#2A2926] hover:bg-[#383632] text-[#BAB8B5] border border-[#3C3A36] font-semibold cursor-pointer"
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#81B64C] hover:bg-[#72A440] disabled:opacity-60 text-white font-bold cursor-pointer"
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
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2A2926] hover:bg-[#383632] text-[#BAB8B5] border border-[#3C3A36] font-semibold cursor-pointer"
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
const autoFormatRawTables = (text: string): string => {
  if (!text) return '';
  const lines = text.split('\n');
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
// VISOR DE TABLAS Y CONTENIDO MARKDOWN
// ============================================================================
const renderMarkdownContent = (content: string) => {
  if (!content) return null;

  const formattedContent = autoFormatRawTables(content);
  const lines = formattedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join('\n').trim();
      if (text) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-xs leading-relaxed text-[#DFDFDE] mb-3 whitespace-pre-line">
            {text}
          </p>
        );
      }
      currentParagraphLines = [];
    }
  };

  const flushTable = () => {
    if (inTable && (tableHeader.length > 0 || tableRows.length > 0)) {
      elements.push(
        <div key={`tbl-${elements.length}`} className="overflow-x-auto my-3 rounded-xl border border-[#3C3A36] bg-[#21201D] shadow-md">
          <table className="w-full text-left text-xs">
            {tableHeader.length > 0 && (
              <thead className="bg-[#1B1A17] text-[#81B64C] uppercase text-[11px] font-extrabold border-b border-[#3C3A36]">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#3C3A36] bg-[#262522]">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#302E2B] transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-[#DFDFDE] font-medium whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
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

  return <div>{elements}</div>;
};

// ============================================================================
// COMPARADOR DIFERENCIAL ENTRE VERSIONES ADYACENTES (v_k vs v_{k-1})
// ============================================================================
interface ParsedDocStructure {
  paragraphs: string[];
  tables: { header: string[]; rows: string[][] }[];
  notes: string[];
}

const parseDocForDiff = (rawContent: string): ParsedDocStructure => {
  const formatted = autoFormatRawTables(rawContent || '');
  const lines = formatted.split('\n');
  const paragraphs: string[] = [];
  const tables: { header: string[]; rows: string[][] }[] = [];
  const notes: string[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentPara: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const text = currentPara.join('\n').trim();
      if (text) {
        if (/^Nota:/i.test(text)) {
          notes.push(text);
        } else {
          paragraphs.push(text);
        }
      }
      currentPara = [];
    }
  };

  const flushTbl = () => {
    if (inTable && (tableHeader.length > 0 || tableRows.length > 0)) {
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

  return { paragraphs, tables, notes };
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

const renderDiffMarkdownContent = (currentContent: string, previousContent?: string | null) => {
  if (!currentContent) return null;
  if (!previousContent || currentContent.trim() === previousContent.trim()) {
    return renderMarkdownContent(currentContent);
  }

  const currDoc = parseDocForDiff(currentContent);
  const prevDoc = parseDocForDiff(previousContent);

  const oldBody = prevDoc.paragraphs.join('\n\n');
  const newBody = currDoc.paragraphs.join('\n\n');
  const bodySegments = computeWordDiff(oldBody, newBody);

  return (
    <div className="space-y-3">
      {/* Texto normativo con resaltado diferencial respecto a la versión inmediata anterior */}
      {newBody || oldBody ? (
        <div className="text-xs leading-relaxed text-[#DFDFDE] whitespace-pre-line">
          {bodySegments.map((seg, idx) => {
            if (seg.type === 'equal') {
              return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
            }
            if (seg.type === 'removed') {
              return (
                <span
                  key={idx}
                  className="text-[#EF4444] line-through decoration-[#EF4444] decoration-1 mx-0.5"
                  title="Texto eliminado respecto a la versión inmediata anterior"
                >
                  {seg.text}
                </span>
              );
            }
            return (
              <span
                key={idx}
                className="text-[#15803D] dark:text-[#22C55E] mx-0.5"
                title="Texto incrementado respecto a la versión inmediata anterior"
              >
                {seg.text}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Tablas progresivas con comparación celda a celda frente a la versión inmediata anterior */}
      {currDoc.tables.map((tbl, tIdx) => {
        const prevTbl = prevDoc.tables[tIdx];
        return (
          <div key={`diff-tbl-${tIdx}`} className="overflow-x-auto my-3 rounded-xl border border-[#3C3A36] bg-[#21201D] shadow-md">
            <table className="w-full text-left text-xs">
              {tbl.header.length > 0 && (
                <thead className="bg-[#1B1A17] text-[#81B64C] uppercase text-[11px] font-extrabold border-b border-[#3C3A36]">
                  <tr>
                    {tbl.header.map((h, i) => (
                      <th key={i} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-[#3C3A36] bg-[#262522]">
                {tbl.rows.map((row, rIdx) => {
                  const prevRow = prevTbl?.rows?.[rIdx];
                  return (
                    <tr key={rIdx} className="hover:bg-[#302E2B] transition">
                      {row.map((cell, cIdx) => {
                        const prevCell = prevRow?.[cIdx];
                        const cellChanged = prevTbl && prevCell !== undefined && prevCell.trim() !== cell.trim();
                        const rowAdded = prevTbl && !prevRow;
                        return (
                          <td key={cIdx} className="py-2 px-3 text-[#DFDFDE] font-medium whitespace-nowrap">
                            {cellChanged ? (
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-[#EF4444] line-through decoration-[#EF4444] decoration-1 text-[11px]"
                                  title="Valor eliminado de la versión inmediata anterior"
                                >
                                  {prevCell}
                                </span>
                                <span
                                  className="text-[#15803D] dark:text-[#22C55E]"
                                  title="Nuevo valor incrementado en esta versión"
                                >
                                  {cell}
                                </span>
                              </span>
                            ) : rowAdded ? (
                              <span className="text-[#15803D] dark:text-[#22C55E]">
                                {cell}
                              </span>
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
        );
      })}

      {/* Notas de trazabilidad de la versión */}
      {currDoc.notes.map((note, nIdx) => (
        <p key={`note-${nIdx}`} className="text-[11px] leading-relaxed text-[#9E9C98] italic border-t border-[#3C3A36]/60 pt-2">
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
  exemption: { label: 'Exoneraciones', badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  deduction: { label: 'Deducciones', badgeClass: 'bg-purple-500/15 border-purple-500/40 text-purple-400' },
  tax_base: { label: 'Base Imponible', badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400' },
  rate: { label: 'Tarifas y Porcentajes', badgeClass: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' },
  withholding: { label: 'Retenciones en la Fuente', badgeClass: 'bg-orange-500/15 border-orange-500/40 text-orange-400' },
  taxable_event: { label: 'Hecho Generador', badgeClass: 'bg-blue-500/15 border-blue-500/40 text-blue-400' },
  general: { label: 'Conceptos Generales', badgeClass: 'bg-[#81B64C]/15 border-[#81B64C]/40 text-[#81B64C]' },
  other: { label: 'Regímenes y Otros', badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' }
};

const FEEDBACK_TYPE_META: Record<string, { label: string; badge: string; icon: string }> = {
  errata: { label: 'Errata o texto', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: '✏️' },
  missing_content: { label: 'Falta literal/inciso', badge: 'bg-red-500/20 text-red-400 border-red-500/40', icon: '📄' },
  table_error: { label: 'Discrepancia en cifras/tabla', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: '📊' },
  outdated_reform: { label: 'Reforma desactualizada', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', icon: '⏳' },
  suggestion: { label: 'Sugerencia de mejora', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: '💡' }
};

const sortLegalStructures = (a: NormStructure, b: NormStructure): number => {
  const isArtA = a.structure_type === 'article' || !a.structure_type;
  const isArtB = b.structure_type === 'article' || !b.structure_type;

  // 1. Si ambos son artículos ordinarios, orden numérico estricto (Art. 1, 2, 3...)
  if (isArtA && isArtB) {
    const numA = parseInt(String(a.label || '').replace(/\D/g, ''), 10);
    const numB = parseInt(String(b.label || '').replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return (a.order_index ?? 0) - (b.order_index ?? 0);
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
export type TaxScopeCode = 'ALL' | 'RENTA' | 'IVA' | 'ICE' | 'ISD' | 'GENERAL';

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
    badgeBg: 'bg-[#3C3A36]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#4A4843]',
    description: 'Normativa completa sin discriminación de tributo'
  },
  RENTA: {
    code: 'RENTA',
    name: 'Impuesto a la Renta',
    shortName: 'Renta',
    badgeBg: 'bg-[#81B64C]/15',
    badgeText: 'text-[#81B64C]',
    badgeBorder: 'border-[#81B64C]/40',
    description: 'Arts. 1 al 51: Personas naturales, sociedades, deducciones y tarifas'
  },
  IVA: {
    code: 'IVA',
    name: 'Impuesto al Valor Agregado',
    shortName: 'IVA',
    badgeBg: 'bg-[#3B82F6]/15',
    badgeText: 'text-[#60A5FA]',
    badgeBorder: 'border-[#3B82F6]/40',
    description: 'Arts. 52 al 74: Transferencias, importaciones, tarifas 15% / 0% y crédito fiscal'
  },
  ICE: {
    code: 'ICE',
    name: 'Impuesto a los Consumos Especiales',
    shortName: 'ICE',
    badgeBg: 'bg-[#F97316]/15',
    badgeText: 'text-[#FB923C]',
    badgeBorder: 'border-[#F97316]/40',
    description: 'Arts. 75 al 88: Bienes y servicios gravados con ICE, base y tarifas'
  },
  ISD: {
    code: 'ISD',
    name: 'Impuesto a la Salida de Divisas y Otros',
    shortName: 'ISD / Otros',
    badgeBg: 'bg-[#A855F7]/15',
    badgeText: 'text-[#C084FC]',
    badgeBorder: 'border-[#A855F7]/40',
    description: 'Régimen de transferencias al exterior y tributos complementarios'
  },
  GENERAL: {
    code: 'GENERAL',
    name: 'Régimen General y Disposiciones',
    shortName: 'General',
    badgeBg: 'bg-[#64748B]/15',
    badgeText: 'text-[#CBD5E1]',
    badgeBorder: 'border-[#64748B]/40',
    description: 'Disposiciones transitorias, generales, reformatorias y Código Tributario'
  }
};

export const getArticleTaxScope = (art: NormStructure): TaxScopeConfig => {
  const title = (art.parent_title || '').toUpperCase();
  const label = art.label || '';
  const matchArtNum = label.match(/(\d+)/);
  const artNum = matchArtNum ? parseInt(matchArtNum[1], 10) : 0;

  if (title.includes('RENTA') || title.includes('PRIMERO') || (artNum >= 1 && artNum <= 51 && !art.structure_type?.startsWith('transitory'))) {
    return TAX_SCOPES.RENTA;
  }
  if (title.includes('VALOR AGREGADO') || title.includes('IVA') || title.includes('SEGUNDO') || (artNum >= 52 && artNum <= 74)) {
    return TAX_SCOPES.IVA;
  }
  if (title.includes('CONSUMOS ESPECIALES') || title.includes('ICE') || title.includes('TERCERO') || (artNum >= 75 && artNum <= 88)) {
    return TAX_SCOPES.ICE;
  }
  if (title.includes('DIVISAS') || title.includes('ISD')) {
    return TAX_SCOPES.ISD;
  }
  return TAX_SCOPES.GENERAL;
};

// ============================================================================
// MODELO Y RESOLUCIÓN DE CASCADA JERÁRQUICA (LEY -> REGLAMENTO -> RESOLUCIÓN SRI)
// ============================================================================
export interface SecondaryCascadeItem {
  id: string;
  level: 'reglamento' | 'resolucion' | 'circular';
  levelLabel: string;
  normName: string;
  normCode: string;
  articleLabel: string;
  articleTitle: string;
  content: string;
  legalStatus: LegalStatus;
  relationNote: string;
  childItems?: SecondaryCascadeItem[];
}

export const getSecondaryCascadeForArticle = (
  art: NormStructure | null | undefined,
  dbRelations: any[],
  allVersionIds?: string[]
): SecondaryCascadeItem[] => {
  if (!art) return [];

  const targetIds = allVersionIds && allVersionIds.length > 0 ? allVersionIds : [art.id];

  // 1. Verificar si existen relaciones explícitas en la base de datos Supabase (incluyendo todas las versiones del artículo)
  const dbLinked = dbRelations.filter(
    r => targetIds.includes(r.source_structure_id) || targetIds.includes(r.target_structure_id)
  );

  if (dbLinked.length > 0) {
    return dbLinked.map(r => {
      const linked = targetIds.includes(r.source_structure_id) ? r.target : r.source;
      const isResolution = linked?.norms?.norm_type === 'resolution' || linked?.norms?.norm_type === 'sri_resolution' || linked?.norms?.code?.includes('NAC') || linked?.norms?.code?.includes('RES');
      const isCircular = linked?.norms?.norm_type === 'circular' || linked?.norms?.code?.includes('CIRC') || linked?.norms?.code?.includes('FE-ERRATAS');
      const level = isResolution ? 'resolucion' : isCircular ? 'circular' : 'reglamento';

      return {
        id: r.id,
        level,
        levelLabel: isResolution ? 'Resolución SRI / Tribunal Constitucional' : isCircular ? 'Fe de Erratas / Circular Oficial' : 'Norma Concordante / Reformatoria',
        normName: linked?.norms?.title || linked?.norms?.name || 'Norma Conectada en Registro Oficial',
        normCode: linked?.norms?.code || 'RO',
        articleLabel: linked?.label || 'Art. Concordante',
        articleTitle: linked?.title || '',
        content: linked?.content || '',
        legalStatus: linked?.legal_status || 'vigente',
        relationNote: r.notes || r.description || `Concordancia con ${art.label}`
      };
    });
  }

  // 2. Concordancias normativas oficiales precargadas para artículos clave de Ecuador
  const artNumMatch = art.label?.match(/\d+/);
  const artNum = artNumMatch ? parseInt(artNumMatch[0], 10) : 0;

  if (artNum === 36) {
    return [
      {
        id: 'cascade-ralrti-art73',
        level: 'reglamento',
        levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
        normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
        normCode: 'RALRTI',
        articleLabel: 'Art. 73',
        articleTitle: 'Cálculo y Liquidación de Impuesto a la Renta de Personas Naturales y Sucesiones Indivisas',
        content: 'Para liquidar el impuesto a la renta de las personas naturales y de las sucesiones indivisas, se aplicará a la base imponible la tabla de tarifas contenida en el artículo 36 de la Ley.\n\nLa base imponible se determinará sumando los ingresos gravados de fuente ecuatoriana y del exterior, restando las devoluciones, descuentos, costos y gastos deducibles, así como las exoneraciones aplicables.\n\nEl Servicio de Rentas Internas publicará anualmente mediante resolución de carácter general la tabla de tarifas actualizada por el índice de precios al consumidor (INEC) que regirá para el siguiente ejercicio impositivo.',
        legalStatus: 'vigente',
        relationNote: 'Reglamenta el método de cálculo de la base imponible y delegación anual de rangos al SRI.',
        childItems: [
          {
            id: 'cascade-sri-res37',
            level: 'resolucion',
            levelLabel: 'Resolución Ejecutoria del SRI (Norma Hija)',
            normName: 'Resolución de Rangos de Tarifas de Impuesto a la Renta',
            normCode: 'SRI-NAC-DGERCGC24-00000037',
            articleLabel: 'Art. 1',
            articleTitle: 'Fijación de Rangos de la Tabla de Impuesto a la Renta Personas Naturales',
            content: 'Fíjense los rangos de la tabla del artículo 36 literal a) de la Ley de Régimen Tributario Interno para la liquidación del impuesto a la renta correspondiente al ejercicio fiscal vigente:\n\n| Fracción Básica ($) | Exceso Hasta ($) | Impuesto Fracción Básica ($) | % Impuesto Fracción Excedente |\n| :--- | :--- | :--- | :--- |\n| $ 0.00 | $ 11,902.00 | $ 0.00 | 0% |\n| $ 11,902.00 | $ 15,159.00 | $ 0.00 | 5% |\n| $ 15,159.00 | $ 19,641.00 | $ 162.85 | 10% |\n| $ 19,641.00 | $ 26,031.00 | $ 611.05 | 12% |\n| $ 26,031.00 | $ 34,255.00 | $ 1,377.85 | 15% |\n| $ 34,255.00 | $ 45,407.00 | $ 2,611.45 | 20% |\n| $ 45,407.00 | $ 60,450.00 | $ 4,841.85 | 25% |\n| $ 60,450.00 | $ 80,605.00 | $ 8,602.60 | 30% |\n| $ 80,605.00 | $ 107,199.00 | $ 14,649.10 | 35% |\n| $ 107,199.00 | En adelante | $ 23,957.00 | 37% |',
            legalStatus: 'vigente',
            relationNote: 'Fija los límites cuantitativos anuales del Art. 36 LRTI conforme al mandato del Art. 73 RALRTI.'
          }
        ]
      }
    ];
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
        content: 'Para los efectos del artículo 55 de la Ley, los productos de origen agrícola, avícola, pecuario, apícola, cunícola, bioacuáticos y carnes que se comercialicen en estado natural mantendrán la tarifa cero de IVA aun cuando hayan sido sometidos a procesos de enfriamiento, refrigeración, congelamiento, corte, desmote, empaque o envasado.\n\nNo se considerará transformación física ni química la adición de conservantes simples destinados exclusivamente a mantener la vida útil del producto perecible en anaquel.',
        legalStatus: 'vigente',
        relationNote: 'Delimita el concepto de estado natural y conservación de tarifa 0% de IVA.',
        childItems: [
          {
            id: 'cascade-sri-circ02',
            level: 'circular',
            levelLabel: 'Circular Aclaratoria del SRI (Norma Hija)',
            normName: 'Circular sobre Cadena Agropecuaria e Insumos Exentos de IVA',
            normCode: 'SRI-NAC-DGECCGC24-00000002',
            articleLabel: 'Criterio Vinculante',
            articleTitle: 'Tratamiento Tributario en Transferencias de Insumos Agropecuarios',
            content: 'El Servicio de Rentas Internas recuerda a los contribuyentes que la comercialización y transferencia local de semillas certificadas, bulbos, esquejes, fertilizantes, abonos y balanceados gozan de tarifa cero de IVA en cualquier fase de distribución, debiendo emitir comprobantes de venta electrónicos con el código de tarifa respectivo sin trasladar gravamen al adquirente.',
            legalStatus: 'vigente',
            relationNote: 'Criterio de cumplimiento obligatorio para la emisión de comprobantes bajo Art. 55 LRTI.'
          }
        ]
      }
    ];
  }

  if (artNum === 1) {
    return [
      {
        id: 'cascade-ralrti-art1',
        level: 'reglamento',
        levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
        normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
        normCode: 'RALRTI',
        articleLabel: 'Art. 1',
        articleTitle: 'Materia Imponible y Sujetos del Impuesto a la Renta',
        content: 'Son objeto del impuesto a la renta los ingresos de fuente ecuatoriana obtenidos a título gratuito o a título oneroso, consistentes en dinero, especies o servicios, devengados o percibidos en el ejercicio impositivo por personas naturales, sucesiones indivisas y sociedades nacionales o extranjeras con establecimiento permanente en el Ecuador.',
        legalStatus: 'vigente',
        relationNote: 'Reglamenta el hecho generador y la territorialidad del Art. 1 de la Ley.'
      }
    ];
  }

  if (artNum === 10) {
    return [
      {
        id: 'cascade-ralrti-art28',
        level: 'reglamento',
        levelLabel: 'Reglamento para la Aplicación de la LRTI (RALRTI)',
        normName: 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno',
        normCode: 'RALRTI',
        articleLabel: 'Art. 28',
        articleTitle: 'Gastos Deducibles Ordinarios y Necesarios',
        content: 'Son deducibles todos los costos y gastos imputables a la generación de ingresos gravados. Los gastos financieros, sueldos, aportes al IESS y depreciaciones deberán estar sustentados en comprobantes de venta válidos emitidos de conformidad con el Reglamento de Comprobantes de Venta, Retención y Documentos Complementarios.',
        legalStatus: 'vigente',
        relationNote: 'Establece los requisitos y límites de deducibilidad para el Art. 10 de la Ley.'
      }
    ];
  }

  return [];
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
}

export const getHistoricalVersionsForArticle = (
  art: NormStructure | null | undefined,
  dbVersions: NormStructure[]
): HistoricalArticleVersion[] => {
  if (!art) return [];

  // 1. PRIORIDAD ABSOLUTA: Versiones reales del Registro Oficial almacenadas en Supabase
  if (dbVersions.length > 1) {
    const seen = new Set<string>();
    const uniqueDbVersions = [...dbVersions]
      .sort((a, b) => {
        const da = a.valid_from || '';
        const db = b.valid_from || '';
        if (da !== db) return db.localeCompare(da);
        return b.version_number - a.version_number;
      })
      .filter(v => {
        const key = `${v.version_number}-${(v.content || '').slice(0, 60)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return uniqueDbVersions.map((v, idx) => {
      const parsedYear = v.valid_from ? Number(v.valid_from.slice(0, 4)) : (2006 - idx);
      const year = isNaN(parsedYear) ? (2006 - idx) : parsedYear;
      const cite = v.reform_source_cite || (v.is_current ? 'Texto Vigente Consolidado' : `Reforma v${v.version_number}`);
      const roDate = v.ro_published_on || null;
      const ro = v.official_registry || (roDate ? `Registro Oficial (${roDate})` : 'Registro Oficial');
      return {
        id: v.id,
        version_number: uniqueDbVersions.length - idx,
        version_year: year,
        is_current: v.is_current,
        reform_cite: cite,
        official_registry: ro,
        valid_from: v.valid_from || '—',
        valid_to: v.valid_to || (v.is_current ? 'Presente (Vigente)' : 'Reforma posterior'),
        summary_change: v.summary_change || (v.is_current ? 'Texto consolidado vigente tras las reformas del Registro Oficial.' : `Redacción vigente desde ${v.valid_from || 'origen'} hasta ${v.valid_to || 'su reforma'}.`),
        content: v.content,
        legal_status: v.is_current ? v.legal_status : 'derogado',
        ro_published_on: roDate,
        tax_periodicity: v.tax_periodicity || null,
        validity_rule: v.validity_rule || null,
        is_fe_erratas_replaced: v.is_fe_erratas_replaced,
        validity_display_label: v.validity_display_label || null,
        manual_validity_override: v.manual_validity_override,
        raw_valid_from: v.valid_from,
        raw_valid_to: v.valid_to
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
      raw_valid_to: art.valid_to
    }
  ];
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================
export default function App() {
  // Navigation View & Auth State
  const [currentView, setCurrentView] = useState<'landing' | 'portal'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login'>('register');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Navigation & Simulation State
  const [activeTab, setActiveTab] = useState<MainTab>('reader');
  const [currentPlan, setCurrentPlan] = useState<PlanCode>('professional');
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAddConceptModal, setShowAddConceptModal] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  // Filter & Selection State (Outlook 3-pane)
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [selectedNormId, setSelectedNormId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | LegalStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedDateSearch, setShowAdvancedDateSearch] = useState<boolean>(false);
  const [searchValidFrom, setSearchValidFrom] = useState<string>('');
  const [searchValidTo, setSearchValidTo] = useState<string>('');
  const [selectedArticleLabel, setSelectedArticleLabel] = useState<string>('Art. 36');
  const [ebookNavMode, setEbookNavMode] = useState<'index' | 'tax' | 'flat'>('index');
  const [selectedTaxFilter, setSelectedTaxFilter] = useState<TaxScopeCode>('ALL');
  const [expandedInlineCascade, setExpandedInlineCascade] = useState<Record<string, boolean>>({});
  const [floatingEbookModal, setFloatingEbookModal] = useState<SecondaryCascadeItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
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
          rawNorm.normative_type === 'resolution' ||
          rawNorm.normative_type === 'circular',
        drive_folder_path: rawNorm.metadata?.folder_category || '02_leyes',
        storage_object_path: `${rawNorm.metadata?.folder_category || '02_leyes'}/${rawNorm.code}.pdf`
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
    } else {
      formattedLabel = ident ? `Disp. ${ident}` : 'Disposición';
    }

    // Normalizar la etiqueta eliminando dos puntos o signos finales
    formattedLabel = formattedLabel.replace(/[:.-]+$/, '').trim();

    // Limpieza profunda del título para evitar duplicaciones (ej. Art. 36: Art. 36: Tarifa...)
    cleanTitle = cleanTitle
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

    return {
      id: s.id,
      norm_id: s.norm_versions?.norm_id || s.norm_id || mappedNorm?.id || '',
      identifier: ident,
      label: formattedLabel,
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
      ro_published_on: s.metadata?.ro_published_on || null,
      tax_periodicity: s.metadata?.tax_periodicity || null,
      validity_rule: s.metadata?.validity_rule || null,
      is_fe_erratas: Boolean(s.metadata?.is_fe_erratas),
      is_fe_erratas_replaced: Boolean(s.metadata?.is_fe_erratas_replaced),
      validity_display_label: s.metadata?.validity_display_label || null,
      manual_validity_override: Boolean(s.metadata?.manual_validity_override)
    };
  };

  // Load all data from Supabase
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        conceptsRes,
        normsRes,
        structuresRes,
        tablesRes,
        conceptLinksRes,
        relationsRes,
        formLinksRes,
        annexLinksRes,
        discoveriesRes,
        taxpayerRes
      ] = await Promise.all([
        supabase.from('tax_concepts').select('*').order('name'),
        supabase.from('norms').select('*').order('name'),
        supabase
          .from('normative_structures')
          .select('*, norm_versions(*, norms(*))')
          .order('ordinal'),
        supabase.from('normative_tables').select('*').order('code'),
        supabase.from('structure_tax_concepts').select('*, tax_concepts(*)'),
        supabase
          .from('structure_relations')
          .select(
            '*, source:normative_structures!source_structure_id(*, norm_versions(*, norms(*))), target:normative_structures!target_structure_id(*, norm_versions(*, norms(*))), discovery:norm_discovery!target_discovery_id(*)'
          ),
        supabase.from('structure_forms').select('*, forms(*)'),
        supabase.from('structure_annexes').select('*, annexes(*)'),
        supabase.from('norm_discovery').select('*').order('created_at', { ascending: false }),
        supabase.from('taxpayer_types').select('*').order('name'),
        supabase.from('normative_discrepancies').select('*').order('created_at', { ascending: false })
      ]);

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
          normsRes.data.map((n: any) => ({
            id: n.id,
            code: n.code,
            title: n.name || n.title || n.code,
            norm_type: n.normative_type || 'law',
            hierarchy_level: String(n.metadata?.hierarchy_level || '1'),
            is_secondary:
              n.normative_type === 'regulation' ||
              n.normative_type === 'resolution' ||
              n.normative_type === 'circular',
            drive_folder_path:
              n.metadata?.folder_category ||
              (n.code === 'CT'
                ? '01_codigos'
                : n.code === 'RLRTI'
                  ? '03_reglamentos'
                  : n.code.includes('DGER')
                    ? '05_resoluciones_sri'
                    : n.code.includes('DGECC')
                      ? '06_circulares_sri'
                      : '02_leyes'),
            storage_object_path: `${n.metadata?.folder_category || '02_leyes'}/${n.code}.pdf`
          }))
        );
      }

      if (structuresRes.data) {
        setStructures(structuresRes.data.map(mapStructureRow));
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
            notes: t.notes || null
          }))
        );
      }

      if (conceptLinksRes.data) setConceptLinks(conceptLinksRes.data);

      if (relationsRes.data) {
        setRelations(
          relationsRes.data.map((r: any) => ({
            ...r,
            notes: r.description || r.notes || '',
            source: r.source ? mapStructureRow(r.source) : null,
            target: r.target ? mapStructureRow(r.target) : null
          }))
        );
      }

      if (formLinksRes.data) {
        setFormLinks(
          formLinksRes.data.map((fl: any) => ({
            ...fl,
            id: fl.id || `${fl.structure_id}-${fl.form_id}`,
            tax_form_box_reference: fl.casillero_code
              ? `Casillero ${fl.casillero_code}`
              : fl.notes || 'General'
          }))
        );
      }

      if (annexLinksRes.data) {
        setAnnexLinks(
          annexLinksRes.data.map((al: any) => ({
            ...al,
            id: al.id || `${al.structure_id}-${al.annex_id}`,
            compliance_note: al.notes || 'Reporte obligatorio'
          }))
        );
      }

      if (discoveriesRes.data) setDiscoveries(discoveriesRes.data);
      if (taxpayerRes.data) setTaxpayerTypes(taxpayerRes.data);
      if ((discrepanciesRes as any)?.data) setDiscrepancies((discrepanciesRes as any).data);
    } finally {
      setLoading(false);
    }
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
      .then(({ data, error }) => setIsAdmin(!error && Boolean(data)));
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

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    setCurrentPlan('free');
    setCurrentView('portal');
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

  const effectiveNormId = selectedNormId || (!searchQuery.trim() && !searchValidFrom && !searchValidTo ? defaultLrtiNormId : null);

  // Group structures by (norm_id + label) so we show current version in center list
  // or the version in force during [searchValidFrom, searchValidTo] when Option B is active
  const currentArticles = useMemo(() => {
    const hasDateFilter = Boolean(searchValidFrom || searchValidTo);
    const queryFrom = searchValidFrom || '0001-01-01';
    const queryTo = searchValidTo || '9999-12-31';

    const candidateArticles = structures.filter(s => {
      if (s.structure_type === 'title' || s.structure_type === 'chapter') return false;
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
        if (newDate > exDate || (newDate === exDate && art.version_number > existing.version_number)) {
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

  // Currently selected article & all its historical versions (coincidencia estricta por norma + etiqueta)
  const selectedVersions = useMemo(() => {
    const target = (selectedArticleLabel || 'Art. 36').trim();
    const targetNormId = selectedNormId || currentArticles.find(a => a.label === target)?.norm_id || defaultLrtiNormId;
    const targetNumMatch = target.match(/\b\d+\b/);
    const targetNum = targetNumMatch ? targetNumMatch[0] : null;

    const matched = structures.filter(s => {
      if (s.structure_type === 'title' || s.structure_type === 'chapter') return false;
      if (targetNormId && s.norm_id !== targetNormId) return false;

      if (targetNum && /^Art/i.test(target)) {
        if (s.identifier && s.identifier.trim() === targetNum) return true;
        const sNumMatch = (s.label || '').match(/\b\d+\b/);
        if (sNumMatch && sNumMatch[0] === targetNum && /^Art/i.test(s.label || '')) return true;
        return false;
      }

      const cleanTarget = target.replace(/[:.-]+$/, '').trim().toLowerCase();
      const cleanArtLabel = (s.label || '').replace(/[:.-]+$/, '').trim().toLowerCase();
      return cleanArtLabel === cleanTarget;
    });

    return matched.sort((a, b) => {
      const da = a.valid_from || '';
      const db = b.valid_from || '';
      if (da !== db) return db.localeCompare(da);
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

  // Tables attached to the currently selected article (or any of its historical versions)
  const articleTables = useMemo(() => {
    if (!activeCurrentArticle) return [];
    const versionIds = selectedVersions.map(v => v.id);
    return tables
      .filter(t => t.structure_id === activeCurrentArticle.id || versionIds.includes(t.structure_id))
      .sort((a, b) => b.fiscal_year - a.fiscal_year);
  }, [tables, activeCurrentArticle, selectedVersions]);

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

  // Trazabilidad histórica completa (Versión vigente + Reformas anteriores)
  const articleHistoricalVersions = useMemo(() => {
    return getHistoricalVersionsForArticle(activeCurrentArticle, selectedVersions);
  }, [activeCurrentArticle, selectedVersions]);

  // Conteo de artículos por cada impuesto troncal
  const taxCounts = useMemo(() => {
    const counts: Record<TaxScopeCode, number> = {
      ALL: currentArticles.length,
      RENTA: 0,
      IVA: 0,
      ICE: 0,
      ISD: 0,
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
          s.structure_type !== 'chapter'
      )
      .sort(sortLegalStructures);
  }, [structures]);

  // ============================================================================
  // INTERACTIVE CALCULATOR LOGIC (USING LIVE SUPABASE NORMATIVE_TABLES)
  // ============================================================================
  const irTable = useMemo(
    () =>
      tables.find(t => t.table_code === 'TBL_IR_PN_2026') ||
      tables.find(t => t.table_code === 'TBL_IR_PN_2006') ||
      tables.find(t => t.table_code === 'TBL_IR_PN_2005') ||
      tables.find(t => t.table_code === 'TBL_IR_PN_2004') ||
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

  // ============================================================================
  // RENDER LANDING PAGE VIEW
  // ============================================================================
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenRegister={handleOpenRegister}
          onOpenLogin={handleOpenLogin}
          onSelectPlan={plan => {
            if (plan === 'free') {
              handleOpenRegister();
            } else {
              handleGeneratePlacetoPaySession(plan, plan === 'premium' ? 19 : 39);
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
    <div className="min-h-screen flex flex-col bg-[#302E2B] text-white selection:bg-[#81B64C] selection:text-white">
      {/* TOP HEADER BAR (CHESS.COM DARK SLATE) */}
      <header className="h-16 bg-[#21201D] border-b border-[#3C3A36] px-5 flex items-center justify-between sticky top-0 z-40">
        {/* Brand Logo con Cubo de Rubik 2x2 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-1 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm">
            <RubikCubeLogo size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-black tracking-tight text-white">
                SmartLex<span className="text-[#3ECF8E]">EC</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#3C3A36] text-[#3ECF8E] border border-[#3ECF8E]/30">
                Integración Legal 2026
              </span>
            </div>
            <p className="text-[11px] text-[#9E9C98]">
              Ecosistema Normativo • Semáforo de Vigencia • Google Drive + Supabase Mirror
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#262522] p-1 rounded-xl border border-[#3C3A36]">
          <button
            onClick={() => setActiveTab('reader')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'reader'
              ? 'btn-chess-green'
              : 'text-[#BAB8B5] hover:text-white hover:bg-[#302E2B]'
              }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Matriz Normativa (3 Paneles)</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'tables'
              ? 'btn-chess-green'
              : 'text-[#BAB8B5] hover:text-white hover:bg-[#302E2B]'
              }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Tablas Tributarias</span>
            <span className="px-1.5 py-0.5 bg-black/30 rounded text-[10px]">{tables.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('calculators')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'calculators'
              ? 'btn-chess-green'
              : 'text-[#BAB8B5] hover:text-white hover:bg-[#302E2B]'
              }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadoras SRI</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'chat'
              ? 'btn-chess-green'
              : 'text-[#BAB8B5] hover:text-white hover:bg-[#302E2B]'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chatbot IA ({100 - chatUsed}/100)</span>
          </button>

          <button
            onClick={() => setActiveTab('reviewer')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'reviewer'
              ? 'btn-chess-green'
              : 'text-[#BAB8B5] hover:text-white hover:bg-[#302E2B]'
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Control y Discrepancias</span>
            {discrepancies.filter(d => d.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#FA412D] text-white font-black text-[10px]">
                {discrepancies.filter(d => d.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#81B64C]/15 text-[#81B64C] hover:bg-[#81B64C] hover:text-black transition border border-[#81B64C]/30 cursor-pointer shadow-sm"
            title="Subir nuevo documento PDF para procesamiento con IA"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir PDF</span>
          </button>
        </nav>

        {/* Plan Switcher Simulator & WhatsApp / PlacetoPay Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#262522] rounded-lg p-1 border border-[#3C3A36] text-xs">
            <span className="px-2 text-[11px] text-[#9E9C98] font-semibold">Vista Plan:</span>
            <button
              onClick={() => setCurrentPlan('free')}
              className={`px-2.5 py-1 rounded font-bold transition ${currentPlan === 'free'
                ? 'bg-[#3C3A36] text-white'
                : 'text-[#9E9C98] hover:text-white'
                }`}
            >
              Free ($0)
            </button>
            <button
              onClick={() => setCurrentPlan('premium')}
              className={`px-2.5 py-1 rounded font-bold transition ${currentPlan === 'premium'
                ? 'bg-[#F7C631] text-black'
                : 'text-[#9E9C98] hover:text-white'
                }`}
            >
              Pro ($4.99)
            </button>
            <button
              onClick={() => setCurrentPlan('professional')}
              className={`px-2.5 py-1 rounded font-bold transition ${currentPlan === 'professional'
                ? 'bg-[#81B64C] text-white'
                : 'text-[#9E9C98] hover:text-white'
                }`}
            >
              Plus ($9.99)
            </button>
          </div>

          <button
            onClick={() => setShowSubModal(true)}
            className="btn-chess-green px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>Suscripción</span>
          </button>

          {/* Botón para volver a la Landing Page espacial */}
          <button
            onClick={() => setCurrentView('landing')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#262522] border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-950/40 transition flex items-center gap-1.5 cursor-pointer"
            title="Ver la Landing Page de SmartLex"
          >
            <span>🏠 Ver Landing</span>
          </button>

          {/* Información de usuario o botón de salida */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-[#3C3A36]">
              <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {userProfile?.whatsapp_phone || currentUser.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-2 py-1 rounded-md text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/40 transition cursor-pointer"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenLogin}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition cursor-pointer"
            >
              Ingresar
            </button>
          )}
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {checkoutToast && (
        <div className="bg-[#81B64C] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>{checkoutToast}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: OUTLOOK 3-PANE NORMATIVE READER                               */}
      {/* ==================================================================== */}
      {activeTab === 'reader' && (
        <div className="flex-1 grid grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
          {/* LEFT PANE (Cols 1-3): EJE VERTICAL (CONCEPTOS) + CUERPOS LEGALES */}
          <aside className="col-span-3 bg-[#21201D] border-r border-[#3C3A36] flex flex-col overflow-y-auto p-4 space-y-6">
            {/* Traffic-Light Visual Legend Card */}
            <div className="bg-[#262522] border border-[#3C3A36] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9E9C98]">
                  Semáforo de Vigencia Legal
                </span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-[11px] text-[#81B64C] hover:underline font-bold"
                >
                  Ver Todos
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() =>
                    setStatusFilter(statusFilter === 'vigente' ? 'all' : 'vigente')
                  }
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition text-left ${statusFilter === 'vigente'
                    ? 'bg-[#302E2B] border-[#81B64C]'
                    : 'border-transparent hover:bg-[#302E2B]/60'
                    }`}
                >
                  <LegalStatusButton status="vigente" size="sm" />
                  <span className="text-[11px] text-[#BAB8B5]">Sin reformas</span>
                </button>

                <button
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === 'vigente_reformado' ? 'all' : 'vigente_reformado'
                    )
                  }
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition text-left ${statusFilter === 'vigente_reformado'
                    ? 'bg-[#302E2B] border-[#F7C631]'
                    : 'border-transparent hover:bg-[#302E2B]/60'
                    }`}
                >
                  <LegalStatusButton status="vigente_reformado" size="sm" />
                  <span className="text-[11px] text-[#BAB8B5]">Con historial</span>
                </button>

                <button
                  onClick={() =>
                    setStatusFilter(statusFilter === 'derogado' ? 'all' : 'derogado')
                  }
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition text-left ${statusFilter === 'derogado'
                    ? 'bg-[#302E2B] border-[#FA412D]'
                    : 'border-transparent hover:bg-[#302E2B]/60'
                    }`}
                >
                  <LegalStatusButton status="derogado" size="sm" />
                  <span className="text-[11px] text-[#BAB8B5]">Inaplicable hoy</span>
                </button>
              </div>
            </div>

            {/* EJE VERTICAL: CONCEPTOS TRIBUTARIOS (DINÁMICOS) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9E9C98] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#81B64C]" />
                  <span>Eje Vertical: Conceptos</span>
                </h3>
                <button
                  onClick={() => setShowAddConceptModal(true)}
                  className="text-[11px] font-bold text-[#81B64C] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedConceptId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition ${selectedConceptId === null
                    ? 'bg-[#81B64C] text-white'
                    : 'text-[#DFDFDE] hover:bg-[#262522]'
                    }`}
                >
                  <span>Todos los Conceptos Tributarios</span>
                  <span className="text-[10px] opacity-80">{concepts.length}</span>
                </button>

                {concepts.map(c => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedConceptId(selectedConceptId === c.id ? null : c.id)
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${c.parent_id ? 'pl-6 text-[11px]' : 'font-bold'
                      } ${selectedConceptId === c.id
                        ? 'bg-[#81B64C] text-white font-bold'
                        : 'text-[#BAB8B5] hover:bg-[#262522] hover:text-white'
                      }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {c.code === 'TARIFAS' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7C631]/20 text-[#F7C631] font-bold">
                        Tablas
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* JERARQUÍA NORMATIVA (CARPETAS ESPEJO DRIVE / SUPABASE) */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9E9C98] flex items-center gap-1.5 mb-2">
                <FolderOpen className="w-3.5 h-3.5 text-[#F7C631]" />
                <span>Cuerpos Normativos (Espejo PDF)</span>
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedNormId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition ${selectedNormId === null
                    ? 'bg-[#3C3A36] text-white'
                    : 'text-[#BAB8B5] hover:bg-[#262522]'
                    }`}
                >
                  Todas las Normas ({norms.length})
                </button>

                {norms.map(n => {
                  const lockedForFree = currentPlan === 'free' && n.is_secondary;
                  return (
                    <button
                      key={n.id}
                      onClick={() =>
                        setSelectedNormId(selectedNormId === n.id ? null : n.id)
                      }
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${selectedNormId === n.id
                        ? 'bg-[#3C3A36] text-white font-bold border-l-4 border-[#81B64C]'
                        : 'text-[#BAB8B5] hover:bg-[#262522]'
                        }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{n.code}</span>
                          {lockedForFree && <Lock className="w-3 h-3 text-[#F7C631]" />}
                        </div>
                        <div className="text-[10px] text-[#9E9C98] truncate">{n.title}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B1A17] text-[#9E9C98] shrink-0">
                        {n.drive_folder_path || '02_leyes'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* CENTER PANE (Cols 4-6): LISTA DE ARTÍCULOS CON SEMÁFORO DE VIGENCIA */}
          <section className="col-span-3 bg-[#262522] border-r border-[#3C3A36] flex flex-col overflow-hidden">
            {/* Search bar & E-Book view mode toggle */}
            <div className="p-3.5 border-b border-[#3C3A36] bg-[#21201D] space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9E9C98] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar ej: Art. 36, Huaquillas, loterías..."
                    className="w-full bg-[#302E2B] border border-[#3C3A36] focus:border-[#81B64C] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9E9C98] outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowAdvancedDateSearch(prev => !prev)}
                  title="Opción B: Búsqueda Avanzada por Fecha de Vigencia (Inicio / Fin)"
                  className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer shrink-0 ${showAdvancedDateSearch || searchValidFrom || searchValidTo
                      ? 'bg-[#F7C631]/20 border-[#F7C631] text-[#F7C631]'
                      : 'bg-[#302E2B] border-[#3C3A36] text-[#BAB8B5] hover:text-white hover:border-[#81B64C]/50'
                    }`}
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>Vigencia</span>
                </button>
              </div>

              {/* OPCIÓN B: BÚSQUEDA AVANZADA POR RANGO DE FECHAS DE VIGENCIA */}
              {(showAdvancedDateSearch || searchValidFrom || searchValidTo) && (
                <div className="p-2.5 rounded-xl bg-[#1B1A17] border border-[#F7C631]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#F7C631] flex items-center gap-1">
                      <Hourglass className="w-3 h-3" />
                      Búsqueda Avanzada por Fecha de Vigencia
                    </span>
                    {(searchValidFrom || searchValidTo) && (
                      <button
                        onClick={() => {
                          setSearchValidFrom('');
                          setSearchValidTo('');
                        }}
                        className="text-[10px] text-[#FA412D] hover:underline font-bold cursor-pointer"
                      >
                        Restablecer hoy
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#9E9C98] font-semibold mb-0.5">
                        Fecha Inicio (Desde)
                      </label>
                      <input
                        type="date"
                        value={searchValidFrom}
                        onChange={e => setSearchValidFrom(e.target.value)}
                        className="w-full bg-[#262522] border border-[#3C3A36] focus:border-[#F7C631] rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#9E9C98] font-semibold mb-0.5">
                        Fecha Fin (Hasta)
                      </label>
                      <input
                        type="date"
                        value={searchValidTo}
                        onChange={e => setSearchValidTo(e.target.value)}
                        className="w-full bg-[#262522] border border-[#3C3A36] focus:border-[#F7C631] rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Atajos cronológicos de vigencia tributaria (Art. 11 Código Tributario) */}
                  <div className="pt-1 border-t border-[#3C3A36]/60">
                    <div className="text-[9px] text-[#9E9C98] mb-1 font-semibold">
                      Períodos de vigencia tributaria (Art. 11 CT, 2004–2006):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'Vigencia Inicial Mensual (Dic 2004)', from: '2004-12-01', to: '2004-12-31' },
                        { label: 'Ejercicio Anual 2005 (Res. 773)', from: '2005-01-01', to: '2005-12-31' },
                        { label: 'Ejercicio Anual 2006 (Ley 20 / Res. 628)', from: '2006-01-01', to: '2006-03-31' },
                        { label: 'Huaquillas IVA 0% (Abr–Jun 2006)', from: '2006-04-01', to: '2006-06-30' },
                        { label: 'Post-Inconstitucionalidad (Jul 2006+)', from: '2006-07-01', to: '2006-12-31' }
                      ].map(preset => {
                        const activePreset = searchValidFrom === preset.from && searchValidTo === preset.to;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setSearchValidFrom(preset.from);
                              setSearchValidTo(preset.to);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${activePreset
                                ? 'bg-[#F7C631] text-black border-[#F7C631]'
                                : 'bg-[#262522] text-[#BAB8B5] border-[#3C3A36] hover:border-[#F7C631]/60 hover:text-white'
                              }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Navegación del E-Book: 2 Pestañas Principales */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1B1A17] rounded-xl border border-[#3C3A36]">
                <button
                  onClick={() => setEbookNavMode('index')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${ebookNavMode === 'index'
                    ? 'bg-[#81B64C] text-white shadow-md'
                    : 'text-[#BAB8B5] hover:text-white hover:bg-[#262522]'
                    }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#F7C631]" />
                  <span>📑 Índice Legal (PDF)</span>
                </button>
                <button
                  onClick={() => setEbookNavMode('tax')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${ebookNavMode === 'tax'
                    ? 'bg-[#81B64C] text-white shadow-md'
                    : 'text-[#BAB8B5] hover:text-white hover:bg-[#262522]'
                    }`}
                >
                  <Scale className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span>🏛️ Por Impuesto</span>
                </button>
              </div>

              {/* Barra de Filtro Rápido por Impuesto (solo en modo "Por Impuesto") */}
              {ebookNavMode === 'tax' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(['ALL', 'RENTA', 'IVA', 'ICE', 'ISD', 'GENERAL'] as TaxScopeCode[]).map(scopeCode => {
                    const scope = TAX_SCOPES[scopeCode];
                    const isSelected = selectedTaxFilter === scopeCode;
                    const count = taxCounts[scopeCode] || 0;

                    return (
                      <button
                        key={scopeCode}
                        onClick={() => setSelectedTaxFilter(scopeCode)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${isSelected
                          ? 'bg-[#81B64C] text-white border-[#81B64C]'
                          : 'bg-[#1C1B18] text-[#BAB8B5] border-[#3C3A36] hover:border-[#81B64C]/50 hover:text-white'
                          }`}
                      >
                        <span>{scope.shortName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30 text-white' : 'bg-[#302E2B] text-[#9E9C98]'
                            }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#9E9C98]">
                <span>
                  {ebookNavMode === 'tax' ? taxFilteredArticles.length : currentArticles.length} artículos encontrados
                </span>
                {selectedConceptId && (
                  <button
                    onClick={() => setSelectedConceptId(null)}
                    className="text-[#81B64C] hover:underline font-bold cursor-pointer"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>
            </div>

            {/* Article Cards or E-Book Tree */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#3C3A36]">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#9E9C98]">
                  Cargando matriz normativa desde Supabase...
                </div>
              ) : (ebookNavMode === 'tax' ? taxFilteredArticles : currentArticles).length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9E9C98]">
                  No hay artículos que coincidan con el filtro actual.
                </div>
              ) : ebookNavMode === 'index' ? (
                <div className="p-3 space-y-3">
                  {ebookTree.map((titleNode, tIdx) => {
                    const isTitleCollapsed = collapsedNodes[`title-${tIdx}`];
                    const chaptersList = Object.values(titleNode.chapters);
                    const totalArts =
                      titleNode.orphanArticles.length +
                      chaptersList.reduce((acc, c) => acc + c.articles.length, 0);

                    return (
                      <div
                        key={`title-${tIdx}`}
                        className="bg-[#21201D] border border-[#3C3A36] rounded-xl overflow-hidden shadow-sm"
                      >
                        {/* Header del Título */}
                        <button
                          onClick={() =>
                            setCollapsedNodes(prev => ({
                              ...prev,
                              [`title-${tIdx}`]: !prev[`title-${tIdx}`]
                            }))
                          }
                          className="w-full p-2.5 bg-[#262522] hover:bg-[#302E2B] transition flex items-center justify-between text-left cursor-pointer border-b border-[#3C3A36]/60"
                        >
                          <div className="flex items-center gap-2 pr-2">
                            <Bookmark className="w-4 h-4 text-[#F7C631] shrink-0" />
                            <span className="text-xs font-black text-white line-clamp-1">
                              {titleNode.titleText}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B1A17] text-[#81B64C] font-bold">
                              {totalArts}
                            </span>
                            {isTitleCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-[#9E9C98]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#9E9C98]" />
                            )}
                          </div>
                        </button>

                        {!isTitleCollapsed && (
                          <div className="p-2 space-y-2">
                            {/* Capítulos anidados */}
                            {chaptersList.map((chapNode, cIdx) => {
                              const chapKey = `chap-${tIdx}-${cIdx}`;
                              const isChapCollapsed = collapsedNodes[chapKey];

                              return (
                                <div
                                  key={chapKey}
                                  className="pl-2 border-l-2 border-[#3C3A36] space-y-1"
                                >
                                  <button
                                    onClick={() =>
                                      setCollapsedNodes(prev => ({
                                        ...prev,
                                        [chapKey]: !prev[chapKey]
                                      }))
                                    }
                                    className="w-full py-1 px-2 rounded hover:bg-[#262522] transition flex items-center justify-between text-left cursor-pointer"
                                  >
                                    <span className="text-[11px] font-bold text-[#BAB8B5] line-clamp-1 flex items-center gap-1">
                                      <FolderOpen className="w-3 h-3 text-[#81B64C]" />
                                      <span>{chapNode.chapterText}</span>
                                    </span>
                                    {isChapCollapsed ? (
                                      <ChevronRight className="w-3 h-3 text-[#9E9C98]" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-[#9E9C98]" />
                                    )}
                                  </button>

                                  {!isChapCollapsed && (
                                    <div className="pl-3 space-y-1 pt-1">
                                      {chapNode.articles.map(art => {
                                        const isSelected = art.label === selectedArticleLabel;
                                        return (
                                          <button
                                            key={art.id}
                                            onClick={() => setSelectedArticleLabel(art.label)}
                                            className={`w-full text-left p-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${isSelected
                                              ? 'bg-[#81B64C] text-white font-bold'
                                              : 'text-[#DFDFDE] hover:bg-[#262522]'
                                              }`}
                                          >
                                            <span className="truncate pr-1">
                                              {art.label} {art.title}
                                            </span>
                                            <span
                                              className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${isSelected
                                                ? 'bg-black/20 text-white'
                                                : 'bg-[#1B1A17] text-[#9E9C98]'
                                                }`}
                                            >
                                              {art.structure_type === 'article' ? 'Art' : 'Disp'}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Artículos sin capítulo bajo este título */}
                            {titleNode.orphanArticles.length > 0 && (
                              <div className="space-y-1 pl-2">
                                {titleNode.orphanArticles.map(art => {
                                  const isSelected = art.label === selectedArticleLabel;
                                  return (
                                    <button
                                      key={art.id}
                                      onClick={() => setSelectedArticleLabel(art.label)}
                                      className={`w-full text-left p-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${isSelected
                                        ? 'bg-[#81B64C] text-white font-bold'
                                        : 'text-[#DFDFDE] hover:bg-[#262522]'
                                        }`}
                                    >
                                      <span className="truncate pr-1">
                                        {art.label} {art.title}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${isSelected
                                          ? 'bg-black/20 text-white'
                                          : 'bg-[#1B1A17] text-[#9E9C98]'
                                          }`}
                                      >
                                        {art.structure_type === 'article' ? 'Art' : 'Disp'}
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
              ) : (
                (ebookNavMode === 'tax' ? taxFilteredArticles : currentArticles).map(art => {
                  const isSelected = art.label === selectedArticleLabel;
                  const hasTable = tables.some(t => t.structure_id === art.id);
                  const taxScope = getArticleTaxScope(art);

                  return (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArticleLabel(art.label)}
                      className={`p-4 cursor-pointer transition ${isSelected
                        ? 'bg-[#302E2B] border-l-4 border-[#81B64C]'
                        : 'hover:bg-[#302E2B]/50'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${taxScope.badgeBg} ${taxScope.badgeText} ${taxScope.badgeBorder}`}
                          >
                            {taxScope.shortName}
                          </span>
                          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#1B1A17] text-[#BAB8B5]">
                            {art.norms?.code || 'LRTI'} • {art.label}
                          </span>
                        </div>
                        {/* BOTÓN SEMÁFORO DE VIGENCIA */}
                        <LegalStatusButton status={art.legal_status} size="sm" />
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1 leading-snug">
                        {art.label}{art.title ? `: ${art.title}` : ''}
                      </h4>

                      <p className="text-xs text-[#9E9C98] line-clamp-2 leading-relaxed">
                        {art.content}
                      </p>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1B1A17] text-[#81B64C] border border-[#81B64C]/30">
                          {periodicityLabel(art.tax_periodicity)}:{' '}
                          {formatValidityRange(art.valid_from, art.valid_to, art.legal_status === 'derogado')}
                        </span>
                        {hasTable && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7C631]/15 text-[#F7C631] border border-[#F7C631]/40">
                            <Table2 className="w-3 h-3" /> Incluye Tabla Tarifaria
                          </span>
                        )}
                        {art.reform_source_cite && (
                          <span className="text-[10px] text-[#BAB8B5] bg-[#1B1A17] px-2 py-0.5 rounded">
                            {art.reform_source_cite}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT PANE (Cols 7-12): LECTOR PARALELO DE REFORMAS + TABLAS + CASCADA JERÁRQUICA */}
          <main className="col-span-6 bg-[#302E2B] flex flex-col overflow-y-auto p-6 space-y-6">
            {activeCurrentArticle ? (
              <>
                {/* BANNER DE FILTRO TEMPORAL ACTIVO (OPCIÓN B) */}
                {(searchValidFrom || searchValidTo) && (
                  <div className="bg-[#1C1810] border-2 border-[#F7C631] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <Hourglass className="w-5 h-5 text-[#F7C631] shrink-0" />
                      <div className="text-xs">
                        <div className="font-black text-[#F7C631] uppercase tracking-wider">
                          Consulta Histórica por Rango de Fechas Activa
                        </div>
                        <div className="text-[#DFDFDE] mt-0.5">
                          Mostrando la redacción vigente en el período consultado (
                          <strong>{searchValidFrom || 'Origen'}</strong> a{' '}
                          <strong>{searchValidTo || 'Presente'}</strong>) •{' '}
                          {periodicityLabel(activeCurrentArticle.tax_periodicity)}:{' '}
                          <span className="text-[#81B64C] font-bold">
                            {formatValidityRange(
                              activeCurrentArticle.valid_from,
                              activeCurrentArticle.valid_to,
                              activeCurrentArticle.legal_status === 'derogado'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#F7C631] text-black text-xs font-black hover:bg-[#e5b628] transition cursor-pointer"
                      >
                        Comparar en Línea de Tiempo
                      </button>
                      <button
                        onClick={() => {
                          setSearchValidFrom('');
                          setSearchValidTo('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#262522] text-[#BAB8B5] hover:text-white border border-[#3C3A36] text-xs font-bold transition cursor-pointer"
                      >
                        Ver Vigente Hoy
                      </button>
                    </div>
                  </div>
                )}

                {/* ARTICLE HEADER WITH LARGE TRAFFIC LIGHT BUTTON */}
                <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3C3A36] pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#81B64C] font-bold uppercase tracking-wider flex-wrap">
                        <span>{activeCurrentArticle.norms?.title}</span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black border ${getArticleTaxScope(activeCurrentArticle).badgeBg
                            } ${getArticleTaxScope(activeCurrentArticle).badgeText} ${getArticleTaxScope(activeCurrentArticle).badgeBorder
                            }`}
                        >
                          {getArticleTaxScope(activeCurrentArticle).name}
                        </span>
                        <span>•</span>
                        <span>
                          Carpeta Espejo:{' '}
                          {activeCurrentArticle.norms?.storage_object_path ||
                            '02_leyes/LRTI.pdf'}
                        </span>
                      </div>
                      <h1 className="font-heading text-2xl font-black text-white mt-1">
                        {activeCurrentArticle.label}{activeCurrentArticle.title ? `: ${activeCurrentArticle.title}` : ''}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#1B1A17] border border-[#81B64C]/40 text-[#81B64C] font-mono font-bold">
                          {periodicityLabel(activeCurrentArticle.tax_periodicity)}:{' '}
                          {formatValidityRange(
                            activeCurrentArticle.valid_from,
                            activeCurrentArticle.valid_to,
                            activeCurrentArticle.legal_status === 'derogado'
                          )}
                        </span>
                        {(activeCurrentArticle.official_registry || activeCurrentArticle.reform_source_cite) && (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#1B1A17] border border-[#3C3A36] text-[#DFDFDE] font-semibold">
                            📜 {activeCurrentArticle.official_registry || activeCurrentArticle.reform_source_cite}
                          </span>
                        )}
                        {isAdmin && (
                          <AdminValidityEditor
                            structureId={activeCurrentArticle.id}
                            initialFrom={activeCurrentArticle.valid_from}
                            initialTo={activeCurrentArticle.valid_to}
                            onSave={handleSaveValidity}
                          />
                        )}
                      </div>
                    </div>

                    {/* LARGE CHESS.COM TRAFFIC LIGHT VALIDITY INDICATOR + BOTÓN RELOJ DE ARENA HISTÓRICO + BOTÓN NOTIFICAR DISCREPANCIA */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Botón Notificar Discrepancia o Error */}
                        <button
                          onClick={() => handleOpenReportModal(activeCurrentArticle)}
                          title="Notificar un error, errata o sugerencia sobre este artículo"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#DFDFDE] hover:text-white bg-[#262522] hover:bg-[#302E2B] border border-[#3C3A36] hover:border-[#FA412D]/60 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Flag className="w-3.5 h-3.5 text-[#FA412D]" />
                          <span>Notificar error o sugerencia</span>
                        </button>

                        {/* Botón Reloj de Arena para abrir la Ventana Emergente de Historial */}
                        <button
                          onClick={() => setIsHistoryModalOpen(true)}
                          title="Abrir ventana emergente de evolución histórica y reformas pasadas"
                          className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-md bg-[#F7C631]/15 text-[#F7C631] border border-[#F7C631]/40 hover:bg-[#F7C631]/25 hover:border-[#F7C631]"
                        >
                          <Hourglass className="w-3.5 h-3.5 text-[#F7C631] animate-pulse" />
                          <span>Línea de Tiempo ({articleHistoricalVersions.length} versiones)</span>
                        </button>
                        <LegalStatusButton status={activeCurrentArticle.legal_status} size="lg" />
                      </div>
                      <span className="text-[11px] text-[#9E9C98]">
                        {activeCurrentArticle.legal_status === 'vigente' &&
                          'Texto original vigente sin alteraciones posteriores'}
                        {activeCurrentArticle.legal_status === 'vigente_reformado' &&
                          `Vigente con ${articleHistoricalVersions.length} reformas históricas registradas`}
                        {activeCurrentArticle.legal_status === 'derogado' &&
                          'Disposición expresamente derogada — solo consulta histórica'}
                      </span>
                    </div>
                  </div>

                  {/* HORIZONTAL COMPLIANCE BAR: FORMULARIOS Y ANEXOS VINCULADOS */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-[#9E9C98] mr-1">
                      Eje Horizontal (Cumplimiento):
                    </span>
                    {articleForms.map(fl => (
                      <span
                        key={fl.id}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-[#302E2B] border border-[#81B64C]/40 text-white"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#81B64C]" />
                        <span>
                          {fl.forms?.code} ({fl.tax_form_box_reference})
                        </span>
                      </span>
                    ))}
                    {articleAnnexes.map(al => (
                      <span
                        key={al.id}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-[#302E2B] border border-[#F7C631]/40 text-white"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#F7C631]" />
                        <span>
                          Anexo {al.annexes?.code}: {al.compliance_note}
                        </span>
                      </span>
                    ))}
                    {articleForms.length === 0 && articleAnnexes.length === 0 && (
                      <span className="text-xs text-[#9E9C98]">
                        Aplicación general en declaraciones determinativas SRI.
                      </span>
                    )}
                  </div>
                </div>

                {/* INLINE NORMATIVE TABLE (E.G., ART. 36 LRTI, ART. 37 DIVIDENDOS, ART. 97.6 RIMPE) */}
                {articleTables.map(tbl => (
                  <div
                    key={tbl.id}
                    className="bg-[#262522] border-2 border-[#81B64C] rounded-2xl p-5 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#81B64C] text-white">
                            Tabla Normativa Oficial • Ejercicio Fiscal {tbl.fiscal_year}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1B1A17] text-[#81B64C] border border-[#81B64C]/30">
                            Vigencia Art. 11 CT: {formatEffectiveRange(tbl.effective_during, tbl.fiscal_year)}
                          </span>
                        </div>
                        <h3 className="font-heading text-lg font-extrabold text-white mt-1">
                          {tbl.title}
                        </h3>
                        <p className="text-xs text-[#BAB8B5]">{tbl.subtitle}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('calculators')}
                        className="btn-chess-green px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Simular en Calculadora</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#3C3A36]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#21201D] text-[#BAB8B5] uppercase text-[11px]">
                          <tr>
                            {tbl.columns_schema.map(col => (
                              <th key={col.key} className="py-2.5 px-3 font-extrabold">
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3C3A36] bg-[#302E2B]">
                          {tbl.rows_data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#3C3A36]/50">
                              {tbl.columns_schema.map(col => {
                                const val = row[col.key];
                                return (
                                  <td key={col.key} className="py-2 px-3 font-medium text-white">
                                    {val === null
                                      ? 'En adelante'
                                      : col.type === 'currency'
                                        ? `USD ${Number(val).toLocaleString('en-US', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}`
                                        : col.type === 'percentage'
                                          ? `${val}%`
                                          : val}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {tbl.notes && (
                      <p className="text-[11px] text-[#9E9C98] italic">Nota legal: {tbl.notes}</p>
                    )}
                  </div>
                ))}

                {/* BANNER / ACCESO RÁPIDO A LA LÍNEA DE TIEMPO HISTÓRICA */}
                <div className="bg-[#21201D] border border-[#3C3A36] hover:border-[#F7C631]/50 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-[#F7C631]/15 text-[#F7C631] border border-[#F7C631]/30 shrink-0">
                      <Hourglass className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">
                          Evolución Histórica y Trazabilidad de Reformas
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#81B64C]/20 text-[#81B64C] font-bold border border-[#81B64C]/30">
                          {articleHistoricalVersions.length} versiones registradas
                        </span>
                      </div>
                      <p className="text-xs text-[#9E9C98] mt-1 leading-relaxed">
                        Abre la ventana emergente para ver la versión actual congelada a la izquierda y desplazar hacia la derecha ➡️ las reformas pasadas publicadas en el Registro Oficial.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#F7C631] text-black hover:bg-[#E5B520] transition flex items-center gap-2 cursor-pointer shadow-md shrink-0 hover:scale-[1.02]"
                  >
                    <Hourglass className="w-4 h-4" />
                    <span>Ver Línea de Tiempo (Pop-up)</span>
                  </button>
                </div>

                {/* CASCADA JERÁRQUICA INFERIOR: VENTANAS E-BOOK DE REGLAMENTOS Y RESOLUCIONES SRI */}
                <div className="bg-[#21201D] border border-[#3C3A36] rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#3C3A36] pb-3">
                    <div className="flex items-center gap-2">
                      <SplitSquareVertical className="w-4 h-4 text-[#81B64C]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Cascada Jerárquica E-Book: Concordancias Reglamentarias y Resoluciones SRI
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1B1A17] text-[#81B64C] border border-[#81B64C]/30">
                      {activeSecondaryCascade.length > 0 ? `${activeSecondaryCascade.length} Normas Conectadas` : 'Sin relaciones'}
                    </span>
                  </div>

                  {activeSecondaryCascade.length === 0 ? (
                    <div className="bg-[#262522] border border-[#3C3A36] rounded-xl p-6 text-center space-y-2">
                      <div className="flex justify-center">
                        <Bookmark className="w-8 h-8 text-[#9E9C98]/60" />
                      </div>
                      <p className="text-xs text-[#BAB8B5] font-semibold">
                        Concordancia reglamentaria y resoluciones del SRI en proceso de digitalización para este artículo.
                      </p>
                      <p className="text-[11px] text-[#9E9C98]">
                        Conforme se aprueben reglamentos y circulares en el revisor, se abrirán aquí automáticamente como ventanas de lectura contextual.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSecondaryCascade.map(item => {
                        const isExpanded = !!expandedInlineCascade[item.id];
                        const isLocked = currentPlan === 'free';

                        return (
                          <div key={item.id} className="space-y-3">
                            {/* VENTANA E-BOOK NIVEL 2: REGLAMENTO EJECUTIVO */}
                            <div className="bg-[#1C1B18] border border-[#0284C7]/40 rounded-xl overflow-hidden shadow-md relative transition-all duration-200">
                              {/* Barra Superior / Header de la Ventana */}
                              <div className="bg-[#242320] border-b border-[#3C3A36] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {item.levelLabel}
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    {item.articleLabel}: {item.articleTitle}
                                  </span>
                                  <LegalStatusButton status={item.legalStatus} size="sm" />
                                </div>

                                {/* Barra de Herramientas de la Sub-Ventana */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setExpandedInlineCascade(prev => ({
                                        ...prev,
                                        [item.id]: !prev[item.id]
                                      }))
                                    }
                                    title={isExpanded ? 'Reducir tamaño de ventana' : 'Ampliar ventana en el mismo sitio'}
                                    className="px-2 py-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[11px] font-bold text-[#DFDFDE] hover:text-white flex items-center gap-1 transition cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <Minimize2 className="w-3.5 h-3.5 text-[#F7C631]" />
                                        <span>Reducir</span>
                                      </>
                                    ) : (
                                      <>
                                        <Maximize2 className="w-3.5 h-3.5 text-[#81B64C]" />
                                        <span>Ampliar</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setFloatingEbookModal(item)}
                                    title="Abrir en ventana independiente flotante"
                                    className="px-2 py-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[11px] font-bold text-[#DFDFDE] hover:text-white flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                                    <span>Ventana Flotante</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleCopyCitation(
                                        `${item.normCode} - ${item.articleLabel}: ${item.articleTitle}`
                                      )
                                    }
                                    title="Copiar cita legal"
                                    className="p-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[#BAB8B5] hover:text-white transition cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Contenido: SOLAMENTE el artículo en mención */}
                              <div
                                className={`p-4 text-xs text-[#E5E3DF] leading-relaxed transition-all duration-200 ${isExpanded ? '' : 'max-h-56 overflow-y-auto'
                                  } ${isLocked ? 'blur-sm select-none' : ''}`}
                              >
                                {renderMarkdownContent(item.content)}
                                <div className="mt-3 pt-2 border-t border-[#3C3A36]/60 flex items-center justify-between text-[11px] text-[#9E9C98]">
                                  <span>
                                    <strong className="text-[#81B64C]">Concordancia jurídica:</strong>{' '}
                                    {item.relationNote}
                                  </span>
                                  <span className="text-[10px] text-[#9E9C98]">
                                    {item.normCode}
                                  </span>
                                </div>
                              </div>

                              {/* Bloqueo si Plan Free */}
                              {isLocked && (
                                <div className="absolute inset-0 bg-[#1B1A17]/85 flex items-center justify-between px-6 z-10">
                                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                                    <Lock className="w-4 h-4 text-[#F7C631]" />
                                    <span>
                                      El acceso a Reglamentos y Resoluciones SRI requiere Plan Pro ($4.99)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleGeneratePlacetoPaySession('premium', 4.99)}
                                    className="btn-chess-green px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                                  >
                                    Desbloquear ($4.99)
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* VENTANAS E-BOOK HIJAS: RESOLUCIONES Y CIRCULARES SRI */}
                            {item.childItems &&
                              item.childItems.map(child => {
                                const isChildExpanded = !!expandedInlineCascade[child.id];
                                return (
                                  <div key={child.id} className="space-y-2 pl-4">
                                    {/* Conector jerárquico visual */}
                                    <div className="flex items-center gap-2 py-1 text-[#F7C631]">
                                      <CornerDownRight className="w-4 h-4 text-[#F7C631] shrink-0" />
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#F7C631] bg-[#F7C631]/10 px-2.5 py-0.5 rounded-full border border-[#F7C631]/30">
                                        Norma Secundaria Hija • {child.levelLabel}
                                      </span>
                                    </div>

                                    {/* Sub-Ventana de la Resolución */}
                                    <div className="bg-[#1C1B18] border border-[#F7C631]/40 rounded-xl overflow-hidden shadow-md relative">
                                      <div className="bg-[#242320] border-b border-[#3C3A36] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7C631]/20 text-[#F7C631] border border-[#F7C631]/40 flex items-center gap-1">
                                            <FileCode className="w-3 h-3" />
                                            {child.normCode}
                                          </span>
                                          <span className="text-xs font-bold text-white">
                                            {child.articleLabel}: {child.articleTitle}
                                          </span>
                                          <LegalStatusButton status={child.legalStatus} size="sm" />
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() =>
                                              setExpandedInlineCascade(prev => ({
                                                ...prev,
                                                [child.id]: !prev[child.id]
                                              }))
                                            }
                                            title={
                                              isChildExpanded
                                                ? 'Reducir tamaño'
                                                : 'Ampliar ventana en el mismo sitio'
                                            }
                                            className="px-2 py-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[11px] font-bold text-[#DFDFDE] hover:text-white flex items-center gap-1 transition cursor-pointer"
                                          >
                                            {isChildExpanded ? (
                                              <>
                                                <Minimize2 className="w-3.5 h-3.5 text-[#F7C631]" />
                                                <span>Reducir</span>
                                              </>
                                            ) : (
                                              <>
                                                <Maximize2 className="w-3.5 h-3.5 text-[#81B64C]" />
                                                <span>Ampliar</span>
                                              </>
                                            )}
                                          </button>
                                          <button
                                            onClick={() => setFloatingEbookModal(child)}
                                            title="Abrir en ventana independiente flotante"
                                            className="px-2 py-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[11px] font-bold text-[#DFDFDE] hover:text-white flex items-center gap-1 transition cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-[#F7C631]" />
                                            <span>Ventana Flotante</span>
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleCopyCitation(
                                                `${child.normCode} - ${child.articleLabel}: ${child.articleTitle}`
                                              )
                                            }
                                            title="Copiar cita legal"
                                            className="p-1 rounded bg-[#302E2B] hover:bg-[#3C3A36] text-[#BAB8B5] hover:text-white transition cursor-pointer"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Contenido: SOLAMENTE el artículo de la resolución */}
                                      <div
                                        className={`p-4 text-xs text-[#E5E3DF] leading-relaxed transition-all duration-200 ${isChildExpanded ? '' : 'max-h-56 overflow-y-auto'
                                          } ${isLocked ? 'blur-sm select-none' : ''}`}
                                      >
                                        {renderMarkdownContent(child.content)}
                                        <div className="mt-3 pt-2 border-t border-[#3C3A36]/60 flex items-center justify-between text-[11px] text-[#9E9C98]">
                                          <span>
                                            <strong className="text-[#F7C631]">
                                              Mandato administrativo:
                                            </strong>{' '}
                                            {child.relationNote}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-[#9E9C98]">
                Selecciona un artículo en la columna central para inspeccionar su vigencia,
                columnas históricas y tablas.
              </div>
            )}
          </main>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: APARTADO EXCLUSIVO DE TABLAS TRIBUTARIAS                      */}
      {/* ==================================================================== */}
      {activeTab === 'tables' && (
        <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
          <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase text-[#81B64C]">
                Repositorio Estructurado • Eje Vertical (Tarifas)
              </span>
              <h1 className="font-heading text-2xl font-black text-white mt-1">
                Apartado Exclusivo de Tablas Tributarias del Ecuador
              </h1>
              <p className="text-xs text-[#BAB8B5] mt-1">
                Todas las tablas contenidas en Leyes, Reglamentos y Resoluciones NAC se almacenan
                en formato JSON estructurado y se vinculan tanto al artículo de origen como a las
                calculadoras.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('calculators')}
              className="btn-chess-green px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Abrir Calculadoras Conectadas</span>
            </button>
          </div>

          <div className="space-y-6">
            {tables.map(tbl => (
              <div
                key={tbl.id}
                className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-6 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#3C3A36] pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-[#81B64C] text-white text-[11px] font-black">
                        {tbl.table_code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#302E2B] text-[#F7C631] text-[11px] font-bold">
                        Categoría: {tbl.category.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#1B1A17] border border-[#81B64C]/30 text-[#81B64C] text-[11px] font-mono font-bold">
                        Vigencia Art. 11 CT ({tbl.fiscal_year}): {formatEffectiveRange(tbl.effective_during, tbl.fiscal_year)}
                      </span>
                    </div>
                    <h2 className="font-heading text-xl font-extrabold text-white mt-2">
                      {tbl.title}
                    </h2>
                    <p className="text-xs text-[#BAB8B5]">{tbl.subtitle}</p>
                  </div>

                  {tbl.structure_id && (
                    <button
                      onClick={() => {
                        const st = structures.find(s => s.id === tbl.structure_id);
                        if (st) {
                          setSelectedArticleLabel(st.label);
                          setActiveTab('reader');
                        }
                      }}
                      className="btn-chess-dark px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-[#81B64C]" />
                      <span>Ver Artículo de Origen en la Ley</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#3C3A36]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#21201D] text-[#BAB8B5] uppercase text-[11px]">
                      <tr>
                        {tbl.columns_schema.map(col => (
                          <th key={col.key} className="py-3 px-4 font-extrabold">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3C3A36] bg-[#302E2B]">
                      {tbl.rows_data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#3C3A36]/60">
                          {tbl.columns_schema.map(col => {
                            const val = row[col.key];
                            return (
                              <td key={col.key} className="py-2.5 px-4 font-medium text-white">
                                {val === null
                                  ? 'En adelante'
                                  : col.type === 'currency'
                                    ? `USD ${Number(val).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}`
                                    : col.type === 'percentage'
                                      ? `${val}%`
                                      : val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {tbl.notes && (
                  <div className="text-xs text-[#BAB8B5] bg-[#21201D] p-3 rounded-lg border border-[#3C3A36]">
                    <strong className="text-[#81B64C]">Base Legal:</strong> {tbl.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CALCULADORAS TRIBUTARIAS INTERACTIVAS (PLAN PLUS $9.99)       */}
      {/* ==================================================================== */}
      {activeTab === 'calculators' && (
        <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
          {currentPlan !== 'professional' && (
            <div className="bg-[#21201D] border-2 border-[#F7C631] rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-[#F7C631]" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Calculadoras Tributarias Exclusivas del Plan Plus (USD 9.99/mes)
                  </h3>
                  <p className="text-xs text-[#BAB8B5]">
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
            <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#3C3A36] pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#81B64C] text-white">
                      Art. 36 y Art. 10 LRTI
                    </span>
                    <h3 className="font-heading text-base font-extrabold text-white mt-1">
                      1. Impuesto a la Renta PN + Rebaja Gastos Personales
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#BAB8B5] mb-1 font-bold">
                      Ingresos Gravados Anuales (USD)
                    </label>
                    <input
                      type="number"
                      value={calcIncome}
                      onChange={e => setCalcIncome(Number(e.target.value))}
                      className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[#BAB8B5] mb-1 font-bold">
                      Aporte IESS y Deducciones de Ley (USD)
                    </label>
                    <input
                      type="number"
                      value={calcDeductions}
                      onChange={e => setCalcDeductions(Number(e.target.value))}
                      className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#BAB8B5] mb-1 font-bold">
                        Gastos Personales (USD)
                      </label>
                      <input
                        type="number"
                        value={calcPersonalExpenses}
                        onChange={e => setCalcPersonalExpenses(Number(e.target.value))}
                        className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[#BAB8B5] mb-1 font-bold">
                        Cargas Familiares (0 a 5+)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={calcFamilyLoads}
                        onChange={e => setCalcFamilyLoads(Number(e.target.value))}
                        className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#21201D] rounded-xl p-4 border border-[#3C3A36] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Base Imponible Gravada:</span>
                  <span className="font-bold">USD {irCalculation.baseImponible.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Tramo Art. 36 Aplicado:</span>
                  <span className="font-bold text-[#F7C631]">
                    FB USD {irCalculation.fraccionBasica} ({irCalculation.tarifaExcedente}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Impuesto Causado:</span>
                  <span className="font-bold">USD {irCalculation.impuestoCausado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#81B64C]">
                  <span>(-) Rebaja Gastos Personales (18%):</span>
                  <span className="font-bold">- USD {irCalculation.rebajaGastos.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#3C3A36] pt-2 flex justify-between text-sm font-black">
                  <span>Impuesto Neto a Pagar (Form 102):</span>
                  <span className="text-[#81B64C]">
                    USD {irCalculation.impuestoPagar.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* CALCULADORA 2: RIMPE EMPRENDEDOR Y NEGOCIO POPULAR */}
            <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-[#3C3A36] pb-3">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#81B64C] text-white">
                    Art. 97.6 LRTI
                  </span>
                  <h3 className="font-heading text-base font-extrabold text-white mt-1">
                    2. Calculadora RIMPE Emprendedor / Negocio Popular
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#BAB8B5] mb-1 font-bold">
                      Ingresos Brutos Anuales (USD 0 a USD 300,000)
                    </label>
                    <input
                      type="number"
                      value={calcRimpeIncome}
                      onChange={e => setCalcRimpeIncome(Number(e.target.value))}
                      className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-[#9E9C98]">
                    Hasta USD 20,000 califica como RIMPE Negocio Popular. De USD 20,000.01 a USD
                    300,000 tributa con la tabla progresiva de RIMPE Emprendedor.
                  </p>
                </div>
              </div>

              <div className="bg-[#21201D] rounded-xl p-4 border border-[#3C3A36] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Régimen Aplicable:</span>
                  <span className="font-bold text-[#81B64C]">
                    {calcRimpeIncome <= 20000
                      ? 'RIMPE Negocio Popular'
                      : calcRimpeIncome <= 300000
                        ? 'RIMPE Emprendedor'
                        : 'Régimen General (> $300k)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Tipo Marginal sobre Excedente:</span>
                  <span className="font-bold text-[#F7C631]">
                    {rimpeCalculation.marginalRate}%
                  </span>
                </div>
                <div className="border-t border-[#3C3A36] pt-2 flex justify-between text-sm font-black">
                  <span>Impuesto RIMPE Causado:</span>
                  <span className="text-[#81B64C]">
                    USD {rimpeCalculation.impuestoTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* CALCULADORA 3: RETENCIÓN EN DISTRIBUCIÓN DE DIVIDENDOS */}
            <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-[#3C3A36] pb-3">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#81B64C] text-white">
                    Art. 37 LRTI + Anexo ADI
                  </span>
                  <h3 className="font-heading text-base font-extrabold text-white mt-1">
                    3. Retención de Dividendos Societarios
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#BAB8B5] mb-1 font-bold">
                      Dividendo Distribuido al Accionista Residente (USD)
                    </label>
                    <input
                      type="number"
                      value={calcDividendAmount}
                      onChange={e => setCalcDividendAmount(Number(e.target.value))}
                      className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-[#9E9C98]">
                    El ingreso gravado corresponde al 40% del dividendo efectivamente distribuido,
                    aplicando la tabla progresiva de retención en la fuente.
                  </p>
                </div>
              </div>

              <div className="bg-[#21201D] rounded-xl p-4 border border-[#3C3A36] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Dividendo Gravado (40%):</span>
                  <span className="font-bold">
                    USD {dividendCalculation.dividendoGravado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9E9C98]">Tarifa Marginal Aplicada:</span>
                  <span className="font-bold text-[#F7C631]">{dividendCalculation.rate}%</span>
                </div>
                <div className="border-t border-[#3C3A36] pt-2 flex justify-between text-sm font-black">
                  <span>Retención a Practicar (Form 103):</span>
                  <span className="text-[#81B64C]">
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
          <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl flex-1 flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 bg-[#21201D] border-b border-[#3C3A36] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#81B64C]" />
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    Asistente Jurídico-Tributario SmartLex IA (Google Gemini RAG)
                  </h2>
                  <p className="text-[11px] text-[#9E9C98]">
                    Conectado a Código Tributario, LRTI, RLRTI y Tablas 2026
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#302E2B] border border-[#81B64C] text-[#81B64C]">
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
                      ? 'bg-[#81B64C] text-white font-semibold'
                      : 'bg-[#302E2B] text-[#DFDFDE] border border-[#3C3A36]'
                      }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-4 bg-[#21201D] border-t border-[#3C3A36] flex items-center gap-3"
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
                className="flex-1 bg-[#302E2B] border border-[#3C3A36] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#81B64C]"
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
          <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase text-[#81B64C] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#81B64C]" />
                Auditoría Colaborativa • Control de Calidad Humano
              </span>
              <h1 className="font-heading text-xl font-black text-white mt-1">
                Bandeja de Discrepancias y Reportes Notificados
              </h1>
              <p className="text-xs text-[#BAB8B5]">
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
            <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#FA412D]" />
                  <span>Discrepancias Notificadas por Usuarios ({discrepancies.filter(d => d.status === 'pending').length})</span>
                </h3>
                <span className="text-[11px] text-[#9E9C98]">
                  Total histórico: {discrepancies.length}
                </span>
              </div>

              {discrepancies.filter(d => d.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-xs text-[#81B64C] bg-[#21201D] border border-[#81B64C]/30 rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#81B64C]/20 text-[#81B64C] flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-white text-sm">¡Sin discrepancias pendientes!</p>
                  <p className="text-[#9E9C98]">
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
                          className="bg-[#21201D] border border-[#FA412D]/40 rounded-xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#81B64C]/20 text-[#81B64C] border border-[#81B64C]/30">
                                {disc.article_label}
                              </span>
                              <span>{disc.article_title || ''}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-[#1B1A17] border border-[#3C3A36] text-xs text-[#E5E3DF] leading-relaxed">
                            <strong className="text-[#F7C631]">Observación del usuario: </strong>
                            "{disc.user_comment}"
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#9E9C98] flex-wrap gap-2 pt-1 border-t border-[#3C3A36]/60">
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
                                className="px-2.5 py-1 rounded bg-[#2A2926] hover:bg-[#35332F] text-[#BAB8B5] hover:text-white border border-[#3C3A36] transition cursor-pointer text-[11px] font-semibold"
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
                <div className="pt-3 border-t border-[#3C3A36]">
                  <span className="text-[11px] font-bold text-[#9E9C98] block mb-2">
                    ✓ Discrepancias Resueltas ({discrepancies.filter(d => d.status === 'resolved').length}):
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {discrepancies
                      .filter(d => d.status === 'resolved')
                      .map(d => (
                        <div
                          key={d.id}
                          className="p-2 rounded-lg bg-[#1B1A17] border border-[#3C3A36]/60 text-[11px] flex items-center justify-between text-[#BAB8B5]"
                        >
                          <span className="font-semibold text-white truncate max-w-xs">
                            {d.article_label}: {d.user_comment}
                          </span>
                          <span className="text-[10px] text-[#81B64C] font-bold shrink-0">Resuelto</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Norm Discovery Queue */}
            <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-white">
                Radar de Normas Citadas Aún No Cargadas (public.norm_discovery)
              </h3>
              <p className="text-xs text-[#9E9C98]">
                Cuando una reforma menciona una Ley o Resolución que aún no está en las 7 carpetas
                de Google Drive / Supabase Storage, el agente la registra aquí automáticamente:
              </p>

              <div className="space-y-3">
                {discoveries.map(d => (
                  <div
                    key={d.id}
                    className="bg-[#21201D] border border-[#3C3A36] rounded-xl p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#81B64C]">
                        {d.referenced_code} — {d.referenced_title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7C631]/20 text-[#F7C631]">
                        Estado: {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#BAB8B5]">
                      Cita detectada: &ldquo;{d.citation_context}&rdquo;
                    </p>
                    <p className="text-[11px] text-[#9E9C98]">
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
          <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-heading text-lg font-black text-white">
              Expandir Eje Vertical (Nuevo Concepto Tributario)
            </h3>
            <p className="text-xs text-[#BAB8B5]">
              La arquitectura de SmartLex es 100% dinámica: cualquier concepto agregado aquí se
              guarda en <code>public.tax_concepts</code> sin tocar código.
            </p>
            <form onSubmit={handleAddConcept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">Código Único</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PRECIOS_TRANSFERENCIA"
                  value={newConceptCode}
                  onChange={e => setNewConceptCode(e.target.value)}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">Nombre Visible</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Precios de Transferencia y Partes Relacionadas"
                  value={newConceptName}
                  onChange={e => setNewConceptName(e.target.value)}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción breve del eje vertical"
                  value={newConceptDesc}
                  onChange={e => setNewConceptDesc(e.target.value)}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white"
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
          <div className="bg-[#262522] border border-[#3C3A36] rounded-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3C3A36] pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-[#81B64C]">
                  Pasarela WebCheckout PlacetoPay + WhatsApp Cloud API
                </span>
                <h2 className="font-heading text-xl font-black text-white">
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
            <div className="bg-[#21201D] border border-[#3C3A36] rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">
                  WhatsApp para Alertas y Link de Pago
                </label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">
                  9no Dígito del RUC (Calendario SRI)
                </label>
                <select
                  value={rucNinthDigit}
                  onChange={e => setRucNinthDigit(Number(e.target.value))}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => (
                    <option key={d} value={d}>
                      Dígito {d} (Vence el día {d === 0 ? 28 : 8 + d * 2} de cada mes)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#BAB8B5] mb-1">
                  Tipo de Contribuyente
                </label>
                <select
                  value={selectedTaxpayerType}
                  onChange={e => setSelectedTaxpayerType(e.target.value)}
                  className="w-full bg-[#302E2B] border border-[#3C3A36] rounded-lg px-3 py-2 text-white font-bold"
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
              <div className="bg-[#21201D] border border-[#3C3A36] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-[#9E9C98]">Plan Gratuito</span>
                  <div className="text-2xl font-black text-white mt-1">USD 0.00</div>
                  <ul className="mt-4 space-y-2 text-xs text-[#BAB8B5]">
                    <li>✓ Código Tributario, LRTI y RLRTI vigentes</li>
                    <li>✓ Semáforo visual de vigencia</li>
                    <li className="text-[#9E9C98] line-through">✗ Columnas históricas de reformas</li>
                    <li className="text-[#9E9C98] line-through">✗ Resoluciones NAC y Circulares</li>
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
              <div className="bg-[#21201D] border-2 border-[#F7C631] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-[#F7C631]">
                    Plan Pro • Investigador
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    USD 4.99 <span className="text-xs font-normal text-[#9E9C98]">/ mes</span>
                  </div>
                  <div className="text-[11px] text-[#F7C631]">o USD 49.99 / año (ahorra 2 meses)</div>
                  <ul className="mt-4 space-y-2 text-xs text-[#DFDFDE]">
                    <li>✓ Todo el Plan Gratuito</li>
                    <li>✓ Columnas paralelas de reformas históricas</li>
                    <li>✓ Cascada completa (Resoluciones y Circulares SRI)</li>
                    <li>✓ Apartado exclusivo de Tablas Tributarias</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGeneratePlacetoPaySession('premium', 4.99)}
                  className="w-full py-2.5 rounded-lg text-xs font-extrabold bg-[#F7C631] text-black mt-5 cursor-pointer"
                >
                  Generar Link PlacetoPay ($4.99)
                </button>
              </div>

              {/* PLUS $9.99 */}
              <div className="bg-[#21201D] border-2 border-[#81B64C] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-[#81B64C]">
                    Plan Plus • Corporativo Total
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    USD 9.99 <span className="text-xs font-normal text-[#9E9C98]">/ mes</span>
                  </div>
                  <div className="text-[11px] text-[#81B64C]">o USD 99.99 / año (ahorra 2 meses)</div>
                  <ul className="mt-4 space-y-2 text-xs text-[#DFDFDE]">
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
          <div className="bg-[#21201D] border border-[#3C3A36] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[#262522] border-b border-[#3C3A36] flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#81B64C]/20 text-[#81B64C] border border-[#81B64C]/40">
                  {floatingEbookModal.levelLabel}
                </span>
                <span className="text-xs font-bold text-white">
                  {floatingEbookModal.normCode} — {floatingEbookModal.articleLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LegalStatusButton status={floatingEbookModal.legalStatus} size="sm" />
                <button
                  onClick={() => setFloatingEbookModal(null)}
                  className="p-1 rounded-lg text-[#9E9C98] hover:text-white hover:bg-[#302E2B] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subtitle / Context */}
            <div className="px-6 pt-4 pb-2 bg-[#1C1B18]/50 border-b border-[#3C3A36]/40">
              <div className="text-[11px] text-[#9E9C98]">
                <span>Norma fuente: </span>
                <strong className="text-white">{floatingEbookModal.normName}</strong>
              </div>
              <h2 className="text-base font-black text-white mt-1">
                {floatingEbookModal.articleLabel}: {floatingEbookModal.articleTitle}
              </h2>
            </div>

            {/* Modal Body: Solamente el texto del artículo en mención */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-[#E5E3DF] leading-relaxed">
              {renderMarkdownContent(floatingEbookModal.content)}
              <div className="p-3 rounded-lg bg-[#262522] border border-[#3C3A36] text-[11px] text-[#BAB8B5] mt-4">
                <strong className="text-[#81B64C]">Nota de concordancia: </strong>
                {floatingEbookModal.relationNote}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#1C1B18] border-t border-[#3C3A36] flex items-center justify-between">
              <span className="text-[11px] text-[#9E9C98]">
                SmartLex Ecuador • E-Book Jurídico Autónomo
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopyCitation(
                      `${floatingEbookModal.normCode} ${floatingEbookModal.articleLabel}: ${floatingEbookModal.articleTitle}\n\n${floatingEbookModal.content}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#302E2B] hover:bg-[#3C3A36] text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer border border-[#3C3A36]"
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
          <div className="bg-[#1C1B18] border border-[#3C3A36] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#3C3A36] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FA412D]/15 text-[#FA412D] border border-[#FA412D]/30">
                  <Flag className="w-5 h-5 text-[#FA412D]" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    Notificar Discrepancia o Sugerencia
                  </h3>
                  <p className="text-xs text-[#81B64C] font-semibold">
                    {reportingArticle.label}{reportingArticle.title ? `: ${reportingArticle.title}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#9E9C98] hover:text-white p-1 rounded-lg hover:bg-[#262522] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contexto prellenado del artículo para no obligar al usuario o revisor a reescribir */}
            <div className="p-3 rounded-xl bg-[#21201D] border border-[#3C3A36] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#BAB8B5]">
                <span>Norma: <strong className="text-white">{reportingArticle.norms?.title || 'Ley de Régimen Tributario Interno'}</strong></span>
                <span className="px-2 py-0.5 rounded bg-[#81B64C]/15 text-[#81B64C] font-bold border border-[#81B64C]/30 text-[10px]">
                  {reportingArticle.legal_status === 'vigente_reformado' ? 'Vigente y Reformado' : reportingArticle.legal_status === 'derogado' ? 'Derogado' : 'Vigente'}
                </span>
              </div>
              <div className="text-white font-bold text-xs">
                {reportingArticle.label}{reportingArticle.title ? `: ${reportingArticle.title}` : ''}
              </div>
              <div className="p-2 bg-[#1B1A17] rounded-lg border border-[#3C3A36]/60 text-[11px] text-[#9E9C98] italic line-clamp-3">
                "{reportingArticle.content?.slice(0, 220)}..."
              </div>
            </div>

            <form onSubmit={handleSubmitDiscrepancy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#DFDFDE] mb-1.5">
                  Tipo de incidencia:
                </label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-[#262522] border border-[#3C3A36] focus:border-[#81B64C] rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="errata">✏️ Error tipográfico o errata en el texto</option>
                  <option value="missing_content">📄 Falta un literal, inciso o sección</option>
                  <option value="table_error">📊 Discrepancia en cifras o tabla tarifaria</option>
                  <option value="outdated_reform">⏳ Reforma o vigencia desactualizada</option>
                  <option value="suggestion">💡 Sugerencia general o mejora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DFDFDE] mb-1.5">
                  Describe el error o tu sugerencia:
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportComment}
                  onChange={e => setReportComment(e.target.value)}
                  placeholder="Explícanos qué has detectado (ej: En el literal b la tarifa debería ser 25% según el R.O. 478...)"
                  className="w-full bg-[#262522] border border-[#3C3A36] focus:border-[#81B64C] rounded-lg p-3 text-xs text-white placeholder-[#9E9C98] outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DFDFDE] mb-1.5">
                  Tu contacto o email (opcional para darte seguimiento):
                </label>
                <input
                  type="text"
                  value={reportUserContact}
                  onChange={e => setReportUserContact(e.target.value)}
                  placeholder="ej: abogado@tuempresa.com o 0991234567"
                  className="w-full bg-[#262522] border border-[#3C3A36] focus:border-[#81B64C] rounded-lg px-3 py-2 text-xs text-white placeholder-[#9E9C98] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3C3A36]">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#BAB8B5] hover:text-white hover:bg-[#262522] transition cursor-pointer"
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

      {/* POP-UP MODAL DE EVOLUCIÓN HISTÓRICA CON ARTÍCULO ACTUAL FIJO Y DESPLAZAMIENTO A LA DERECHA */}
      {isHistoryModalOpen && activeCurrentArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#1C1B18] border border-[#3C3A36] rounded-2xl max-w-7xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[#242320] border-b border-[#3C3A36] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#F7C631]/20 text-[#F7C631] border border-[#F7C631]/40">
                  <Hourglass className="w-5 h-5 text-[#F7C631]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7C631]/20 text-[#F7C631] border border-[#F7C631]/30">
                      Trazabilidad Temporal • SmartLex
                    </span>
                    <span className="text-xs font-bold text-white">
                      {activeCurrentArticle.label}{activeCurrentArticle.title ? `: ${activeCurrentArticle.title}` : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9E9C98] mt-0.5">
                    La versión actual permanece congelada a la izquierda. Desliza hacia la derecha ➡️ para examinar las redacciones anteriores publicadas en el Registro Oficial.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-[#15803D] dark:text-[#22C55E]">
                      + Texto incrementado (solo respecto a la versión anterior)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#EF4444] line-through decoration-[#EF4444]">
                      Texto eliminado (solo respecto a la versión anterior)
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector Rápido de Hitos Temporales (Chips de Años) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {articleHistoricalVersions.map(ver => (
                  <button
                    key={ver.id}
                    onClick={() => {
                      setActiveHistoryYear(ver.version_year);
                      const el = document.getElementById(`hist-col-${ver.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${ver.is_current
                      ? 'bg-[#81B64C]/20 border-[#81B64C] text-[#81B64C] hover:bg-[#81B64C]/30'
                      : activeHistoryYear === ver.version_year
                        ? 'bg-[#F7C631] border-[#F7C631] text-black font-extrabold'
                        : 'bg-[#2A2926] border-[#3C3A36] text-[#BAB8B5] hover:text-white hover:border-[#F7C631]/50'
                      }`}
                  >
                    <span>{ver.version_year}</span>
                    <span className="text-[9px] opacity-75">
                      {ver.is_current ? '(Hoy)' : `(v${ver.version_number})`}
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#9E9C98] hover:text-white hover:bg-[#302E2B] transition cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split View: Columna Fija (Izquierda) + Pista de Scroll Horizontal (Derecha) */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[#161513]">
              {/* COLUMNA 1: VERSIÓN ACTUAL VIGENTE (CONGELADA / STICKY EN PANTALLA) */}
              <div className={`${isCurrentColExpanded ? 'w-[520px] sm:w-[600px]' : 'w-[360px] sm:w-[420px]'} shrink-0 bg-[#21201D] border-r-2 border-[#81B64C] flex flex-col shadow-xl z-20 transition-all duration-200`}>
                <div className="p-3 bg-[#262522] border-b border-[#3C3A36] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#81B64C] shadow-[0_0_8px_#81B64C] shrink-0" />
                      Vigente Hoy ({articleHistoricalVersions[0]?.version_year || 2026})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCurrentColExpanded(!isCurrentColExpanded)}
                      title={isCurrentColExpanded ? 'Reducir ancho de columna' : 'Ampliar ancho de columna'}
                      className="px-2.5 py-1 rounded-lg bg-[#2A2926] hover:bg-[#35332F] text-[#DFDFDE] border border-[#3C3A36] text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isCurrentColExpanded ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 text-[#F7C631]" />
                          <span>Reducir</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-[#81B64C]" />
                          <span>Ampliar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#1B1A17] border-b border-[#3C3A36]/50 text-[11px] text-[#9E9C98] space-y-1.5">
                  <div className="text-white font-bold">
                    {articleHistoricalVersions[0]?.reform_cite || 'Ley Orgánica de Eficiencia Económica'}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#192218] text-[#81B64C] border border-[#81B64C]/35">
                      {periodicityLabel(articleHistoricalVersions[0]?.tax_periodicity)}:{' '}
                      {formatValidityRange(
                        articleHistoricalVersions[0]?.raw_valid_from ?? articleHistoricalVersions[0]?.valid_from,
                        articleHistoricalVersions[0]?.raw_valid_to,
                        articleHistoricalVersions[0]?.legal_status === 'derogado'
                      )}
                    </span>
                    {articleHistoricalVersions[0]?.official_registry &&
                      articleHistoricalVersions[0]?.official_registry !== articleHistoricalVersions[0]?.reform_cite && (
                        <span className="text-[10px] text-[#9E9C98]">
                          📜 {articleHistoricalVersions[0]?.official_registry}
                        </span>
                      )}
                  </div>
                  {isAdmin && articleHistoricalVersions[0]?.id && (
                    <AdminValidityEditor
                      structureId={articleHistoricalVersions[0].id}
                      initialFrom={
                        articleHistoricalVersions[0].raw_valid_from ?? articleHistoricalVersions[0].valid_from
                      }
                      initialTo={articleHistoricalVersions[0].raw_valid_to}
                      compact
                      onSave={handleSaveValidity}
                    />
                  )}
                </div>

                {/* Texto Íntegro Actual (comparado únicamente con su versión inmediata anterior) */}
                <div className="p-4 overflow-y-auto flex-1 text-xs text-[#E5E3DF] leading-relaxed space-y-3">
                  {renderDiffMarkdownContent(
                    articleHistoricalVersions[0]?.content || activeCurrentArticle.content,
                    articleHistoricalVersions[1]?.content || null
                  )}
                </div>

                {/* Panel de Cambio Legislativo de la versión vigente */}
                {openSummaryId === (articleHistoricalVersions[0]?.id || 'vigente') && (
                  <div className="p-3 bg-[#172216] border-t-2 border-[#81B64C] text-xs text-[#E5E3DF] animate-in slide-in-from-bottom duration-150 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-[#81B64C] flex items-center gap-1 tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-[#81B64C]" />
                        Cambio Vigente Aplicable ({articleHistoricalVersions[0]?.version_year || 2026})
                      </span>
                      <button
                        onClick={() => setOpenSummaryId(null)}
                        className="text-[#9E9C98] hover:text-white p-0.5 rounded cursor-pointer"
                        title="Cerrar explicación"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#DFDFDE] leading-relaxed">
                      {articleHistoricalVersions[0]?.summary_change || 'Texto en vigor actualmente aplicable a tus declaraciones y obligaciones tributarias.'}
                    </p>
                  </div>
                )}

                {/* Footer de la columna vigente */}
                <div className="p-2.5 bg-[#1B1A17] border-t border-[#3C3A36] flex items-center justify-between text-[10px] text-[#9E9C98] gap-2">
                  <span className="truncate">Trazabilidad SmartLex</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setOpenSummaryId(
                          openSummaryId === (articleHistoricalVersions[0]?.id || 'vigente')
                            ? null
                            : (articleHistoricalVersions[0]?.id || 'vigente')
                        )
                      }
                      className={`px-2 py-1 rounded border flex items-center gap-1 transition cursor-pointer font-bold ${openSummaryId === (articleHistoricalVersions[0]?.id || 'vigente')
                        ? 'bg-[#81B64C] text-white border-[#81B64C]'
                        : 'bg-[#262522] hover:bg-[#302E2B] text-[#81B64C] border-[#81B64C]/40'
                        }`}
                      title="Ver resumen del cambio introducido en la versión vigente"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Cambio introducido</span>
                    </button>

                    <button
                      onClick={() =>
                        handleCopyCitation(
                          `${articleHistoricalVersions[0]?.reform_cite} (${articleHistoricalVersions[0]?.official_registry})\nVigente desde: ${articleHistoricalVersions[0]?.valid_from}\n\n${articleHistoricalVersions[0]?.content || activeCurrentArticle.content}`
                        )
                      }
                      className="px-2 py-1 rounded bg-[#262522] hover:bg-[#302E2B] text-white flex items-center gap-1 transition cursor-pointer font-medium"
                      title="Copiar versión vigente"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMNAS 2, 3, 4...: PISTA DESPLAZABLE HORIZONTALMENTE HACIA LA DERECHA */}
              <div className="flex-1 overflow-x-auto flex gap-4 p-4 items-stretch scroll-smooth">
                {articleHistoricalVersions.slice(1).map((ver, idx) => {
                  const isHighlighted = activeHistoryYear === ver.version_year;
                  // La versión inmediata anterior en el tiempo a `ver` (que ocupa el índice idx + 1) está en el índice idx + 2
                  const immediatePreviousVersion = articleHistoricalVersions[idx + 2] || null;
                  return (
                    <div
                      id={`hist-col-${ver.id}`}
                      key={ver.id}
                      className={`w-[360px] sm:w-[400px] shrink-0 bg-[#21201D] rounded-xl flex flex-col border transition-all duration-200 overflow-hidden shadow-lg ${isHighlighted
                        ? 'border-[#F7C631] ring-2 ring-[#F7C631]/40'
                        : 'border-[#3C3A36] hover:border-[#F7C631]/50'
                        }`}
                    >
                      {/* Header de la Reforma Anterior */}
                      <div className="p-3 bg-[#262522] border-b border-[#3C3A36] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#F7C631] flex items-center gap-1 shrink-0">
                            <Hourglass className="w-3.5 h-3.5 text-[#F7C631]" />
                            Versión {ver.version_year}
                          </span>
                          {ver.is_fe_erratas_replaced ? (
                            <span
                              title="Texto erróneo corregido por Fe de Erratas; no debió estar vigente"
                              className="text-[10px] text-[#F7C631] font-bold bg-[#2A2010] px-2 py-0.5 rounded border border-[#F7C631]/45"
                            >
                              Cambio temporal (Fe de Erratas) — No debió estar vigente
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#BAB8B5] font-mono bg-[#1B1A17] px-2 py-0.5 rounded border border-[#3C3A36]">
                              {periodicityLabel(ver.tax_periodicity)}:{' '}
                              {formatValidityRange(
                                ver.raw_valid_from ?? ver.valid_from,
                                ver.raw_valid_to ?? ver.valid_to,
                                true
                              )}
                            </span>
                          )}
                        </div>
                        {ver.is_fe_erratas_replaced ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F7C631] px-2 py-0.5 rounded bg-[#2A2010] border border-[#F7C631]/40 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-[#F7C631] shadow-[0_0_6px_#F7C631] shrink-0" />
                            Corregido (Errata)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#DFDFDE] px-2 py-0.5 rounded bg-[#261717] border border-[#FA412D]/40 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-[#FA412D] shadow-[0_0_6px_#FA412D] shrink-0" />
                            Derogado
                          </span>
                        )}
                      </div>

                      {/* Registro Oficial, Vigencia y Edición Admin */}
                      <div className="p-2.5 bg-[#1B1A17] border-b border-[#3C3A36]/50 text-[11px] space-y-1">
                        <div className="text-[#F7C631] font-bold line-clamp-2">
                          {ver.reform_cite}
                        </div>
                        {ver.official_registry && ver.official_registry !== ver.reform_cite && (
                          <div className="text-[10px] text-[#9E9C98]">
                            📜 {ver.official_registry}
                          </div>
                        )}
                        {ver.validity_display_label && (
                          <div className="text-[10px] text-[#F7C631]/90 font-semibold">
                            {ver.validity_display_label}
                          </div>
                        )}
                        {isAdmin && ver.id && (
                          <AdminValidityEditor
                            structureId={ver.id}
                            initialFrom={ver.raw_valid_from ?? ver.valid_from}
                            initialTo={ver.raw_valid_to}
                            compact
                            onSave={handleSaveValidity}
                          />
                        )}
                      </div>

                      {/* Contenido íntegro de la versión histórica (comparado solo con su versión inmediata anterior) */}
                      <div className="p-4 overflow-y-auto flex-1 text-xs text-[#BAB8B5] leading-relaxed">
                        {renderDiffMarkdownContent(ver.content, immediatePreviousVersion?.content || null)}
                      </div>

                      {/* Panel de Cambio Legislativo Introducido (desplegable) */}
                      {openSummaryId === ver.id && (
                        <div className="p-3 bg-[#1C1810] border-t-2 border-[#F7C631] text-xs text-[#E5E3DF] animate-in slide-in-from-bottom duration-150 shrink-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-[#F7C631] flex items-center gap-1 tracking-wider">
                              <Sparkles className="w-3.5 h-3.5 text-[#F7C631]" />
                              Cambio Legislativo Introducido ({ver.version_year})
                            </span>
                            <button
                              onClick={() => setOpenSummaryId(null)}
                              className="text-[#9E9C98] hover:text-white p-0.5 rounded cursor-pointer"
                              title="Cerrar explicación"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[11px] text-[#DFDFDE] leading-relaxed">
                            {ver.summary_change}
                          </p>
                        </div>
                      )}

                      {/* Footer de la tarjeta histórica */}
                      <div className="p-2.5 bg-[#1B1A17] border-t border-[#3C3A36] flex items-center justify-between text-[10px] text-[#9E9C98] gap-2">
                        <span className="truncate">Trazabilidad SmartLex</span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setOpenSummaryId(openSummaryId === ver.id ? null : ver.id)}
                            className={`px-2 py-1 rounded border flex items-center gap-1 transition cursor-pointer font-bold ${openSummaryId === ver.id
                              ? 'bg-[#F7C631] text-black border-[#F7C631]'
                              : 'bg-[#262522] hover:bg-[#302E2B] text-[#F7C631] border-[#F7C631]/40'
                              }`}
                            title="Ver resumen del cambio introducido en esta reforma"
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
                            className="px-2 py-1 rounded bg-[#262522] hover:bg-[#302E2B] text-white flex items-center gap-1 transition cursor-pointer font-medium"
                            title="Copiar versión"
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
                  <div className="w-96 flex flex-col items-center justify-center p-8 text-center text-xs text-[#9E9C98] bg-[#21201D] border border-[#3C3A36] rounded-xl">
                    <Bookmark className="w-8 h-8 text-[#9E9C98]/50 mb-2" />
                    <p className="font-bold text-white mb-1">
                      Sin reformas anteriores registradas
                    </p>
                    <p>
                      Este artículo mantiene su redacción original sin alteraciones legislativas previas registradas en el repositorio.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#242320] border-t border-[#3C3A36] flex items-center justify-between text-xs text-[#9E9C98] shrink-0">
              <div className="flex items-center gap-2">
                <span>
                  Mostrando <strong>{articleHistoricalVersions.length} versiones temporales</strong> para {activeCurrentArticle.label}.
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-[#81B64C]">
                  Usa la rueda o la barra de desplazamiento hacia la derecha ➡️ para retroceder en el tiempo.
                </span>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2A2926] hover:bg-[#35332F] text-[#BAB8B5] hover:text-white border border-[#3C3A36] transition cursor-pointer"
              >
                Cerrar Línea de Tiempo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK DE COPIADO */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#81B64C] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
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
