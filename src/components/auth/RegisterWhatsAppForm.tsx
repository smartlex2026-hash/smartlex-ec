import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TaxpayerNature, TaxpayerClass } from '../../types/auth';
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface RegisterWhatsAppFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterWhatsAppForm: React.FC<RegisterWhatsAppFormProps> = ({
  onSuccess,
  onSwitchToLogin
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappRaw, setWhatsappRaw] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [taxpayerNature, setTaxpayerNature] = useState<TaxpayerNature>('persona_natural');
  const [taxpayerClass, setTaxpayerClass] = useState<TaxpayerClass>('sin_ruc');
  const [optIn, setOptIn] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Normalizador de teléfono de WhatsApp para Ecuador (+593)
  const formatEcuadorPhone = (raw: string): string => {
    // Quitar espacios, guiones y caracteres no numéricos
    const digits = raw.replace(/\D/g, '');
    // Si empieza por 593, quitarlo para unificar
    let clean = digits.startsWith('593') ? digits.slice(3) : digits;
    // Si empieza con 0 (ej: 0991234567), quitar el 0 inicial
    if (clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    return `+593${clean}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validaciones
    if (!fullName.trim()) {
      setErrorMsg('Por favor, ingresa tu nombre y apellido.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const normalizedPhone = formatEcuadorPhone(whatsappRaw);
    // Validación: +593 seguido de 9 dígitos (total 13 caracteres)
    if (normalizedPhone.length !== 13 || !normalizedPhone.startsWith('+5939')) {
      setErrorMsg('Por favor ingresa un número celular de Ecuador válido (ej: 099 123 4567).');
      return;
    }

    // Validación obligatoria de Cédula o RUC
    const cleanId = idNumber.replace(/\D/g, '');
    const isSinRuc = taxpayerClass === 'sin_ruc';

    if (isSinRuc) {
      if (cleanId.length !== 10) {
        setErrorMsg('El número de cédula es obligatorio y debe tener exactamente 10 dígitos.');
        return;
      }
    } else {
      if (cleanId.length !== 13 && cleanId.length !== 10) {
        setErrorMsg('Por favor ingresa un número de RUC válido de 13 dígitos (o cédula de 10 dígitos).');
        return;
      }
    }

    // Cálculo automático del 9.º dígito (posición 8 en base 0)
    const ninthDigit = cleanId.length >= 9 ? parseInt(cleanId[8], 10) : null;
    const finalRuc = !isSinRuc && cleanId.length === 10 ? `${cleanId}001` : cleanId;

    if (!optIn) {
      setErrorMsg('Debes aceptar recibir alertas por WhatsApp para activar el Plan Free.');
      return;
    }

    setLoading(true);

    try {
      // 1. Registro con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            whatsapp_phone: normalizedPhone,
            ruc_number: finalRuc,
            ruc_ninth_digit: ninthDigit,
            taxpayer_nature: taxpayerNature,
            taxpayer_class: taxpayerClass
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (userId) {
        // 2. Inserción o actualización en public.profiles
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            phone: normalizedPhone,
            whatsapp_phone: normalizedPhone,
            country: 'EC',
            ruc_number: finalRuc,
            ruc_ninth_digit: ninthDigit,
            taxpayer_nature: taxpayerNature,
            taxpayer_class: taxpayerClass,
            whatsapp_opt_in: true,
            whatsapp_opt_in_at: new Date().toISOString(),
            is_active: true
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          console.warn('Nota al actualizar perfil:', profileError.message);
        }

        // Disparo de bienvenida por WhatsApp en N8N
        try {
          await fetch('https://n8n.smartlexec.cloud/webhook/smartlex-bienvenida-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              record: {
                id: userId,
                full_name: fullName.trim(),
                whatsapp_phone: normalizedPhone,
                ruc_number: finalRuc,
                ruc_ninth_digit: ninthDigit,
                taxpayer_nature: taxpayerNature,
                taxpayer_class: taxpayerClass,
                whatsapp_opt_in: true
              }
            })
          });
        } catch (webhookErr) {
          console.warn('Nota al enviar webhook de bienvenida a N8N:', webhookErr);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error en registro:', err);
      setErrorMsg(err.message || 'Ocurrió un error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Nombre completo */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nombre y Apellido</label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Ej: Oswaldo Cárdenas"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Correo electrónico */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu-correo@ejemplo.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña (Mínimo 6 caracteres)</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* WhatsApp ecuatoriano obligatorio */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            Número de WhatsApp (Requerido)
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Alertas fiscales y vencimientos</span>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-emerald-600/40 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-slate-900">
          <div className="flex items-center gap-1.5 px-3 bg-emerald-950/40 text-emerald-300 text-xs font-bold border-r border-emerald-900/50">
            <span>🇪🇨</span>
            <span>+593</span>
          </div>
          <input
            type="tel"
            required
            value={whatsappRaw}
            onChange={e => setWhatsappRaw(e.target.value)}
            placeholder="099 123 4567"
            className="w-full px-3.5 py-2.5 bg-transparent text-white text-sm focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Escribe tu número celular de 9 o 10 dígitos. Te enviaremos alertas oficiales por WhatsApp.
        </p>
      </div>

      {/* Desplegables de Segmentación Tributaria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Desplegable 1: Tipo de Contribuyente */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Contribuyente</label>
          <select
            value={taxpayerNature}
            onChange={e => setTaxpayerNature(e.target.value as TaxpayerNature)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="persona_natural">Persona Natural</option>
            <option value="sociedad">Sociedad (Persona Jurídica)</option>
          </select>
        </div>

        {/* Desplegable 2: Clase / Régimen */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Clase / Régimen Fiscal</label>
          <select
            value={taxpayerClass}
            onChange={e => setTaxpayerClass(e.target.value as TaxpayerClass)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="sin_ruc">Persona Natural sin RUC (Jurista / Estudiante / Dependiente)</option>
            <option value="no_obligado_contabilidad">Régimen General - No obligado a contabilidad</option>
            <option value="obligado_contabilidad">Régimen General - Obligado a llevar contabilidad</option>
            <option value="rimpe_emprendedor">RIMPE - Emprendedor</option>
            <option value="rimpe_negocio_popular">RIMPE - Negocio Popular</option>
            <option value="contribuyente_especial">Contribuyente Especial</option>
            <option value="gran_contribuyente">Gran Contribuyente</option>
          </select>
        </div>
      </div>

      {/* Campo Cédula o RUC obligatorio */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          {taxpayerClass === 'sin_ruc' ? 'Número de Cédula (Obligatorio)' : 'Número de RUC o Cédula (Obligatorio)'}
        </label>
        <div className="relative">
          <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            maxLength={taxpayerClass === 'sin_ruc' ? 10 : 13}
            value={idNumber}
            onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
            placeholder={taxpayerClass === 'sin_ruc' ? 'Ej: 1712345678 (10 dígitos)' : 'Ej: 1712345678001 (13 dígitos)'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          {taxpayerClass === 'sin_ruc'
            ? 'Tu 9.º dígito se detectará automáticamente para recordarte el Anexo de Gastos Personales y la Declaración de Renta.'
            : 'Tu 9.º dígito se detectará automáticamente para calcular tus calendarios de vencimiento del SRI.'}
        </p>
      </div>

      {/* Casilla de Consentimiento / Opt-In Legal */}
      <div className="pt-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={optIn}
            onChange={e => setOptIn(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
          />
          <span className="text-[11px] text-slate-300 leading-tight">
            Acepto recibir alertas tributarias inmediatas, reformas del Registro Oficial y recordatorios de vencimiento
            según mi régimen vía WhatsApp.
          </span>
        </label>
      </div>

      {/* Botón de Enviar */}
      <div className="pt-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>Creando cuenta gratuita...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Activar mi Cuenta Gratuita (Plan Free)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Enlace para cambiar a Iniciar Sesión */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          ¿Ya tienes cuenta en SmartLex?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
          >
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </form>
  );
};

