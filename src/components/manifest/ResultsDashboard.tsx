import { 
  Package, 
  DollarSign, 
  Layers, 
  Download, 
  FileDown,
  Pill,
  Leaf,
  Stethoscope,
  PawPrint,
  TrendingUp,
  Users
} from 'lucide-react';
import { ProcessingConfig, Consignee, ConsigneeStats, ConsolidatedDelivery } from '@/types/manifest';
import { ExtendedProcessingResult } from '@/lib/excelProcessor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadBatch, exportAllBatchesAsZip } from '@/lib/excelProcessor';
import { ConsigneeDashboard } from './ConsigneeDashboard';

interface ResultsDashboardProps {
  result: ExtendedProcessingResult;
  config: ProcessingConfig;
  onReset: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  medication: Pill,
  supplements: Leaf,
  medical: Stethoscope,
  veterinary: PawPrint,
  general: Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  medication: 'bg-red-100 text-red-700 border-red-200',
  supplements: 'bg-green-100 text-green-700 border-green-200',
  medical: 'bg-blue-100 text-blue-700 border-blue-200',
  veterinary: 'bg-purple-100 text-purple-700 border-purple-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function ResultsDashboard({ result, config, onReset }: ResultsDashboardProps) {
  const { summary, batches, consigneeMap, consigneeStats, consolidatedDeliveries } = result;

  const handleDownloadAll = async () => {
    await exportAllBatchesAsZip(batches);
  };

  const handleDownloadBatch = (batchIndex: number) => {
    downloadBatch(batches[batchIndex]);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total Registros</span>
          </div>
          <p className="stat-value">{summary.totalRows.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Lotes Generados</span>
          </div>
          <p className="stat-value">{summary.totalBatches}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Valor Total</span>
          </div>
          <p className="stat-value">${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Promedio/Item</span>
          </div>
          <p className="stat-value">
            ${(summary.totalValue / summary.totalRows).toFixed(2)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Consignatarios</span>
          </div>
          <p className="stat-value">{consigneeStats.totalConsignees.toLocaleString()}</p>
          <p className="text-xs text-success">
            {consigneeStats.consolidatableConsignees} consolidables
          </p>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="batches" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="batches" className="gap-2">
            <Layers className="w-4 h-4" />
            Lotes por Categoría
          </TabsTrigger>
          <TabsTrigger value="consignees" className="gap-2">
            <Users className="w-4 h-4" />
            Consignatarios
            {consigneeStats.consolidatableConsignees > 0 && (
              <Badge variant="secondary" className="ml-1 bg-success/20 text-success">
                {consigneeStats.consolidatableConsignees}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="space-y-6">

      {/* Distribution by Category */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Distribución por Categoría</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {config.categories.map(category => {
            const count = summary.byProductCategory[category.id] || 0;
            const percentage = summary.totalRows > 0 ? ((count / summary.totalRows) * 100).toFixed(1) : '0';
            const Icon = CATEGORY_ICONS[category.id] || Package;
            
            return (
              <div 
                key={category.id} 
                className={`p-4 rounded-lg border ${CATEGORY_COLORS[category.id] || CATEGORY_COLORS.general}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium truncate">{category.name}</span>
                </div>
                <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                <p className="text-xs opacity-70">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution by Value */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Distribución por Valor</h3>
        <div className="grid grid-cols-2 gap-4">
          {config.valueTresholds.map(threshold => {
            const count = summary.byValueCategory[threshold.id] || 0;
            const percentage = summary.totalRows > 0 ? ((count / summary.totalRows) * 100).toFixed(1) : '0';
            
            return (
              <div 
                key={threshold.id} 
                className="p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{threshold.name}</span>
                  <Badge variant="secondary">{percentage}%</Badge>
                </div>
                <p className="text-3xl font-bold text-foreground">{count.toLocaleString()}</p>
                <div className="mt-2 progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch List */}
      <div className="card-elevated">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Lotes Generados</h3>
          <Button onClick={handleDownloadAll} className="gap-2">
            <Download className="w-4 h-4" />
            Descargar Todo (ZIP)
          </Button>
        </div>
        
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin">
          {batches.map((batch, index) => {
            const category = config.categories.find(c => c.id === batch.productCategory);
            const Icon = CATEGORY_ICONS[batch.productCategory] || Package;
            
            return (
              <div 
                key={batch.id} 
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[batch.productCategory] || CATEGORY_COLORS.general}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{batch.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{batch.stats.totalRows.toLocaleString()} registros</span>
                      <span>•</span>
                      <span>${batch.stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadBatch(index)}
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Descargar
                </Button>
              </div>
            );
          })}
        </div>
        </div>
        </TabsContent>

        <TabsContent value="consignees">
          <ConsigneeDashboard 
            consigneeMap={consigneeMap}
            stats={consigneeStats}
            consolidatedDeliveries={consolidatedDeliveries}
          />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset} size="lg">
          Procesar Nuevo Archivo
        </Button>
      </div>
    </div>
  );
}
