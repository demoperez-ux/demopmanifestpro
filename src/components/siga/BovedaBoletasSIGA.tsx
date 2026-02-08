// ============================================
// BÓVEDA DE BOLETAS — LEXIS ARCHIVE
// Almacenamiento automático de boletas de pago
// generadas por el SIGA tras asignación de liquidación
// ============================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Archive, Download, FileText, CheckCircle2, Clock,
  AlertTriangle, FolderOpen, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BoletaArchivada {
  id: string;
  numeroLiquidacion: string;
  declaracionId: string;
  consignatario: string;
  fechaEmision: string;
  fechaVencimiento: string;
  totalPagar: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  archivadaEn: string;
  hashIntegridad: string;
}

function generarBoletasDemo(): BoletaArchivada[] {
  const consignatarios = [
    'Global Trade Corp S.A.',
    'Farma Plus International',
    'TechImport Panamá S.A.',
    'AgroInsumos del Istmo',
    'Pacific Medical Supplies',
  ];

  return Array.from({ length: 6 }, (_, i) => {
    const fechaEmision = new Date(Date.now() - i * 86400000 * 2);
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
    const estados: BoletaArchivada['estado'][] = ['pagada', 'pendiente', 'pendiente', 'pagada', 'vencida', 'pagada'];
    const total = Math.round(Math.random() * 5000 + 200);

    return {
      id: `BOL-${(Date.now() - i * 100000).toString(36).toUpperCase()}`,
      numeroLiquidacion: `LIQ-${new Date().getFullYear()}-${(100000 + i).toString()}`,
      declaracionId: `DEC-${(Date.now() - i * 200000).toString(36).toUpperCase().substring(0, 12)}`,
      consignatario: consignatarios[i % consignatarios.length],
      fechaEmision: fechaEmision.toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
      totalPagar: total,
      estado: estados[i],
      archivadaEn: `LEXIS Archive / DEC-${i + 1} / Boletas`,
      hashIntegridad: Math.random().toString(36).substring(2, 18),
    };
  });
}

const ESTADO_BOLETA: Record<BoletaArchivada['estado'], { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pendiente: { label: 'Pendiente', color: 'bg-warning-light text-warning', icon: Clock },
  pagada: { label: 'Pagada', color: 'bg-success-light text-success', icon: CheckCircle2 },
  vencida: { label: 'Vencida', color: 'bg-destructive-light text-destructive', icon: AlertTriangle },
};

export default function BovedaBoletasSIGA() {
  const [boletas, setBoletas] = useState<BoletaArchivada[]>([]);

  useEffect(() => {
    setBoletas(generarBoletasDemo());
  }, []);

  const handleDescargar = (boleta: BoletaArchivada) => {
    toast.success('Boleta Descargada', {
      description: `${boleta.numeroLiquidacion} — Archivada en ${boleta.archivadaEn}`,
      duration: 4000,
    });
  };

  const pendientes = boletas.filter(b => b.estado === 'pendiente').length;
  const totalPendiente = boletas.filter(b => b.estado === 'pendiente').reduce((s, b) => s + b.totalPagar, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Archivadas</p>
          <p className="text-xl font-bold">{boletas.length}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-warning">Pendientes de Pago</p>
          <p className="text-xl font-bold text-warning">{pendientes}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monto Pendiente</p>
          <p className="text-xl font-bold">${totalPendiente.toLocaleString()}</p>
        </Card>
      </div>

      {/* Boletas Table */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="w-4 h-4 text-primary" />
            Bóveda de Boletas de Pago — LEXIS Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N° Liquidación</TableHead>
                <TableHead className="text-xs">Consignatario</TableHead>
                <TableHead className="text-xs">Emisión</TableHead>
                <TableHead className="text-xs">Vencimiento</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs">Archivo</TableHead>
                <TableHead className="text-xs text-center">Zod</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boletas.map(boleta => {
                const config = ESTADO_BOLETA[boleta.estado];
                const Icon = config.icon;
                return (
                  <TableRow key={boleta.id}>
                    <TableCell className="font-mono text-xs text-primary">
                      {boleta.numeroLiquidacion}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">
                      {boleta.consignatario}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(boleta.fechaEmision).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(boleta.fechaVencimiento).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      ${boleta.totalPagar.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] gap-1', config.color)}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <FolderOpen className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{boleta.archivadaEn.split('/').pop()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Shield className="w-3.5 h-3.5 text-success mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-[10px]"
                        onClick={() => handleDescargar(boleta)}
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
