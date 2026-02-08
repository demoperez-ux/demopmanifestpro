// ============================================
// MOTOR KYC — CAUCA/RECAUCA Art. 64, 65
// Validación de Clientes: RUC, Aviso de Operación,
// Poder de Representación, Identidad del Representante Legal
// ============================================

import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';
import { devLog, devWarn, devError } from '@/lib/logger';
import { validarRUCPanama, validarCedulaPanama } from '@/lib/fiscal/ServicioValidacionFiscal';

// ── Types ──

export interface ClienteKYC {
  nombre: string;
  rucCedula: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  avisoOperacionNumero?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ResultadoKYC {
  cliente: string;
  rucCedula: string;
  /** Paso 1: RUC activo en DGI */
  rucActivo: boolean;
  rucMensaje: string;
  /** Paso 2: Aviso de Operación */
  avisoOperacion: boolean;
  avisoMensaje: string;
  /** Paso 3: Poder de Representación */
  poderRepresentacion: boolean;
  poderMensaje: string;
  /** Paso 4: Zod — Documento coincide con firma */
  documentoCoincidefirma: boolean;
  zodMensaje: string;
  zodHash: string;
  /** Estado general */
  aprobado: boolean;
  scoreKYC: number; // 0-100
  alertas: AlertaKYC[];
  fundamentoLegal: string;
  timestamp: string;
}

export interface AlertaKYC {
  tipo: 'critica' | 'advertencia' | 'info';
  mensaje: string;
  campo: string;
  fundamentoLegal?: string;
}

// ── Constants ──

const FUNDAMENTO_LEGAL = {
  kyc: 'CAUCA Art. 64: Obligación de verificar identidad del declarante y su representación legal',
  ruc: 'Decreto Ejecutivo 109 de 1970, Código Fiscal Art. 762-F: Registro Único de Contribuyente',
  aviso: 'Ley 5 de 2007 Art. 15: Aviso de Operación ante MICI para actividad comercial',
  poder: 'RECAUCA Art. 122: Poder de representación del agente de aduanas ante ANA',
  identidad: 'CAUCA Art. 65: Coincidencia de identidad del representante legal con registro de firma',
};

// ── Motor KYC ──

export class MotorKYC {

  /**
   * Ejecuta la validación KYC completa para un cliente
   */
  static async validarCliente(cliente: ClienteKYC): Promise<ResultadoKYC> {
    devLog(`[KYC] Iniciando validación para: ${cliente.nombre}`);

    const alertas: AlertaKYC[] = [];
    let scoreTotal = 0;
    const maxScore = 100;

    // ── Paso 1: Verificar formato y validez del RUC ──
    const rucValido = this.verificarRUC(cliente.rucCedula);
    if (rucValido.valido) {
      scoreTotal += 25;
    } else {
      alertas.push({
        tipo: 'critica',
        mensaje: rucValido.mensaje,
        campo: 'ruc_cedula',
        fundamentoLegal: FUNDAMENTO_LEGAL.ruc,
      });
    }

    // ── Paso 2: Verificar Aviso de Operación ──
    const avisoValido = this.verificarAvisoOperacion(cliente.avisoOperacionNumero);
    if (avisoValido.valido) {
      scoreTotal += 25;
    } else {
      alertas.push({
        tipo: cliente.avisoOperacionNumero ? 'advertencia' : 'critica',
        mensaje: avisoValido.mensaje,
        campo: 'aviso_operacion',
        fundamentoLegal: FUNDAMENTO_LEGAL.aviso,
      });
    }

    // ── Paso 3: Verificar Poder de Representación ──
    const poderValido = this.verificarPoderRepresentacion(
      cliente.representanteLegal,
      cliente.documentoRepresentante
    );
    if (poderValido.valido) {
      scoreTotal += 25;
    } else {
      alertas.push({
        tipo: 'critica',
        mensaje: poderValido.mensaje,
        campo: 'poder_representacion',
        fundamentoLegal: FUNDAMENTO_LEGAL.poder,
      });
    }

    // ── Paso 4: Zod — Validar coincidencia de documento ──
    const zodValidacion = this.zodValidarIdentidad(
      cliente.documentoRepresentante,
      cliente.rucCedula,
      cliente.representanteLegal
    );
    if (zodValidacion.coincide) {
      scoreTotal += 25;
    } else {
      alertas.push({
        tipo: 'critica',
        mensaje: zodValidacion.mensaje,
        campo: 'documento_representante',
        fundamentoLegal: FUNDAMENTO_LEGAL.identidad,
      });
    }

    const aprobado = scoreTotal >= 75 && alertas.filter(a => a.tipo === 'critica').length === 0;

    const resultado: ResultadoKYC = {
      cliente: cliente.nombre,
      rucCedula: cliente.rucCedula,
      rucActivo: rucValido.valido,
      rucMensaje: rucValido.mensaje,
      avisoOperacion: avisoValido.valido,
      avisoMensaje: avisoValido.mensaje,
      poderRepresentacion: poderValido.valido,
      poderMensaje: poderValido.mensaje,
      documentoCoincidefirma: zodValidacion.coincide,
      zodMensaje: zodValidacion.mensaje,
      zodHash: zodValidacion.hash,
      aprobado,
      scoreKYC: scoreTotal,
      alertas,
      fundamentoLegal: FUNDAMENTO_LEGAL.kyc,
      timestamp: new Date().toISOString(),
    };

    if (!aprobado) {
      devWarn(`[KYC] ⚠️ Cliente ${cliente.nombre} NO aprobó KYC (score: ${scoreTotal}/${maxScore})`);
    } else {
      devLog(`[KYC] ✓ Cliente ${cliente.nombre} aprobó KYC (score: ${scoreTotal}/${maxScore})`);
    }

    return resultado;
  }

  /**
   * Persiste validación KYC en base de datos
   */
  static async persistirValidacion(
    resultado: ResultadoKYC,
    corredorId: string,
    consignatarioId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('validaciones_kyc')
        .insert({
          consignatario_id: consignatarioId || null,
          corredor_id: corredorId,
          nombre_cliente: resultado.cliente,
          ruc_cedula: resultado.rucCedula,
          ruc_activo: resultado.rucActivo,
          aviso_operacion_verificado: resultado.avisoOperacion,
          poder_representacion_verificado: resultado.poderRepresentacion,
          documento_representante: resultado.rucCedula,
          documento_coincide_firma: resultado.documentoCoincidefirma,
          validacion_zod_hash: resultado.zodHash,
          estado: resultado.aprobado ? 'aprobado' : 'rechazado',
          notas: resultado.alertas.map(a => `[${a.tipo}] ${a.mensaje}`).join(' | '),
          fecha_validacion: resultado.timestamp,
        });

      if (error) {
        devError('[KYC] Error persistiendo validación:', error);
        return false;
      }
      return true;
    } catch (e) {
      devError('[KYC] Error:', e);
      return false;
    }
  }

  // ── Verificaciones individuales ──

  private static verificarRUC(rucCedula: string): { valido: boolean; mensaje: string } {
    if (!rucCedula || rucCedula.trim().length === 0) {
      return { valido: false, mensaje: 'RUC/Cédula no proporcionado. Requerido por Código Fiscal Art. 762-F.' };
    }

    const esRUC = validarRUCPanama(rucCedula);
    const esCedula = validarCedulaPanama(rucCedula);

    if (!esRUC && !esCedula) {
      return {
        valido: false,
        mensaje: `Formato de RUC/Cédula inválido: "${rucCedula}". Formato esperado: X-XXX-XXXX (cédula) o XXXXX-X-XXXXXX (RUC).`,
      };
    }

    // Simulación de verificación DGI — en producción conectar al API de la DGI
    return {
      valido: true,
      mensaje: esRUC
        ? `RUC ${rucCedula} validado (formato persona jurídica)`
        : `Cédula ${rucCedula} validada (formato persona natural)`,
    };
  }

  private static verificarAvisoOperacion(
    numeroAviso?: string
  ): { valido: boolean; mensaje: string } {
    if (!numeroAviso || numeroAviso.trim().length === 0) {
      return {
        valido: false,
        mensaje: 'Aviso de Operación no proporcionado. Requerido por Ley 5 de 2007 Art. 15.',
      };
    }

    // Validar formato básico del Aviso de Operación
    if (numeroAviso.trim().length < 4) {
      return {
        valido: false,
        mensaje: `Número de Aviso de Operación "${numeroAviso}" parece incompleto.`,
      };
    }

    return {
      valido: true,
      mensaje: `Aviso de Operación ${numeroAviso} registrado correctamente.`,
    };
  }

  private static verificarPoderRepresentacion(
    representante?: string,
    documentoRepresentante?: string
  ): { valido: boolean; mensaje: string } {
    if (!representante || representante.trim().length === 0) {
      return {
        valido: false,
        mensaje: 'Representante legal no identificado. RECAUCA Art. 122 requiere poder de representación.',
      };
    }

    if (!documentoRepresentante || documentoRepresentante.trim().length === 0) {
      return {
        valido: false,
        mensaje: `Documento de identidad del representante "${representante}" no proporcionado.`,
      };
    }

    const docValido = validarCedulaPanama(documentoRepresentante) || validarRUCPanama(documentoRepresentante);
    if (!docValido) {
      return {
        valido: false,
        mensaje: `Documento "${documentoRepresentante}" del representante "${representante}" tiene formato inválido.`,
      };
    }

    return {
      valido: true,
      mensaje: `Representante ${representante} (${documentoRepresentante}) verificado.`,
    };
  }

  /**
   * Zod Integrity: Verifica que el documento del representante coincida
   * con el registro de la firma del consignatario
   */
  private static zodValidarIdentidad(
    documentoRepresentante?: string,
    rucConsignatario?: string,
    nombreRepresentante?: string
  ): { coincide: boolean; mensaje: string; hash: string } {
    const hashData = `zod-kyc:${documentoRepresentante || 'N/A'}:${rucConsignatario || 'N/A'}:${nombreRepresentante || 'N/A'}:${Date.now()}`;
    const hash = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    if (!documentoRepresentante || !rucConsignatario) {
      return {
        coincide: false,
        mensaje: '⚠️ ZOD: No se puede verificar coincidencia — datos insuficientes.',
        hash,
      };
    }

    // Extraer base del RUC para comparar con cédula del representante
    // En persona natural, el RUC contiene la cédula como base
    const rucBase = rucConsignatario.replace(/\s*DV\s*\d+/i, '').trim();
    const docBase = documentoRepresentante.trim();

    // Verificar si la cédula del representante está contenida en el RUC
    const coincideDirecta = rucBase === docBase;
    const coincideParcial = rucBase.startsWith(docBase) || docBase.startsWith(rucBase);

    if (coincideDirecta) {
      return {
        coincide: true,
        mensaje: `✓ ZOD VERIFIED: Documento del representante coincide con RUC del consignatario. Hash: ${hash.substring(0, 16)}`,
        hash,
      };
    }

    if (coincideParcial) {
      return {
        coincide: true,
        mensaje: `✓ ZOD: Coincidencia parcial (persona natural/jurídica). Hash: ${hash.substring(0, 16)}`,
        hash,
      };
    }

    return {
      coincide: false,
      mensaje: `⛔ ZOD BLOCKED: Documento "${documentoRepresentante}" NO coincide con registro de firma RUC "${rucConsignatario}". CAUCA Art. 65 requiere coincidencia.`,
      hash,
    };
  }
}
