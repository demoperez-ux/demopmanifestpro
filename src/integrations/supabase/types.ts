export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alertas_peso: {
        Row: {
          created_at: string
          diferencia: number
          estado: string | null
          guia: string
          id: string
          mawb: string | null
          notas: string | null
          peso_bruto_declarado: number
          peso_neto_calculado: number
          porcentaje_diferencia: number
          revisado_por: string | null
          severidad: string
        }
        Insert: {
          created_at?: string
          diferencia: number
          estado?: string | null
          guia: string
          id?: string
          mawb?: string | null
          notas?: string | null
          peso_bruto_declarado: number
          peso_neto_calculado: number
          porcentaje_diferencia: number
          revisado_por?: string | null
          severidad: string
        }
        Update: {
          created_at?: string
          diferencia?: number
          estado?: string | null
          guia?: string
          id?: string
          mawb?: string | null
          notas?: string | null
          peso_bruto_declarado?: number
          peso_neto_calculado?: number
          porcentaje_diferencia?: number
          revisado_por?: string | null
          severidad?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          hash_content: string | null
          hash_previous: string | null
          id: string
          manifest_id: string | null
          sequence_number: number | null
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          hash_content?: string | null
          hash_previous?: string | null
          id?: string
          manifest_id?: string | null
          sequence_number?: number | null
          user_id: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          hash_content?: string | null
          hash_previous?: string | null
          id?: string
          manifest_id?: string | null
          sequence_number?: number | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      clasificaciones_validadas: {
        Row: {
          activo: boolean | null
          autoridad_anuente: string | null
          confianza: number | null
          corredor_id: string
          corredor_nombre: string | null
          created_at: string
          dai_percent: number | null
          descripcion_arancelaria: string | null
          descripcion_normalizada: string
          descripcion_original: string
          guia_origen: string | null
          hts_code: string
          id: string
          isc_percent: number | null
          itbms_percent: number | null
          mawb_origen: string | null
          updated_at: string
          usos_exitosos: number | null
        }
        Insert: {
          activo?: boolean | null
          autoridad_anuente?: string | null
          confianza?: number | null
          corredor_id: string
          corredor_nombre?: string | null
          created_at?: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_normalizada: string
          descripcion_original: string
          guia_origen?: string | null
          hts_code: string
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          mawb_origen?: string | null
          updated_at?: string
          usos_exitosos?: number | null
        }
        Update: {
          activo?: boolean | null
          autoridad_anuente?: string | null
          confianza?: number | null
          corredor_id?: string
          corredor_nombre?: string | null
          created_at?: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_normalizada?: string
          descripcion_original?: string
          guia_origen?: string | null
          hts_code?: string
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          mawb_origen?: string | null
          updated_at?: string
          usos_exitosos?: number | null
        }
        Relationships: []
      }
      consignatarios_fiscales: {
        Row: {
          activo: boolean | null
          ciudad_principal: string | null
          corredor_id: string | null
          created_at: string
          direccion_principal: string | null
          email: string | null
          id: string
          nombre_consignatario: string
          nombre_normalizado: string
          notas: string | null
          provincia_principal: string | null
          ruc_cedula: string
          telefono: string | null
          tipo_documento: string | null
          ultimo_uso: string | null
          updated_at: string
          usos_exitosos: number | null
        }
        Insert: {
          activo?: boolean | null
          ciudad_principal?: string | null
          corredor_id?: string | null
          created_at?: string
          direccion_principal?: string | null
          email?: string | null
          id?: string
          nombre_consignatario: string
          nombre_normalizado: string
          notas?: string | null
          provincia_principal?: string | null
          ruc_cedula: string
          telefono?: string | null
          tipo_documento?: string | null
          ultimo_uso?: string | null
          updated_at?: string
          usos_exitosos?: number | null
        }
        Update: {
          activo?: boolean | null
          ciudad_principal?: string | null
          corredor_id?: string | null
          created_at?: string
          direccion_principal?: string | null
          email?: string | null
          id?: string
          nombre_consignatario?: string
          nombre_normalizado?: string
          notas?: string | null
          provincia_principal?: string | null
          ruc_cedula?: string
          telefono?: string | null
          tipo_documento?: string | null
          ultimo_uso?: string | null
          updated_at?: string
          usos_exitosos?: number | null
        }
        Relationships: []
      }
      consultas_clasificatorias: {
        Row: {
          autoridad_anuente: string | null
          corredor_id: string
          created_at: string
          criterio_ana: string
          dai_percent: number | null
          descripcion_arancelaria: string | null
          descripcion_mercancia: string
          estado: string
          fecha_resolucion: string
          fecha_vigencia_fin: string | null
          fecha_vigencia_inicio: string | null
          fundamento_legal: string | null
          hts_code: string
          id: string
          isc_percent: number | null
          itbms_percent: number | null
          notas: string | null
          numero_resolucion: string
          solicitante: string
          updated_at: string
        }
        Insert: {
          autoridad_anuente?: string | null
          corredor_id: string
          created_at?: string
          criterio_ana: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_mercancia: string
          estado?: string
          fecha_resolucion: string
          fecha_vigencia_fin?: string | null
          fecha_vigencia_inicio?: string | null
          fundamento_legal?: string | null
          hts_code: string
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          notas?: string | null
          numero_resolucion: string
          solicitante: string
          updated_at?: string
        }
        Update: {
          autoridad_anuente?: string | null
          corredor_id?: string
          created_at?: string
          criterio_ana?: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_mercancia?: string
          estado?: string
          fecha_resolucion?: string
          fecha_vigencia_fin?: string | null
          fecha_vigencia_inicio?: string | null
          fundamento_legal?: string | null
          hts_code?: string
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          notas?: string | null
          numero_resolucion?: string
          solicitante?: string
          updated_at?: string
        }
        Relationships: []
      }
      embarques_orion: {
        Row: {
          afc_alerta_perecedero_emitida: boolean
          afc_apto_despacho_anticipado: boolean
          afc_certificado_cumplimiento: Json | null
          afc_perecedero: boolean
          afc_prioridad_periferia: boolean
          afc_sello_facilitacion: boolean
          ata: string | null
          bultos: number | null
          buque_vuelo: string | null
          consignatario: string
          consignatario_ruc: string | null
          created_at: string
          customs_clearance_required: boolean
          descripcion_carga: string | null
          destination_country: string
          estado: string
          eta: string | null
          id: string
          modo_transporte: string
          moneda: string
          operador_id: string | null
          origin_country: string
          orion_shipment_id: string
          peso_bruto_kg: number | null
          peso_neto_kg: number | null
          pre_liquidacion: Json | null
          recinto_destino: string | null
          referencia: string
          salud_documental: number
          shipper: string | null
          stella_notas: Json | null
          tipo_documento: string
          updated_at: string
          valor_cif: number | null
          valor_flete: number | null
          valor_fob: number | null
          valor_seguro: number | null
          zod_duplicado_detectado: boolean
          zod_hallazgos: Json | null
          zod_validado: boolean
        }
        Insert: {
          afc_alerta_perecedero_emitida?: boolean
          afc_apto_despacho_anticipado?: boolean
          afc_certificado_cumplimiento?: Json | null
          afc_perecedero?: boolean
          afc_prioridad_periferia?: boolean
          afc_sello_facilitacion?: boolean
          ata?: string | null
          bultos?: number | null
          buque_vuelo?: string | null
          consignatario: string
          consignatario_ruc?: string | null
          created_at?: string
          customs_clearance_required?: boolean
          descripcion_carga?: string | null
          destination_country: string
          estado?: string
          eta?: string | null
          id?: string
          modo_transporte?: string
          moneda?: string
          operador_id?: string | null
          origin_country: string
          orion_shipment_id: string
          peso_bruto_kg?: number | null
          peso_neto_kg?: number | null
          pre_liquidacion?: Json | null
          recinto_destino?: string | null
          referencia: string
          salud_documental?: number
          shipper?: string | null
          stella_notas?: Json | null
          tipo_documento?: string
          updated_at?: string
          valor_cif?: number | null
          valor_flete?: number | null
          valor_fob?: number | null
          valor_seguro?: number | null
          zod_duplicado_detectado?: boolean
          zod_hallazgos?: Json | null
          zod_validado?: boolean
        }
        Update: {
          afc_alerta_perecedero_emitida?: boolean
          afc_apto_despacho_anticipado?: boolean
          afc_certificado_cumplimiento?: Json | null
          afc_perecedero?: boolean
          afc_prioridad_periferia?: boolean
          afc_sello_facilitacion?: boolean
          ata?: string | null
          bultos?: number | null
          buque_vuelo?: string | null
          consignatario?: string
          consignatario_ruc?: string | null
          created_at?: string
          customs_clearance_required?: boolean
          descripcion_carga?: string | null
          destination_country?: string
          estado?: string
          eta?: string | null
          id?: string
          modo_transporte?: string
          moneda?: string
          operador_id?: string | null
          origin_country?: string
          orion_shipment_id?: string
          peso_bruto_kg?: number | null
          peso_neto_kg?: number | null
          pre_liquidacion?: Json | null
          recinto_destino?: string | null
          referencia?: string
          salud_documental?: number
          shipper?: string | null
          stella_notas?: Json | null
          tipo_documento?: string
          updated_at?: string
          valor_cif?: number | null
          valor_flete?: number | null
          valor_fob?: number | null
          valor_seguro?: number | null
          zod_duplicado_detectado?: boolean
          zod_hallazgos?: Json | null
          zod_validado?: boolean
        }
        Relationships: []
      }
      inspecciones_17pts: {
        Row: {
          certificada_at: string | null
          created_at: string
          estado: string
          fotos_urls: Json
          hash_certificacion: string | null
          id: string
          items: Json
          mawb: string
          nivel_riesgo: string | null
          notas: string | null
          operador_id: string
          progreso: number
          score_riesgo: number | null
          updated_at: string
        }
        Insert: {
          certificada_at?: string | null
          created_at?: string
          estado?: string
          fotos_urls?: Json
          hash_certificacion?: string | null
          id?: string
          items?: Json
          mawb: string
          nivel_riesgo?: string | null
          notas?: string | null
          operador_id: string
          progreso?: number
          score_riesgo?: number | null
          updated_at?: string
        }
        Update: {
          certificada_at?: string | null
          created_at?: string
          estado?: string
          fotos_urls?: Json
          hash_certificacion?: string | null
          id?: string
          items?: Json
          mawb?: string
          nivel_riesgo?: string | null
          notas?: string | null
          operador_id?: string
          progreso?: number
          score_riesgo?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "operador" | "revisor" | "auditor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operador", "revisor", "auditor", "admin"],
    },
  },
} as const
