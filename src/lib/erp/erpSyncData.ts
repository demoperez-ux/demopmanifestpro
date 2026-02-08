/**
 * ERP SYNC DATA — Demo data generator for ERP Sync History
 */

export interface ERPSyncLogEntry {
  id: string;
  timestamp: Date;
  batchRef: string;
  profile: string;
  status: 'success' | 'pending' | 'error';
  latencyMs: number;
  format: 'csv' | 'json' | 'xml';
  zodNote: string;
  zodHash: string;
  stellaAlert: boolean;
  stellaAlertMessage?: string;
  payloadSent: Record<string, unknown>;
  externalResponse: Record<string, unknown>;
}

const PROFILES = [
  'Standard Gateway',
  'Strategic Logistics Ally',
  'E-commerce Fulfillment Node',
  'Express Regional Operator',
];

const FORMATS: ERPSyncLogEntry['format'][] = ['csv', 'json', 'xml'];

const STELLA_ALERTS = [
  'Detectado paquete con valor declarado inferior al umbral SIGA. Verificar antes del próximo envío.',
  'Lote contiene ítems que requieren permiso MINSA. Se adjuntó nota al payload.',
  'Consignatario con historial de discrepancias en valoración aduanera.',
  'Código HTS sugerido difiere del clasificado automáticamente. Requiere revisión del Idóneo.',
  'Volumen de este lote excede el promedio mensual en un 40%. Posible alerta OEA.',
];

const ERROR_MESSAGES = [
  'ECONNREFUSED: Connection refused at endpoint /api/v2/shipments',
  'HTTP 401 Unauthorized: Invalid API token for external ERP',
  'TIMEOUT: No response within 30000ms from logistics gateway',
  'HTTP 503 Service Unavailable: External system maintenance window',
];

function randomHash(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomBatchRef(index: number): string {
  const prefixes = ['SYNC', 'BATCH', 'TX', 'ERP'];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix}-${(2026000 + index).toString()}-${randomHash().slice(0, 4).toUpperCase()}`;
}

export function generateDemoLogs(count: number): ERPSyncLogEntry[] {
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const rand = Math.random();
    const status: ERPSyncLogEntry['status'] =
      rand < 0.7 ? 'success' : rand < 0.85 ? 'pending' : 'error';

    const hasStellaAlert = Math.random() > 0.75;
    const profile = PROFILES[i % PROFILES.length];
    const fmt = FORMATS[i % FORMATS.length];

    const latencyMs =
      status === 'error'
        ? Math.floor(2000 + Math.random() * 28000)
        : status === 'pending'
          ? Math.floor(500 + Math.random() * 1500)
          : Math.floor(80 + Math.random() * 600);

    const payloadSent = {
      batch_id: randomBatchRef(i),
      profile_code: profile.replace(/\s/g, '_').toLowerCase(),
      total_items: Math.floor(10 + Math.random() * 990),
      total_value_usd: Math.round((500 + Math.random() * 50000) * 100) / 100,
      format: fmt,
      standard: 'EDIFACT/XML-OMA',
      zod_integrity_hash: `sha256:${randomHash()}${randomHash()}`,
      timestamp_utc: new Date(now - i * 3600000 * 0.7).toISOString(),
      manifest_ref: `MAWB-618-${(10000000 + Math.floor(Math.random() * 9000000)).toString()}`,
      consignee_count: Math.floor(1 + Math.random() * 25),
    };

    const externalResponse =
      status === 'success'
        ? {
            status: 200,
            message: 'Payload received and queued for processing',
            transaction_id: `EXT-${randomHash().toUpperCase()}`,
            ack_timestamp: new Date(now - i * 3600000 * 0.7 + latencyMs).toISOString(),
            items_accepted: payloadSent.total_items,
            items_rejected: 0,
            next_sync_window: '2026-02-09T06:00:00Z',
          }
        : status === 'pending'
          ? {
              status: 202,
              message: 'Accepted, processing in background queue',
              queue_position: Math.floor(1 + Math.random() * 15),
              estimated_completion: '~5 minutes',
            }
          : {
              status: status === 'error' ? 500 : 200,
              error: ERROR_MESSAGES[i % ERROR_MESSAGES.length],
              retry_after_seconds: 60,
              support_reference: `SUP-${randomHash().slice(0, 8).toUpperCase()}`,
            };

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(now - i * 3600000 * 0.7),
      batchRef: randomBatchRef(i),
      profile,
      status,
      latencyMs,
      format: fmt,
      zodNote: 'Integridad verificada antes del envío: OK',
      zodHash: `sha256:${randomHash()}${randomHash()}`,
      stellaAlert: hasStellaAlert,
      stellaAlertMessage: hasStellaAlert
        ? STELLA_ALERTS[Math.floor(Math.random() * STELLA_ALERTS.length)]
        : undefined,
      payloadSent,
      externalResponse,
    };
  });
}
