// ============================================
// REGISTRO DE CORREDORES ACREDITADOS
// Gestión de licencias ANA, fianzas y firma digital
// ============================================

export interface CorredorAcreditado {
  id: string;
  user_id: string;
  nombre_completo: string;
  cedula: string;
  licencia_ana: string;
  licencia_vencimiento: string;
  tipo_fianza: 'bancaria' | 'seguro' | 'garantia_real';
  monto_fianza: number;
  estado_fianza: 'vigente' | 'vencida' | 'en_tramite' | 'suspendida';
  fianza_vencimiento?: string;
  firma_digital_habilitada: boolean;
  firma_clave_publica?: string;
  telefono?: string;
  email?: string;
  empresa?: string;
  estado: 'activo' | 'suspendido' | 'inactivo' | 'vencido';
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertaLicencia {
  tipo: 'vencimiento_proximo' | 'vencida' | 'fianza_vencida' | 'firma_no_habilitada';
  titulo: string;
  descripcion: string;
  diasRestantes?: number;
  corredorId: string;
  corredorNombre: string;
  severidad: 'info' | 'advertencia' | 'critico';
}

/**
 * Stella verifica licencias y genera alertas proactivas
 * Notifica al dueño del sistema si una licencia está a 15 días de expirar
 */
export function verificarEstadoLicencia(corredor: CorredorAcreditado): AlertaLicencia[] {
  const alertas: AlertaLicencia[] = [];
  const ahora = new Date();
  const vencimiento = new Date(corredor.licencia_vencimiento);
  const diasRestantes = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    alertas.push({
      tipo: 'vencida',
      titulo: '🚨 Licencia ANA Vencida',
      descripcion: `La licencia ${corredor.licencia_ana} del corredor ${corredor.nombre_completo} venció hace ${Math.abs(diasRestantes)} días. Se prohíbe toda firma digital hasta renovación.`,
      diasRestantes,
      corredorId: corredor.id,
      corredorNombre: corredor.nombre_completo,
      severidad: 'critico',
    });
  } else if (diasRestantes <= 15) {
    alertas.push({
      tipo: 'vencimiento_proximo',
      titulo: '⚠️ Licencia ANA Próxima a Vencer',
      descripcion: `Stella informa: La licencia ${corredor.licencia_ana} de ${corredor.nombre_completo} vence en ${diasRestantes} días. Inicie trámite de renovación ante la ANA.`,
      diasRestantes,
      corredorId: corredor.id,
      corredorNombre: corredor.nombre_completo,
      severidad: diasRestantes <= 5 ? 'critico' : 'advertencia',
    });
  }

  if (corredor.fianza_vencimiento) {
    const vencimientoFianza = new Date(corredor.fianza_vencimiento);
    const diasFianza = Math.ceil((vencimientoFianza.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
    if (diasFianza <= 15) {
      alertas.push({
        tipo: 'fianza_vencida',
        titulo: diasFianza < 0 ? '🚨 Fianza Vencida' : '⚠️ Fianza Próxima a Vencer',
        descripcion: diasFianza < 0
          ? `La fianza de ${corredor.nombre_completo} venció hace ${Math.abs(diasFianza)} días. Art. 35 Decreto 41/2002.`
          : `La fianza de ${corredor.nombre_completo} vence en ${diasFianza} días. Renueve con anticipación.`,
        diasRestantes: diasFianza,
        corredorId: corredor.id,
        corredorNombre: corredor.nombre_completo,
        severidad: diasFianza <= 0 ? 'critico' : 'advertencia',
      });
    }
  }

  if (!corredor.firma_digital_habilitada) {
    alertas.push({
      tipo: 'firma_no_habilitada',
      titulo: '🔒 Firma Digital No Habilitada',
      descripcion: `El corredor ${corredor.nombre_completo} no tiene firma digital habilitada. No podrá firmar ni transmitir declaraciones a la ANA.`,
      corredorId: corredor.id,
      corredorNombre: corredor.nombre_completo,
      severidad: 'advertencia',
    });
  }

  return alertas;
}

/**
 * Valida si un corredor puede firmar (licencia vigente + firma habilitada)
 */
export function puedeCorredorFirmar(corredor: CorredorAcreditado): {
  puede: boolean;
  motivo?: string;
} {
  const ahora = new Date();
  const vencimiento = new Date(corredor.licencia_vencimiento);

  if (corredor.estado !== 'activo') {
    return { puede: false, motivo: `Corredor con estado "${corredor.estado}". Solo corredores activos pueden firmar.` };
  }

  if (vencimiento < ahora) {
    return { puede: false, motivo: 'Licencia ANA vencida. Renueve su licencia antes de firmar.' };
  }

  if (!corredor.firma_digital_habilitada) {
    return { puede: false, motivo: 'Firma digital no habilitada. Configure su certificado digital.' };
  }

  if (corredor.estado_fianza !== 'vigente') {
    return { puede: false, motivo: `Fianza con estado "${corredor.estado_fianza}". Requiere fianza vigente para firmar.` };
  }

  return { puede: true };
}

/**
 * Genera datos de corredor mock para demo
 */
export function generarCorredorDemo(): CorredorAcreditado {
  const vencimiento = new Date();
  vencimiento.setDate(vencimiento.getDate() + 120);

  return {
    id: 'corr-demo-001',
    user_id: 'user-demo-001',
    nombre_completo: 'Lic. Roberto Pérez Mendoza',
    cedula: '8-234-567',
    licencia_ana: 'CA-2024-0892',
    licencia_vencimiento: vencimiento.toISOString(),
    tipo_fianza: 'bancaria',
    monto_fianza: 50000,
    estado_fianza: 'vigente',
    fianza_vencimiento: vencimiento.toISOString(),
    firma_digital_habilitada: true,
    firma_clave_publica: 'RSA-2048-DEMO',
    telefono: '+507 6789-0123',
    email: 'rperez@aduanas.pa',
    empresa: 'Aduanas Pacífico S.A.',
    estado: 'activo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
