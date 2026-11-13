export type TaxpayerNature = 'persona_natural' | 'sociedad';

export type TaxpayerClass =
  | 'sin_ruc'
  | 'contribuyente_especial'
  | 'gran_contribuyente'
  | 'obligado_contabilidad'
  | 'no_obligado_contabilidad'
  | 'rimpe_emprendedor'
  | 'rimpe_negocio_popular';

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  ruc_number?: string | null;
  ruc_ninth_digit?: number | null;
  country: string;
  taxpayer_nature: TaxpayerNature | null;
  taxpayer_class: TaxpayerClass | null;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  plan_code?: string;
}

