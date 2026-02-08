import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularLiquidacionOficial, type ComponentesLiquidacion } from '@/lib/liquidacion/calculadoraOficial';

export interface AcuerdoComercial {
  id: string;
  codigo_arancelario: string;
  pais_origen: string;
  tratado_nombre: string;
  tratado_codigo: string;
  arancel_preferencial: number;
  arancel_general: number;
  requisitos_origen: string | null;
  activo: boolean;
}

export interface EstrategiaFiscal {
  acuerdo: AcuerdoComercial;
  liquidacionPreferencial: ComponentesLiquidacion;
  liquidacionGeneral: ComponentesLiquidacion;
  ahorroDai: number;
  ahorroTotal: number;
  porcentajeAhorro: number;
}

export function useTradeAdvisor() {
  const [estrategias, setEstrategias] = useState<EstrategiaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const buscarEstrategias = useCallback(async (
    codigoArancelario: string,
    paisOrigen: string,
    fob: number,
    flete: number,
    seguro: number,
    daiActual: number,
    iscPercent: number,
    itbmPercent: number
  ) => {
    setLoading(true);
    setBuscado(true);

    try {
      // Search by first 4 digits (partida) of the HS code
      const partida = codigoArancelario.replace(/\D/g, '').substring(0, 4);

      const { data, error } = await supabase
        .from('acuerdos_comerciales')
        .select('*')
        .eq('activo', true)
        .like('codigo_arancelario', `${partida}%`);

      if (error) throw error;

      if (!data || data.length === 0) {
        setEstrategias([]);
        return;
      }

      // Optionally filter by country if provided
      let acuerdos = data as AcuerdoComercial[];
      if (paisOrigen) {
        const filtrados = acuerdos.filter(a =>
          a.pais_origen.toLowerCase() === paisOrigen.toLowerCase()
        );
        // If we found matches for this country, prioritize them. Otherwise show all.
        if (filtrados.length > 0) {
          acuerdos = filtrados;
        }
      }

      // Calculate savings for each agreement
      const estrategiasCalculadas: EstrategiaFiscal[] = acuerdos
        .filter(a => a.arancel_preferencial < daiActual)
        .map(acuerdo => {
          const liquidacionGeneral = calcularLiquidacionOficial(fob, flete, seguro, {
            daiPercent: daiActual,
            iscPercent,
            itbmPercent,
            incluirTasaSistema: true,
          });

          const liquidacionPreferencial = calcularLiquidacionOficial(fob, flete, seguro, {
            daiPercent: acuerdo.arancel_preferencial,
            iscPercent,
            itbmPercent,
            incluirTasaSistema: true,
          });

          const ahorroDai = liquidacionGeneral.montoDAI - liquidacionPreferencial.montoDAI;
          const ahorroTotal = liquidacionGeneral.totalAPagar - liquidacionPreferencial.totalAPagar;
          const porcentajeAhorro = liquidacionGeneral.totalAPagar > 0
            ? (ahorroTotal / liquidacionGeneral.totalAPagar) * 100
            : 0;

          return {
            acuerdo,
            liquidacionPreferencial,
            liquidacionGeneral,
            ahorroDai,
            ahorroTotal,
            porcentajeAhorro,
          };
        })
        .sort((a, b) => b.ahorroTotal - a.ahorroTotal);

      setEstrategias(estrategiasCalculadas);
    } catch (err) {
      console.error('Error buscando estrategias TLC:', err);
      setEstrategias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setEstrategias([]);
    setBuscado(false);
  }, []);

  return { estrategias, loading, buscado, buscarEstrategias, limpiar };
}
