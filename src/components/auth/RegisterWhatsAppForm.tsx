import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TaxpayerNature, TaxpayerClass } from '../../types/auth';
import {
  MessageCircle,
  Mail,
  Lock,
  User,
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
    const digits = raw.replace(/\D/g, '');
    let clean = digits.startsWith('593') ? digits.slice(3) : digits;
    if (clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    return `+593${clean}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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
    if (normalizedPhone.length !== 13 || !normalizedPhone.startsWith('+5939')) {
      setErrorMsg('Por favor ingresa un número celular de Ecuador válido (ej: 099 123 4567).');
      return;
    }

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

    const ninthDigit = cleanId.length >= 9 ? parseInt(cleanId[8], 10) : null;
    const finalRuc = !isSinRuc && cleanId.length === 10 ? `${cleanId}001` : cleanId;

    if (!optIn) {
      setErrorMsg('Debes aceptar recibir alertas por WhatsApp para activar el Plan Free.');
      return;
    }

    setLoading(true);

    try {
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
        <div className="p-3 rounded-lg bg-[var(--color-error-fondo)] border border-[var(--color-error-borde)] text-[var(--color-error)] text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Fila 1: Nombre y Correo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
            Nombre y apellido
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej: Oswaldo Cárdenas"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu-correo@ejemplo.com"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
            />
          </div>
        </div>
      </div>

      {/* Fila 2: Contraseña y WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
            Contraseña (mín. 6)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 pl-9 pr-10 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-icono-sutil)] hover:text-[var(--color-texto)] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-texto)] mb-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
            <span>WhatsApp Ecuador</span>
          </label>
          <div className="flex h-10 rounded-lg overflow-hidden border border-[var(--color-borde)] focus-within:border-[var(--color-secundario)] focus-within:ring-1 focus-within:ring-[var(--color-secundario)] bg-[var(--color-fondo)]">
            <div className="flex items-center gap-1 px-2.5 bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] text-xs font-bold border-r border-[var(--color-borde)] shrink-0">
              <span>🇪🇨</span>
              <span>+593</span>
            </div>
            <input
              type="tel"
              required
              value={whatsappRaw}
              onChange={e => setWhatsappRaw(e.target.value)}
              placeholder="099 123 4567"
              className="w-full h-full px-3 bg-transparent text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bloque agrupado: Datos tributarios */}
      <div className="rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)] p-3.5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-texto-secundario)]">
          Datos tributarios para tus alertas
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
              Tipo de contribuyente
            </label>
            <select
              value={taxpayerNature}
              onChange={e => setTaxpayerNature(e.target.value as TaxpayerNature)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)] cursor-pointer"
            >
              <option value="persona_natural">Persona Natural</option>
              <option value="sociedad">Sociedad (Persona Jurídica)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
              Régimen fiscal
            </label>
            <select
              value={taxpayerClass}
              onChange={e => setTaxpayerClass(e.target.value as TaxpayerClass)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto)] text-xs focus:outline-none focus:border-[var(--color-secundario)] cursor-pointer"
            >
              <option value="sin_ruc">Persona Natural sin RUC (Jurista / Estudiante)</option>
              <option value="no_obligado_contabilidad">Régimen General - No obligado a contabilidad</option>
              <option value="obligado_contabilidad">Régimen General - Obligado a contabilidad</option>
              <option value="rimpe_emprendedor">RIMPE - Emprendedor</option>
              <option value="rimpe_negocio_popular">RIMPE - Negocio Popular</option>
              <option value="contribuyente_especial">Contribuyente Especial</option>
              <option value="gran_contribuyente">Gran Contribuyente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
            {taxpayerClass === 'sin_ruc' ? 'Número de Cédula (Obligatorio)' : 'Número de RUC o Cédula (Obligatorio)'}
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              maxLength={taxpayerClass === 'sin_ruc' ? 10 : 13}
              value={idNumber}
              onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
              placeholder={taxpayerClass === 'sin_ruc' ? 'Ej: 1712345678 (10 dígitos)' : 'Ej: 1712345678001 (13 dígitos)'}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-superficie)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm font-mono focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
            />
          </div>
          <p className="text-[11px] text-[var(--color-texto-secundario)] mt-1.5">
            {taxpayerClass === 'sin_ruc'
              ? 'Detectamos tu 9.º dígito para recordarte Gastos Personales y Declaración de Renta.'
              : 'Detectamos automáticamente tu 9.º dígito para los vencimientos del SRI.'}
          </p>
        </div>
      </div>

      {/* Consentimiento */}
      <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
        <input
          type="checkbox"
          checked={optIn}
          onChange={e => setOptIn(e.target.checked)}
          className="mt-0.5 rounded border-[var(--color-borde-fuerte)] bg-[var(--color-fondo)] accent-[var(--color-secundario)] w-4 h-4 cursor-pointer shrink-0"
        />
        <span className="text-xs text-[var(--color-texto-secundario)] leading-snug">
          Acepto recibir alertas tributarias, reformas del Registro Oficial y vencimientos según mi régimen vía WhatsApp.
        </span>
      </label>

      {/* Botón principal */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg font-bold text-sm bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <span>Creando cuenta gratuita...</span>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Activar mi cuenta gratuita (Plan Free)</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Enlace a Login */}
      <div className="text-center pt-2 border-t border-[var(--color-borde)]">
        <p className="text-xs text-[var(--color-texto-secundario)]">
          ¿Ya tienes cuenta en SmartLex?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[var(--color-secundario)] hover:text-[var(--color-secundario-hover)] font-semibold cursor-pointer"
          >
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </form>
  );
};
