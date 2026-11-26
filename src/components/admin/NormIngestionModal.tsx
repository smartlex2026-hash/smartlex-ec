import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Calendar,
  Layers,
  BookOpen
} from 'lucide-react';

interface NormIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_NORMS = [
  { code: 'RO-EJEMPLAR', name: 'Ejemplar Completo del Registro Oficial (Gaceta Multiacto)', category: '00_registros_oficiales' },
  { code: 'LRTI', name: 'Ley de Régimen Tributario Interno', category: '02_leyes' },
  { code: 'RALRTI', name: 'Reglamento para la Aplicación de la LRTI', category: '03_reglamentos' },
  { code: 'DE-EJECUTIVO', name: 'Decreto Ejecutivo Tributario / Reforma Reglamentaria', category: '08_decretos_ejecutivos' },
  { code: 'CT', name: 'Código Tributario', category: '01_codigos' },
  { code: 'LEY-REFORMATORIA', name: 'Registro Oficial — Nueva Ley o Reforma Tributaria', category: '04_leyes_reformas' },
  { code: 'NAC-SRI', name: 'Resolución General del SRI (Registro Oficial)', category: '05_resoluciones_sri' },
  { code: 'RES-TC', name: 'Sentencia / Resolución Constitucional (Inconstitucionalidad)', category: '05_resoluciones_sri' },
  { code: 'CIRCULAR-SRI', name: 'Circular / Fe de Erratas en Registro Oficial', category: '06_circulares_sri' },
];

export const NormIngestionModal: React.FC<NormIngestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [normCode, setNormCode] = useState('LRTI');
  const [normTitle, setNormTitle] = useState('Ley de Régimen Tributario Interno');
  const [folderCategory, setFolderCategory] = useState('02_leyes');
  const [publishedOn, setPublishedOn] = useState(new Date().toISOString().split('T')[0]);
  const [officialRegistryCite, setOfficialRegistryCite] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const found = COMMON_NORMS.find(n => n.code === val);
    if (found) {
      setNormCode(found.code);
      setNormTitle(found.name);
      setFolderCategory(found.category);
    } else {
      setNormCode(val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('El archivo seleccionado debe ser un documento PDF.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedFile) {
      setErrorMsg('Por favor selecciona el archivo PDF de la norma.');
      return;
    }
    if (!normCode.trim()) {
      setErrorMsg('Por favor ingresa el código de la norma (ej: LRTI).');
      return;
    }
    if (!normTitle.trim()) {
      setErrorMsg('Por favor ingresa el título de la norma.');
      return;
    }

    setLoading(true);

    try {
      setStepMessage('1/3 Subiendo PDF oficial a Supabase Storage...');
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${folderCategory}/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir a Supabase Storage: ${uploadError.message}`);
      }

      const { data: signData } = await supabase.storage
        .from('legal-documents')
        .createSignedUrl(storagePath, 3600);

      const fileSignedUrl = signData?.signedUrl || '';

      setStepMessage('2/3 Enviando a N8N y Gemini para extracción jurídica...');

      const response = await fetch('https://n8n.smartlexec.cloud/webhook/smartlex-ingesta-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          norm_code: normCode.trim().toUpperCase(),
          version_title: normTitle.trim(),
          folder_category: folderCategory,
          published_on: publishedOn,
          official_registry_cite: officialRegistryCite.trim() || null,
          file_name: cleanFileName,
          file_size: selectedFile.size,
          storage_bucket: 'legal-documents',
          storage_path: storagePath,
          pdf_signed_url: fileSignedUrl
        })
      });

      const result = await response.json().catch(() => ({ ok: response.ok }));

      setStepMessage('3/3 Extrayendo actos y reformando normativa con IA...');
      for (let attempt = 0; attempt < 45; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const { data: doc } = await supabase
          .from('documents')
          .select('id, status')
          .eq('storage_path', storagePath)
          .maybeSingle();

        if (doc && doc.status === 'processed') {
          break;
        }
      }

      setStepMessage('¡Ingesta completada! Norma y reformas publicadas instantáneamente.');
      setResultSummary({
        normCode,
        normTitle,
        fileName: cleanFileName,
        ...result
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error en ingesta de norma:', err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar el PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-left space-y-5 text-[var(--color-texto)]">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[var(--color-borde)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-secundario-suave)] border border-[var(--color-secundario-borde)] flex items-center justify-center text-[var(--color-secundario)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--color-texto)]">Ingesta de Registro Oficial y Normativa (PDF)</h2>
              <p className="text-xs text-[var(--color-texto-secundario)]">
                Filtra materia tributaria con Gemini, publica al instante y reforma cronológicamente la ley base.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] p-1 rounded-lg hover:bg-[var(--color-superficie-secundaria)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[var(--color-error-fondo)] border border-[var(--color-error-borde)] text-[var(--color-error)] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resultSummary ? (
          <div className="p-5 rounded-xl bg-[var(--color-exito-fondo)] border border-[var(--color-exito-borde)] space-y-3">
            <div className="flex items-center gap-2 text-[var(--color-exito-texto)] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>¡Registro Oficial procesado y publicado instantáneamente!</span>
            </div>
            <p className="text-xs text-[var(--color-texto)]">
              El documento <strong>{resultSummary.fileName}</strong> ha sido estructurado e integrado directamente en el repositorio normativo y en la línea del tiempo de reformas. Puedes sugerir ajustes en cualquier artículo mediante el botón <strong>Reportar corrección</strong>.
            </p>
            <button
              onClick={() => {
                setResultSummary(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-lg bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] font-black text-xs transition cursor-pointer"
            >
              Ver Norma Publicada en el Lector
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plantilla rápida */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">
                Plantilla de Norma Ecuatoriana (Opcional)
              </label>
              <select
                onChange={handleSelectPreset}
                value={normCode}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)]"
              >
                {COMMON_NORMS.map(n => (
                  <option key={n.code} value={n.code}>
                    {n.code} — {n.name}
                  </option>
                ))}
                <option value="OTRA">Otra (Ingresar manualmente)...</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Código */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">Código de Norma</label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={normCode}
                    onChange={e => setNormCode(e.target.value.toUpperCase())}
                    placeholder="Ej: LRTI, NAC-DGERCGC..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)]"
                  />
                </div>
              </div>

              {/* Categoría / Jerarquía */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">Categoría Jerárquica</label>
                <div className="relative">
                  <Layers className="w-3.5 h-3.5 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={folderCategory}
                    onChange={e => setFolderCategory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)] cursor-pointer"
                  >
                    <option value="00_registros_oficiales">00. Registros Oficiales (Gaceta Multiacto)</option>
                    <option value="01_codigos">01. Códigos Orgánicos</option>
                    <option value="02_leyes">02. Leyes Ordinarias / Orgánicas</option>
                    <option value="03_reglamentos">03. Reglamentos Ejecutivos</option>
                    <option value="04_leyes_reformas">04. Leyes Reformatorias</option>
                    <option value="05_resoluciones_sri">05. Resoluciones del SRI</option>
                    <option value="06_circulares_sri">06. Circulares del SRI</option>
                    <option value="07_formularios_anexos">07. Formularios y Anexos</option>
                    <option value="08_decretos_ejecutivos">08. Decretos Ejecutivos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Título de la Norma */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">Título Oficial</label>
              <div className="relative">
                <BookOpen className="w-3.5 h-3.5 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={normTitle}
                  onChange={e => setNormTitle(e.target.value)}
                  placeholder="Ej: Ley de Régimen Tributario Interno"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fecha de Publicación */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">Fecha de Publicación</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={publishedOn}
                    onChange={e => setPublishedOn(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)]"
                  />
                </div>
              </div>

              {/* Registro Oficial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--color-texto-secundario)]">
                    Registro Oficial
                  </label>
                  <span className="text-[10px] text-[var(--color-secundario)] font-semibold">Auto-detectado por IA</span>
                </div>
                <input
                  type="text"
                  value={officialRegistryCite}
                  onChange={e => setOfficialRegistryCite(e.target.value)}
                  placeholder="Ej: Suplemento N.º 463 (o dejar vacío)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)]"
                />
              </div>
            </div>

            {/* Selector de Archivo PDF */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-texto-secundario)] mb-1">Documento PDF Oficial</label>
              <div className="border-2 border-dashed border-[var(--color-borde-fuerte)] hover:border-[var(--color-secundario)] rounded-xl p-4 text-center bg-[var(--color-fondo)] transition cursor-pointer relative">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  {selectedFile ? (
                    <>
                      <FileCheck className="w-6 h-6 text-[var(--color-secundario)]" />
                      <span className="text-xs font-bold text-[var(--color-texto)]">{selectedFile.name}</span>
                      <span className="text-[10px] text-[var(--color-texto-secundario)]">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Archivo listo para ingesta
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[var(--color-icono-sutil)]" />
                      <span className="text-xs font-medium text-[var(--color-texto)]">
                        Arrastra tu archivo PDF aquí o haz clic para buscarlo
                      </span>
                      <span className="text-[10px] text-[var(--color-texto-secundario)]">Formato PDF • Hasta 50 MB</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mensaje de Paso / Progreso */}
            {loading && stepMessage && (
              <div className="p-3 rounded-xl bg-[var(--color-secundario-suave)] border border-[var(--color-secundario-borde)] text-[var(--color-exito-texto)] text-xs flex items-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{stepMessage}</span>
              </div>
            )}

            {/* Botón de Enviar */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-1/3 py-2.5 rounded-xl font-bold text-xs btn-smartlex-secondary cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-2/3 py-2.5 rounded-xl font-black text-xs bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>Procesando norma con IA...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Subir e Iniciar Extracción</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
