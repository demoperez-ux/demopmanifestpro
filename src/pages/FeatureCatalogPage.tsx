import { useState } from 'react';
import { 
  CheckCircle, Shield, Brain, Lock, Receipt, FileText, 
  Zap, Radio, Calculator, Eye, Fingerprint, Archive,
  ClipboardList, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { PLATFORM_INFO } from '@/lib/companyConfig';

// ─── Feature definitions ──────────────────────────────

interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'implemented' | 'active' | 'planned';
  legalBasis?: string;
  engine?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FeatureBlock {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: Feature[];
}

const BLOCKS: FeatureBlock[] = [
  {
    id: 'ingestion',
    title: '1. Motor de Ingesto y Validación',
    subtitle: 'LEXIS & ZOD',
    icon: Brain,
    color: 'hsl(var(--stella))',
    features: [
      {
        id: 'lexis-ocr',
        name: 'LEXIS AI-OCR',
        description: 'Extracción inteligente de datos desde PDFs de facturas comerciales, BLs y Cartas de Porte con mapeo automático a campos SQL. Soporta formatos Amazon, FedEx, UPS y documentos multi-página.',
        status: 'implemented',
        legalBasis: 'Resolución ANA 049-2025 · Decreto 41/2002 Art. 38',
        engine: 'LEXIS Intelligence Engine + Gemini Vision',
        icon: FileText,
      },
      {
        id: 'zod-forensic',
        name: 'ZOD Forensic Audit',
        description: 'Validador lógico de integridad que asegura la cuadratura matemática de cada declaración: CIF = FOB + Flete + Seguro. Detecta discrepancias en pesos, cantidades y valores declarados con tolerancia configurable.',
        status: 'implemented',
        legalBasis: 'Convenio de Kyoto Revisado · Cap. 9, Normas 9.5-9.7',
        engine: 'Zod Integrity Engine · SHA-256 Chain',
        icon: Shield,
      },
      {
        id: 'cross-check',
        name: 'Cross-Check Documental',
        description: 'Validación cruzada triangular entre manifiesto de carga (MAWB), facturas individuales (HAWB) y documento de transporte (BL/AWB/CPIC). Identifica paquetes huérfanos y discrepancias de valor.',
        status: 'implemented',
        legalBasis: 'Política "Cero Alucinaciones" · ANA Circular 2025-118',
        engine: 'Data Triangulation Pipeline',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'customs',
    title: '2. Gestión Aduanera y Transmisión',
    subtitle: 'SIGA · ANA · CrimsonLogic',
    icon: Radio,
    color: 'hsl(var(--zod))',
    features: [
      {
        id: 'siga-connector',
        name: 'Conector SIGA/CrimsonLogic',
        description: 'Protocolo de preparación y transmisión de datos estructurados para la ANA. Convierte JSON a XML-OMA, gestiona cola de transmisión con retry exponencial y Circuit Breaker (10s timeout, modo cola asíncrona).',
        status: 'implemented',
        legalBasis: 'Protocolo TradeNet/CrimsonLogic · OMA Data Model v3',
        engine: 'SIGA Gateway · Connector Core',
        icon: Radio,
      },
      {
        id: 'stella-tariff',
        name: 'Stella Tariff Advisor',
        description: 'Motor de sugerencia de clasificación arancelaria basado en el Arancel Nacional de Panamá 2026. Utiliza fuzzy matching, aprendizaje operativo y base de consultas clasificatorias validadas por la ANA.',
        status: 'implemented',
        legalBasis: 'Arancel Nacional de Panamá 2026 · Nomenclatura Arancelaria NAUCA',
        engine: 'Stella Knowledge Base + Clasificador Unificado',
        icon: Brain,
      },
      {
        id: 'liquidation',
        name: 'Generador de Declaraciones (Liquidación)',
        description: 'Cálculo automático de la cascada fiscal panameña: DAI sobre CIF, ISC sobre (CIF+DAI), ITBM 7% sobre (CIF+DAI+ISC), más Tasa SIGA B/.3.00. Genera escenarios de pago con recargos del 10% y 20%.',
        status: 'implemented',
        legalBasis: 'Modelo ANA 4 Categorías 2026 · Decreto de Gabinete 41/2002',
        engine: 'Calculadora Oficial ANA · Motor Liquidación SIGA',
        icon: Calculator,
      },
    ],
  },
  {
    id: 'security',
    title: '3. Seguridad Legal y Protección de Datos',
    subtitle: 'Vault · DLP · MFA',
    icon: Lock,
    color: 'hsl(var(--destructive))',
    features: [
      {
        id: 'vault-firma',
        name: 'Vault de Firma Electrónica',
        description: 'Almacenamiento seguro de certificados digitales SHA-256 para firma de documentos aduaneros. Incluye cláusula de responsabilidad técnica del corredor y sello de inexpugnabilidad criptográfico.',
        status: 'implemented',
        legalBasis: 'Ley 51/2008 de Firma Electrónica · Decreto 41/2002 Art. 23',
        engine: 'SistemaFirmaDigital · Web Crypto API',
        icon: Lock,
      },
      {
        id: 'anomaly-detection',
        name: 'Anomaly Detection (Anti-Exfiltration)',
        description: 'Stella monitoriza la velocidad de descarga de documentos en tiempo real. Si un usuario descarga más de 50 archivos en 60 segundos, se emite alerta crítica y se bloquea la sesión hasta re-autenticación.',
        status: 'implemented',
        legalBasis: 'Ley 81/2019 de Protección de Datos · BASC v6-2022',
        engine: 'AnomalyDetector · Stella AI Monitor',
        icon: Eye,
      },
      {
        id: 'mfa-gate',
        name: 'Biometric/MFA Gate',
        description: 'Re-autenticación obligatoria para acciones de alto riesgo: transmisión final a SIGA, borrado de registros, exportación masiva y modificación de firma digital. Protección DLP con watermarking dinámico.',
        status: 'implemented',
        legalBasis: 'NIST SP 800-63B · ISO 27001:2022 A.8.5',
        engine: 'MFA Setup · DLP Protected View',
        icon: Fingerprint,
      },
    ],
  },
  {
    id: 'operations',
    title: '4. Operativa y Finanzas',
    subtitle: 'Pagos · Archivo · Logs',
    icon: Receipt,
    color: 'hsl(var(--success))',
    features: [
      {
        id: 'payments',
        name: 'Gestión de Pagos y Boletas',
        description: 'Generación de boletas de pago de impuestos con cálculo de escenarios: puntual, recargo 10% (después de 5 días) y recargo 20% (después de 10 días). Pre-facturación con aprobación del cliente vía token seguro.',
        status: 'implemented',
        legalBasis: 'Resolución ANA 049-2025 · Código Fiscal de Panamá',
        engine: 'Motor PreFactura · Enterprise Billing',
        icon: Receipt,
      },
      {
        id: 'archive',
        name: 'Archivo Digital Inmutable',
        description: 'Almacenamiento de expedientes aduaneros con retención legal de 60 meses (5 años). Paquetes de archivo firmados digitalmente con cadena SHA-256 encadenada para garantizar inmutabilidad.',
        status: 'implemented',
        legalBasis: 'Convenio de Kyoto Rev. Cap. 9 · Resolución ANA 2025-003',
        engine: 'AuditVault · Bóveda Documental',
        icon: Archive,
      },
      {
        id: 'forensic-logs',
        name: 'Logs de Auditoría Forense',
        description: 'Registro detallado de cada operación: quién modificó un valor, cuándo, desde qué IP y con qué justificación. Hashes encadenados SHA-256 garantizan que ningún registro puede ser alterado retroactivamente.',
        status: 'implemented',
        legalBasis: 'BASC v6-2022 · ISO 27001:2022 A.8.15 · Ley 81/2019',
        engine: 'GestorAuditoria · sys_audit_logs',
        icon: ClipboardList,
      },
    ],
  },
];

// ─── Status helpers ───────────────────────────────────

const STATUS_CONFIG = {
  implemented: { label: '✓ Implementado', className: 'bg-success/15 text-success border-success/30' },
  active: { label: '● Activo', className: 'bg-primary/15 text-primary border-primary/30' },
  planned: { label: '○ Planificado', className: 'bg-muted text-muted-foreground border-border' },
};

// ─── Component ────────────────────────────────────────

export default function FeatureCatalogPage() {
  const totalFeatures = BLOCKS.reduce((sum, b) => sum + b.features.length, 0);
  const implementedCount = BLOCKS.reduce(
    (sum, b) => sum + b.features.filter(f => f.status === 'implemented').length, 0
  );
  const complianceScore = Math.round((implementedCount / totalFeatures) * 100);

  const handleExport = () => {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      `  ZENITH v${PLATFORM_INFO.version} — CATÁLOGO DE FUNCIONALIDADES`,
      '  Compliance Checklist Técnico para Inversionistas / ANA',
      `  Generado: ${new Date().toISOString()}`,
      `  Score de Cumplimiento: ${complianceScore}% (${implementedCount}/${totalFeatures} features)`,
      '═══════════════════════════════════════════════════════════',
      '',
    ];

    BLOCKS.forEach(block => {
      lines.push(`━━━ ${block.title} (${block.subtitle}) ━━━`);
      block.features.forEach(f => {
        const st = STATUS_CONFIG[f.status];
        lines.push(`  ${st.label}  ${f.name}`);
        lines.push(`    ${f.description}`);
        if (f.legalBasis) lines.push(`    📜 Base Legal: ${f.legalBasis}`);
        if (f.engine) lines.push(`    ⚙️ Motor: ${f.engine}`);
        lines.push('');
      });
    });

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('  Documento generado automáticamente por ZENITH.');
    lines.push('  Este catálogo NO constituye asesoría legal.');
    lines.push('═══════════════════════════════════════════════════════════');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZENITH_Feature_Catalog_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Catálogo de Funcionalidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compliance Checklist Técnico — ZENITH v{PLATFORM_INFO.version}
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 self-start">
          <Download className="w-4 h-4" />
          Exportar Catálogo
        </Button>
      </div>

      {/* Score Card */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Índice de Cumplimiento Técnico</span>
                <span className="text-2xl font-bold text-primary">{complianceScore}%</span>
              </div>
              <Progress value={complianceScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {implementedCount} de {totalFeatures} funcionalidades implementadas y verificadas
              </p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-16" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = BLOCKS.reduce(
                  (s, b) => s + b.features.filter(f => f.status === key).length, 0
                );
                return (
                  <div key={key}>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Blocks */}
      {BLOCKS.map(block => {
        const BlockIcon = block.icon;
        return (
          <div key={block.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: block.color + '20', color: block.color }}
              >
                <BlockIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{block.title}</h2>
                <p className="text-xs text-muted-foreground">{block.subtitle}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {block.features.map(feature => {
                const FeatureIcon = feature.icon;
                const st = STATUS_CONFIG[feature.status];
                return (
                  <Card key={feature.id} className="border-border/60">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <FeatureIcon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <CardTitle className="text-sm">{feature.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${st.className}`}>
                          {st.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                      {feature.legalBasis && (
                        <div className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-muted-foreground/60 flex-shrink-0">📜</span>
                          <span className="text-muted-foreground font-medium">{feature.legalBasis}</span>
                        </div>
                      )}
                      {feature.engine && (
                        <div className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-muted-foreground/60 flex-shrink-0">⚙️</span>
                          <span className="font-mono text-muted-foreground/80">{feature.engine}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer disclaimer */}
      <div className="text-center py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50">
          ZENITH v{PLATFORM_INFO.version} · Este catálogo es un documento técnico interno y no constituye asesoría legal.
        </p>
      </div>
    </div>
  );
}
