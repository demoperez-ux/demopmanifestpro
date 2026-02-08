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
      acuerdos_comerciales: {
        Row: {
          activo: boolean
          arancel_general: number
          arancel_preferencial: number
          codigo_arancelario: string
          created_at: string
          id: string
          notas: string | null
          pais_origen: string
          requisitos_origen: string | null
          tratado_codigo: string
          tratado_nombre: string
          updated_at: string
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          arancel_general?: number
          arancel_preferencial?: number
          codigo_arancelario: string
          created_at?: string
          id?: string
          notas?: string | null
          pais_origen: string
          requisitos_origen?: string | null
          tratado_codigo: string
          tratado_nombre: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          arancel_general?: number
          arancel_preferencial?: number
          codigo_arancelario?: string
          created_at?: string
          id?: string
          notas?: string | null
          pais_origen?: string
          requisitos_origen?: string | null
          tratado_codigo?: string
          tratado_nombre?: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: []
      }
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
      aprobaciones_cliente: {
        Row: {
          aprobado: boolean | null
          cliente_email: string | null
          cliente_nombre: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          pre_factura_id: string
          token: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          aprobado?: boolean | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          pre_factura_id: string
          token: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          aprobado?: boolean | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          pre_factura_id?: string
          token?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aprobaciones_cliente_pre_factura_id_fkey"
            columns: ["pre_factura_id"]
            isOneToOne: false
            referencedRelation: "pre_facturas"
            referencedColumns: ["id"]
          },
        ]
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
      clientes_importadores: {
        Row: {
          aviso_operacion: string | null
          cedula_representante: string | null
          ciudad: string | null
          corredor_id: string
          created_at: string
          direccion: string | null
          dv: string | null
          email: string | null
          estado: string
          id: string
          kyc_fecha: string | null
          kyc_verificado: boolean | null
          nombre_comercial: string | null
          notas: string | null
          pais: string | null
          provincia: string | null
          razon_social: string
          registro_publico: string | null
          representante_legal: string | null
          ruc: string
          telefono: string | null
          tipo_persona: string
          updated_at: string
        }
        Insert: {
          aviso_operacion?: string | null
          cedula_representante?: string | null
          ciudad?: string | null
          corredor_id: string
          created_at?: string
          direccion?: string | null
          dv?: string | null
          email?: string | null
          estado?: string
          id?: string
          kyc_fecha?: string | null
          kyc_verificado?: boolean | null
          nombre_comercial?: string | null
          notas?: string | null
          pais?: string | null
          provincia?: string | null
          razon_social: string
          registro_publico?: string | null
          representante_legal?: string | null
          ruc: string
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
        }
        Update: {
          aviso_operacion?: string | null
          cedula_representante?: string | null
          ciudad?: string | null
          corredor_id?: string
          created_at?: string
          direccion?: string | null
          dv?: string | null
          email?: string | null
          estado?: string
          id?: string
          kyc_fecha?: string | null
          kyc_verificado?: boolean | null
          nombre_comercial?: string | null
          notas?: string | null
          pais?: string | null
          provincia?: string | null
          razon_social?: string
          registro_publico?: string | null
          representante_legal?: string | null
          ruc?: string
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
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
      corredores_acreditados: {
        Row: {
          cedula: string
          created_at: string
          email: string | null
          empresa: string | null
          estado: string
          estado_fianza: string
          fianza_vencimiento: string | null
          firma_clave_publica: string | null
          firma_digital_habilitada: boolean
          id: string
          licencia_ana: string
          licencia_vencimiento: string
          monto_fianza: number
          nombre_completo: string
          notas: string | null
          telefono: string | null
          tipo_fianza: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cedula: string
          created_at?: string
          email?: string | null
          empresa?: string | null
          estado?: string
          estado_fianza?: string
          fianza_vencimiento?: string | null
          firma_clave_publica?: string | null
          firma_digital_habilitada?: boolean
          id?: string
          licencia_ana: string
          licencia_vencimiento: string
          monto_fianza?: number
          nombre_completo: string
          notas?: string | null
          telefono?: string | null
          tipo_fianza?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cedula?: string
          created_at?: string
          email?: string | null
          empresa?: string | null
          estado?: string
          estado_fianza?: string
          fianza_vencimiento?: string | null
          firma_clave_publica?: string | null
          firma_digital_habilitada?: boolean
          id?: string
          licencia_ana?: string
          licencia_vencimiento?: string
          monto_fianza?: number
          nombre_completo?: string
          notas?: string | null
          telefono?: string | null
          tipo_fianza?: string
          updated_at?: string
          user_id?: string
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
          billing_status: string
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
          gln_destino: string | null
          gln_shipper: string | null
          gs1_conflictos: Json | null
          gs1_validado: boolean | null
          gtin_items: Json | null
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
          billing_status?: string
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
          gln_destino?: string | null
          gln_shipper?: string | null
          gs1_conflictos?: Json | null
          gs1_validado?: boolean | null
          gtin_items?: Json | null
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
          billing_status?: string
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
          gln_destino?: string | null
          gln_shipper?: string | null
          gs1_conflictos?: Json | null
          gs1_validado?: boolean | null
          gtin_items?: Json | null
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
      mapeo_gs1_hts: {
        Row: {
          activo: boolean | null
          autoridad_anuente: string | null
          conflicto_detectado: boolean | null
          corredor_id: string | null
          created_at: string
          dai_percent: number | null
          descripcion_arancelaria: string | null
          descripcion_producto: string
          fuente: string | null
          gln_shipper: string | null
          gtin: string
          gtin_checksum_valido: boolean
          gtin_tipo: string | null
          id: string
          isc_percent: number | null
          itbms_percent: number | null
          nombre_shipper: string | null
          notas_conflicto: string | null
          orion_sku: string | null
          orion_sync_at: string | null
          pais_origen: string | null
          partida_arancelaria: string
          prefijo_gs1: string | null
          restricciones_salud: string[] | null
          ultimo_uso: string | null
          unidad_medida: string | null
          updated_at: string
          usos_exitosos: number | null
          validado_por_zod: boolean | null
        }
        Insert: {
          activo?: boolean | null
          autoridad_anuente?: string | null
          conflicto_detectado?: boolean | null
          corredor_id?: string | null
          created_at?: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_producto: string
          fuente?: string | null
          gln_shipper?: string | null
          gtin: string
          gtin_checksum_valido?: boolean
          gtin_tipo?: string | null
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          nombre_shipper?: string | null
          notas_conflicto?: string | null
          orion_sku?: string | null
          orion_sync_at?: string | null
          pais_origen?: string | null
          partida_arancelaria: string
          prefijo_gs1?: string | null
          restricciones_salud?: string[] | null
          ultimo_uso?: string | null
          unidad_medida?: string | null
          updated_at?: string
          usos_exitosos?: number | null
          validado_por_zod?: boolean | null
        }
        Update: {
          activo?: boolean | null
          autoridad_anuente?: string | null
          conflicto_detectado?: boolean | null
          corredor_id?: string | null
          created_at?: string
          dai_percent?: number | null
          descripcion_arancelaria?: string | null
          descripcion_producto?: string
          fuente?: string | null
          gln_shipper?: string | null
          gtin?: string
          gtin_checksum_valido?: boolean
          gtin_tipo?: string | null
          id?: string
          isc_percent?: number | null
          itbms_percent?: number | null
          nombre_shipper?: string | null
          notas_conflicto?: string | null
          orion_sku?: string | null
          orion_sync_at?: string | null
          pais_origen?: string | null
          partida_arancelaria?: string
          prefijo_gs1?: string | null
          restricciones_salud?: string[] | null
          ultimo_uso?: string | null
          unidad_medida?: string | null
          updated_at?: string
          usos_exitosos?: number | null
          validado_por_zod?: boolean | null
        }
        Relationships: []
      }
      onboarding_audit_trail: {
        Row: {
          accion: string
          created_at: string
          detalles: Json | null
          etapa: number | null
          hash_content: string | null
          hash_previous: string | null
          id: string
          motivo: string | null
          proceso_id: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          detalles?: Json | null
          etapa?: number | null
          hash_content?: string | null
          hash_previous?: string | null
          id?: string
          motivo?: string | null
          proceso_id: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          detalles?: Json | null
          etapa?: number | null
          hash_content?: string | null
          hash_previous?: string | null
          id?: string
          motivo?: string | null
          proceso_id?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_audit_trail_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "onboarding_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documentos: {
        Row: {
          ai_campos_criticos: Json | null
          ai_confidence: number | null
          ai_extracted_data: Json | null
          created_at: string
          etapa: number
          file_size: number | null
          id: string
          mime_type: string | null
          nombre_documento: string
          proceso_id: string
          requiere_revision_manual: boolean | null
          revisado_at: string | null
          revisado_por: string | null
          storage_path: string | null
          tipo_documento: string
          updated_at: string
          zod_sello_hash: string | null
          zod_validado: boolean | null
        }
        Insert: {
          ai_campos_criticos?: Json | null
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
          created_at?: string
          etapa: number
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nombre_documento: string
          proceso_id: string
          requiere_revision_manual?: boolean | null
          revisado_at?: string | null
          revisado_por?: string | null
          storage_path?: string | null
          tipo_documento: string
          updated_at?: string
          zod_sello_hash?: string | null
          zod_validado?: boolean | null
        }
        Update: {
          ai_campos_criticos?: Json | null
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
          created_at?: string
          etapa?: number
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nombre_documento?: string
          proceso_id?: string
          requiere_revision_manual?: boolean | null
          revisado_at?: string | null
          revisado_por?: string | null
          storage_path?: string | null
          tipo_documento?: string
          updated_at?: string
          zod_sello_hash?: string | null
          zod_validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documentos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "onboarding_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_procesos: {
        Row: {
          assigned_to: string | null
          control_points: Json | null
          corredor_cedula: string
          corredor_email: string | null
          corredor_nombre: string
          corredor_telefono: string | null
          created_at: string
          created_by: string
          document_completeness_score: number | null
          empresa_nombre: string | null
          empresa_ruc: string | null
          estado: string
          estado_fianza: string | null
          etapa_actual: number
          id: string
          monto_fianza: number | null
          notas: string | null
          risk_score: number | null
          sla_timestamps: Json | null
          tipo_fianza: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          control_points?: Json | null
          corredor_cedula: string
          corredor_email?: string | null
          corredor_nombre: string
          corredor_telefono?: string | null
          created_at?: string
          created_by: string
          document_completeness_score?: number | null
          empresa_nombre?: string | null
          empresa_ruc?: string | null
          estado?: string
          estado_fianza?: string | null
          etapa_actual?: number
          id?: string
          monto_fianza?: number | null
          notas?: string | null
          risk_score?: number | null
          sla_timestamps?: Json | null
          tipo_fianza?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          control_points?: Json | null
          corredor_cedula?: string
          corredor_email?: string | null
          corredor_nombre?: string
          corredor_telefono?: string | null
          created_at?: string
          created_by?: string
          document_completeness_score?: number | null
          empresa_nombre?: string | null
          empresa_ruc?: string | null
          estado?: string
          estado_fianza?: string | null
          etapa_actual?: number
          id?: string
          monto_fianza?: number | null
          notas?: string | null
          risk_score?: number | null
          sla_timestamps?: Json | null
          tipo_fianza?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pre_facturas: {
        Row: {
          aprobado_por_cliente: boolean | null
          billing_status: string
          cliente_aprobacion_ip: string | null
          cliente_aprobacion_nombre: string | null
          cliente_aprobacion_timestamp: string | null
          consignatario: string
          corredor_id: string | null
          created_at: string
          doc_num: string
          embarque_id: string
          id: string
          itbms: number
          lineas: Json
          mawb: string
          moneda: string
          operador_id: string
          razon_social: string | null
          rechazado: boolean | null
          rechazo_motivo: string | null
          rechazo_por: string | null
          rechazo_timestamp: string | null
          ruc: string | null
          sap_exportado: boolean | null
          sap_exportado_at: string | null
          sap_exportado_por: string | null
          soportes_terceros: Json
          subtotal: number
          token_aprobacion: string | null
          token_expiracion: string | null
          total: number
          updated_at: string
          zod_hash_integridad: string | null
          zod_validado: boolean | null
        }
        Insert: {
          aprobado_por_cliente?: boolean | null
          billing_status?: string
          cliente_aprobacion_ip?: string | null
          cliente_aprobacion_nombre?: string | null
          cliente_aprobacion_timestamp?: string | null
          consignatario: string
          corredor_id?: string | null
          created_at?: string
          doc_num: string
          embarque_id: string
          id?: string
          itbms?: number
          lineas?: Json
          mawb: string
          moneda?: string
          operador_id: string
          razon_social?: string | null
          rechazado?: boolean | null
          rechazo_motivo?: string | null
          rechazo_por?: string | null
          rechazo_timestamp?: string | null
          ruc?: string | null
          sap_exportado?: boolean | null
          sap_exportado_at?: string | null
          sap_exportado_por?: string | null
          soportes_terceros?: Json
          subtotal?: number
          token_aprobacion?: string | null
          token_expiracion?: string | null
          total?: number
          updated_at?: string
          zod_hash_integridad?: string | null
          zod_validado?: boolean | null
        }
        Update: {
          aprobado_por_cliente?: boolean | null
          billing_status?: string
          cliente_aprobacion_ip?: string | null
          cliente_aprobacion_nombre?: string | null
          cliente_aprobacion_timestamp?: string | null
          consignatario?: string
          corredor_id?: string | null
          created_at?: string
          doc_num?: string
          embarque_id?: string
          id?: string
          itbms?: number
          lineas?: Json
          mawb?: string
          moneda?: string
          operador_id?: string
          razon_social?: string | null
          rechazado?: boolean | null
          rechazo_motivo?: string | null
          rechazo_por?: string | null
          rechazo_timestamp?: string | null
          ruc?: string | null
          sap_exportado?: boolean | null
          sap_exportado_at?: string | null
          sap_exportado_por?: string | null
          soportes_terceros?: Json
          subtotal?: number
          token_aprobacion?: string | null
          token_expiracion?: string | null
          total?: number
          updated_at?: string
          zod_hash_integridad?: string | null
          zod_validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_facturas_corredor_id_fkey"
            columns: ["corredor_id"]
            isOneToOne: false
            referencedRelation: "corredores_acreditados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_facturas_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques_orion"
            referencedColumns: ["id"]
          },
        ]
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
      proveedores_internacionales: {
        Row: {
          ciudad: string | null
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          corredor_id: string
          created_at: string
          direccion: string | null
          estado: string
          id: string
          incoterm_preferido: string | null
          moneda_preferida: string | null
          nombre_comercial: string | null
          nombre_empresa: string
          notas: string | null
          pais_origen: string
          sancion_lista: string | null
          sancion_verificada_at: string | null
          tax_id: string | null
          tipo_proveedor: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ciudad?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          corredor_id: string
          created_at?: string
          direccion?: string | null
          estado?: string
          id?: string
          incoterm_preferido?: string | null
          moneda_preferida?: string | null
          nombre_comercial?: string | null
          nombre_empresa: string
          notas?: string | null
          pais_origen: string
          sancion_lista?: string | null
          sancion_verificada_at?: string | null
          tax_id?: string | null
          tipo_proveedor?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ciudad?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          corredor_id?: string
          created_at?: string
          direccion?: string | null
          estado?: string
          id?: string
          incoterm_preferido?: string | null
          moneda_preferida?: string | null
          nombre_comercial?: string | null
          nombre_empresa?: string
          notas?: string | null
          pais_origen?: string
          sancion_lista?: string | null
          sancion_verificada_at?: string | null
          tax_id?: string | null
          tipo_proveedor?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      regimenes_temporales: {
        Row: {
          alertas_enviadas: Json | null
          consignatario: string
          corredor_id: string
          created_at: string
          descripcion_mercancia: string | null
          embarque_id: string | null
          estado: string
          fecha_ingreso: string
          fecha_vencimiento: string
          id: string
          notas: string | null
          reexportacion_referencia: string | null
          referencia: string
          regimen_codigo: number
          regimen_nombre: string
          updated_at: string
          valor_cif: number | null
        }
        Insert: {
          alertas_enviadas?: Json | null
          consignatario: string
          corredor_id: string
          created_at?: string
          descripcion_mercancia?: string | null
          embarque_id?: string | null
          estado?: string
          fecha_ingreso?: string
          fecha_vencimiento: string
          id?: string
          notas?: string | null
          reexportacion_referencia?: string | null
          referencia: string
          regimen_codigo?: number
          regimen_nombre?: string
          updated_at?: string
          valor_cif?: number | null
        }
        Update: {
          alertas_enviadas?: Json | null
          consignatario?: string
          corredor_id?: string
          created_at?: string
          descripcion_mercancia?: string | null
          embarque_id?: string | null
          estado?: string
          fecha_ingreso?: string
          fecha_vencimiento?: string
          id?: string
          notas?: string | null
          reexportacion_referencia?: string | null
          referencia?: string
          regimen_codigo?: number
          regimen_nombre?: string
          updated_at?: string
          valor_cif?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regimenes_temporales_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques_orion"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          description: string | null
          device_fingerprint: string | null
          event_category: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          event_category?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_contracts: {
        Row: {
          activo: boolean
          cliente_nombre: string
          cliente_ruc: string | null
          corredor_id: string
          created_at: string
          descuento_volumen_10: number
          descuento_volumen_100: number
          descuento_volumen_50: number
          honorario_minimo: number
          id: string
          notas: string | null
          porcentaje_cif: number
          precio_guia_courier: number
          precio_tramite_formal: number
          recargo_almacenaje_dia: number
          recargo_fumigacion: number
          recargo_inspeccion: number
          recargo_permiso_especial: number
          updated_at: string
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          cliente_nombre: string
          cliente_ruc?: string | null
          corredor_id: string
          created_at?: string
          descuento_volumen_10?: number
          descuento_volumen_100?: number
          descuento_volumen_50?: number
          honorario_minimo?: number
          id?: string
          notas?: string | null
          porcentaje_cif?: number
          precio_guia_courier?: number
          precio_tramite_formal?: number
          recargo_almacenaje_dia?: number
          recargo_fumigacion?: number
          recargo_inspeccion?: number
          recargo_permiso_especial?: number
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          cliente_nombre?: string
          cliente_ruc?: string | null
          corredor_id?: string
          created_at?: string
          descuento_volumen_10?: number
          descuento_volumen_100?: number
          descuento_volumen_50?: number
          honorario_minimo?: number
          id?: string
          notas?: string | null
          porcentaje_cif?: number
          precio_guia_courier?: number
          precio_tramite_formal?: number
          recargo_almacenaje_dia?: number
          recargo_fumigacion?: number
          recargo_inspeccion?: number
          recargo_permiso_especial?: number
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: []
      }
      sys_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      tarifarios_corredor: {
        Row: {
          activo: boolean
          corredor_id: string
          created_at: string
          descripcion: string | null
          handling_por_paquete: number | null
          id: string
          nombre: string
          porcentaje_cif: number | null
          recargo_almacenaje_dia: number | null
          recargo_courier: number | null
          recargo_fumigacion: number | null
          recargo_inspeccion: number | null
          recargo_peligrosos: number | null
          recargo_perecederos: number | null
          tarifa_minima: number | null
          tarifa_plana: number | null
          tipo_formula: string
          updated_at: string
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          corredor_id: string
          created_at?: string
          descripcion?: string | null
          handling_por_paquete?: number | null
          id?: string
          nombre: string
          porcentaje_cif?: number | null
          recargo_almacenaje_dia?: number | null
          recargo_courier?: number | null
          recargo_fumigacion?: number | null
          recargo_inspeccion?: number | null
          recargo_peligrosos?: number | null
          recargo_perecederos?: number | null
          tarifa_minima?: number | null
          tarifa_plana?: number | null
          tipo_formula?: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          corredor_id?: string
          created_at?: string
          descripcion?: string | null
          handling_por_paquete?: number | null
          id?: string
          nombre?: string
          porcentaje_cif?: number | null
          recargo_almacenaje_dia?: number | null
          recargo_courier?: number | null
          recargo_fumigacion?: number | null
          recargo_inspeccion?: number | null
          recargo_peligrosos?: number | null
          recargo_perecederos?: number | null
          tarifa_minima?: number | null
          tarifa_plana?: number | null
          tipo_formula?: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifarios_corredor_corredor_id_fkey"
            columns: ["corredor_id"]
            isOneToOne: false
            referencedRelation: "corredores_acreditados"
            referencedColumns: ["id"]
          },
        ]
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
      validaciones_kyc: {
        Row: {
          aviso_operacion_numero: string | null
          aviso_operacion_verificado: boolean | null
          consignatario_id: string | null
          corredor_id: string
          created_at: string
          documento_coincide_firma: boolean | null
          documento_representante: string | null
          estado: string
          fecha_validacion: string | null
          id: string
          nombre_cliente: string
          notas: string | null
          poder_representacion_verificado: boolean | null
          ruc_activo: boolean | null
          ruc_cedula: string
          updated_at: string
          validacion_zod_hash: string | null
        }
        Insert: {
          aviso_operacion_numero?: string | null
          aviso_operacion_verificado?: boolean | null
          consignatario_id?: string | null
          corredor_id: string
          created_at?: string
          documento_coincide_firma?: boolean | null
          documento_representante?: string | null
          estado?: string
          fecha_validacion?: string | null
          id?: string
          nombre_cliente: string
          notas?: string | null
          poder_representacion_verificado?: boolean | null
          ruc_activo?: boolean | null
          ruc_cedula: string
          updated_at?: string
          validacion_zod_hash?: string | null
        }
        Update: {
          aviso_operacion_numero?: string | null
          aviso_operacion_verificado?: boolean | null
          consignatario_id?: string | null
          corredor_id?: string
          created_at?: string
          documento_coincide_firma?: boolean | null
          documento_representante?: string | null
          estado?: string
          fecha_validacion?: string | null
          id?: string
          nombre_cliente?: string
          notas?: string | null
          poder_representacion_verificado?: boolean | null
          ruc_activo?: boolean | null
          ruc_cedula?: string
          updated_at?: string
          validacion_zod_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validaciones_kyc_consignatario_id_fkey"
            columns: ["consignatario_id"]
            isOneToOne: false
            referencedRelation: "consignatarios_fiscales"
            referencedColumns: ["id"]
          },
        ]
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
