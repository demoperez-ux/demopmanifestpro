/**
 * ORPHAN MATCHER — ZENITH Stella Intelligence
 * 
 * Motor de asociación inteligente para documentos huérfanos.
 * 1. Stella Matching: busca coincidencias (cliente, valor, referencia) con trámites activos.
 * 2. Zod Veto: valida consistencia al asociar (RUC, factura, peso).
 */

import {
  type ResultadoSniffer,
  type ExpedienteExterno,
} from './DocumentSniffer';

// ─── Tipos ──────────────────────────────────────────────────────

export interface DocumentoHuerfano {
  id: string;
  resultado: ResultadoSniffer;
  sugerencias: SugerenciaAsociacion[];
  fechaIngreso: string;
}

export interface SugerenciaAsociacion {
  expedienteId: string;
  referencia: string;
  importador: string;
  confianzaAsociacion: number;
  razones: string[];
}

export interface ResultadoAsociacion {
  exito: boolean;
  mensaje: string;
  tipo: 'aprobado' | 'rechazado';
  detalles: string[];
  documentoDevuelto: boolean;
}

// ─── Stella Matching ────────────────────────────────────────────

export class OrphanMatcher {
  /**
   * Busca coincidencias entre un documento huérfano y los expedientes activos.
   * Retorna sugerencias ordenadas por confianza de asociación.
   */
  static buscarSugerencias(
    documento: ResultadoSniffer,
    expedientes: ExpedienteExterno[]
  ): SugerenciaAsociacion[] {
    if (expedientes.length === 0) return [];

    const sugerencias: SugerenciaAsociacion[] = [];

    for (const exp of expedientes) {
      const razones: string[] = [];
      let score = 0;

      // 1. Coincidencia de importador/consignatario
      if (documento.metadatos.importador && exp.importador) {
        const docImport = documento.metadatos.importador.toLowerCase().trim();
        const expImport = exp.importador.toLowerCase().trim();
        if (docImport === expImport) {
          score += 40;
          razones.push('Importador coincide exactamente');
        } else if (docImport.includes(expImport) || expImport.includes(docImport)) {
          score += 30;
          razones.push('Importador parcialmente coincidente');
        } else if (this.similaridad(docImport, expImport) > 0.6) {
          score += 20;
          razones.push('Importador con alta similitud textual');
        }
      }

      // 2. Coincidencia de exportador/shipper
      if (documento.metadatos.exportador) {
        const docExport = documento.metadatos.exportador.toLowerCase().trim();
        for (const docExp of exp.documentos) {
          if (docExp.metadatos.exportador) {
            const expExport = docExp.metadatos.exportador.toLowerCase().trim();
            if (docExport === expExport || docExport.includes(expExport) || expExport.includes(docExport)) {
              score += 25;
              razones.push('Exportador coincide con otro documento del trámite');
              break;
            }
          }
        }
      }

      // 3. Coincidencia de HS Code
      if (documento.metadatos.hsCodePreliminar && exp.hsCodePreliminar) {
        const docHS = documento.metadatos.hsCodePreliminar.replace(/\D/g, '');
        const expHS = exp.hsCodePreliminar.replace(/\D/g, '');
        if (docHS.substring(0, 6) === expHS.substring(0, 6)) {
          score += 20;
          razones.push('Partida arancelaria coincidente (6 dígitos)');
        } else if (docHS.substring(0, 4) === expHS.substring(0, 4)) {
          score += 10;
          razones.push('Capítulo arancelario coincidente (4 dígitos)');
        }
      }

      // 4. Coincidencia de número de referencia
      if (documento.metadatos.numeroDocumento) {
        const docRef = documento.metadatos.numeroDocumento.toLowerCase();
        if (exp.referencia.toLowerCase().includes(docRef) || docRef.includes(exp.referencia.toLowerCase())) {
          score += 35;
          razones.push('Referencia del documento coincide con el expediente');
        }
      }

      // 5. País de origen coincidente
      if (documento.metadatos.paisOrigen) {
        const docPais = documento.metadatos.paisOrigen.toLowerCase();
        for (const docExp of exp.documentos) {
          if (docExp.metadatos.paisOrigen?.toLowerCase() === docPais) {
            score += 10;
            razones.push('País de origen coincidente');
            break;
          }
        }
      }

      if (score > 0) {
        sugerencias.push({
          expedienteId: exp.id,
          referencia: exp.referencia,
          importador: exp.importador,
          confianzaAsociacion: Math.min(100, score),
          razones,
        });
      }
    }

    return sugerencias.sort((a, b) => b.confianzaAsociacion - a.confianzaAsociacion);
  }

  /**
   * ZOD VETO — Valida la asociación de un documento a un expediente.
   * Verifica consistencia de datos antes de confirmar la vinculación.
   */
  static validarAsociacion(
    documento: ResultadoSniffer,
    expediente: ExpedienteExterno
  ): ResultadoAsociacion {
    const detalles: string[] = [];
    let erroresCriticos = 0;

    // 1. Validar coincidencia de importador/consignatario
    if (documento.metadatos.importador && expediente.importador) {
      const docImport = documento.metadatos.importador.toLowerCase().trim();
      const expImport = expediente.importador.toLowerCase().trim();
      if (docImport !== expImport &&
          !docImport.includes(expImport) &&
          !expImport.includes(docImport) &&
          this.similaridad(docImport, expImport) < 0.5) {
        erroresCriticos++;
        detalles.push(
          `❌ Importador del documento ("${documento.metadatos.importador}") no coincide con el expediente ("${expediente.importador}").`
        );
      } else {
        detalles.push('✅ Importador/Consignatario verificado.');
      }
    }

    // 2. Validar coherencia del tipo de documento con necesidades
    const tiposEnExpediente = new Set(expediente.documentos.map(d => d.tipoDetectado));
    if (tiposEnExpediente.has(documento.tipoDetectado) && documento.tipoDetectado !== 'desconocido') {
      detalles.push(
        `⚠️ Ya existe un documento del tipo "${documento.tipoDetectado}" en este expediente. Se permitirá como documento adicional.`
      );
    } else {
      detalles.push(`✅ Tipo de documento "${documento.tipoDetectado}" es requerido en este expediente.`);
    }

    // 3. Validar consistencia de factura con datos del expediente
    if (documento.tipoDetectado === 'factura_comercial') {
      // Verificar que el exportador/shipper coincida con algún documento existente
      const shippersExistentes = expediente.documentos
        .map(d => d.metadatos.exportador?.toLowerCase().trim())
        .filter(Boolean);

      if (documento.metadatos.exportador && shippersExistentes.length > 0) {
        const docExport = documento.metadatos.exportador.toLowerCase().trim();
        const coincide = shippersExistentes.some(s =>
          s === docExport || s!.includes(docExport) || docExport.includes(s!)
        );
        if (!coincide) {
          erroresCriticos++;
          detalles.push(
            `❌ El exportador de la factura ("${documento.metadatos.exportador}") no coincide con los documentos del expediente.`
          );
        } else {
          detalles.push('✅ Exportador de factura coincide con shipper del B/L.');
        }
      }
    }

    // 4. Validar consistencia de peso (si hay BL en el expediente y el doc es factura)
    if (documento.metadatos.pesoDeclarado) {
      const blExistente = expediente.documentos.find(d => d.tipoDetectado === 'bill_of_lading');
      if (blExistente?.metadatos.pesoDeclarado) {
        const diff = Math.abs(documento.metadatos.pesoDeclarado - blExistente.metadatos.pesoDeclarado);
        const tolerance = blExistente.metadatos.pesoDeclarado * 0.10; // 10% tolerance
        if (diff > tolerance) {
          detalles.push(
            `⚠️ Diferencia de peso: Documento ${documento.metadatos.pesoDeclarado} kg vs B/L ${blExistente.metadatos.pesoDeclarado} kg (${((diff / blExistente.metadatos.pesoDeclarado) * 100).toFixed(1)}% desviación).`
          );
        } else {
          detalles.push('✅ Peso declarado dentro de tolerancia con B/L existente.');
        }
      }
    }

    // Dictamen final
    if (erroresCriticos > 0) {
      return {
        exito: false,
        mensaje: `Veredicto de Zod: RECHAZADO — ${erroresCriticos} discrepancia(s) crítica(s). Documento devuelto a la Gaveta.`,
        tipo: 'rechazado',
        detalles,
        documentoDevuelto: true,
      };
    }

    return {
      exito: true,
      mensaje: 'Veredicto de Zod: Documento vinculado. Integridad confirmada.',
      tipo: 'aprobado',
      detalles,
      documentoDevuelto: false,
    };
  }

  /**
   * Calcula similitud de Sørensen–Dice entre dos cadenas (bigrams).
   */
  private static similaridad(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigramsA = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));

    const bigramsB = new Set<string>();
    for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.substring(i, i + 2));

    let intersection = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) intersection++;
    }

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
  }
}
