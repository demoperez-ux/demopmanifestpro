/**
 * VirtualizedTable — High-performance table using @tanstack/react-virtual
 * Renders only visible rows for 7000+ row datasets
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

export interface VirtualColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  getRowId?: (row: T) => string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 40,
  maxHeight = 600,
  className,
  onRowClick,
  emptyMessage = 'Sin datos disponibles',
  getRowId,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 15,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (data.length === 0) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground', className)}>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
        {columns.map(col => (
          <div
            key={col.key}
            className={cn(
              'px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            )}
            style={{ width: col.width || `${100 / columns.length}%`, minWidth: col.width }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual scrolling body */}
      <div
        ref={parentRef}
        className="overflow-auto scrollbar-thin"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map(virtualRow => {
            const row = data[virtualRow.index];
            const key = getRowId ? getRowId(row) : virtualRow.index;

            return (
              <div
                key={key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'absolute top-0 left-0 w-full flex items-center border-b border-border/50 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/30',
                  virtualRow.index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                )}
                style={{
                  height: `${rowHeight}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row, virtualRow.index)}
              >
                {columns.map(col => (
                  <div
                    key={col.key}
                    className={cn(
                      'px-3 text-xs text-foreground truncate flex-shrink-0',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                    style={{ width: col.width || `${100 / columns.length}%`, minWidth: col.width }}
                  >
                    {col.render(row, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground">
        <span>{data.length.toLocaleString()} registros totales</span>
        <span>Renderizando {virtualItems.length} filas visibles</span>
      </div>
    </div>
  );
}
