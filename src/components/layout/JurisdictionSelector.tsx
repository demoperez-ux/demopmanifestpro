/**
 * Jurisdiction Selector — Regional context switch for ZENITH
 * Controls which country's tax rules, fiscal IDs, and legal references are active.
 */

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { zodEngine, stellaEngine } from '@/lib/engines';
import type { ZodRegion } from '@/lib/engines';
import { cn } from '@/lib/utils';

const JURISDICTIONS: { code: ZodRegion; label: string; flag: string; authority: string }[] = [
  { code: 'PA', label: 'Panamá', flag: '🇵🇦', authority: 'ANA' },
  { code: 'CR', label: 'Costa Rica', flag: '🇨🇷', authority: 'DGA' },
  { code: 'GT', label: 'Guatemala', flag: '🇬🇹', authority: 'SAT' },
];

interface JurisdictionSelectorProps {
  collapsed?: boolean;
}

export function JurisdictionSelector({ collapsed = false }: JurisdictionSelectorProps) {
  const [current, setCurrent] = useState<ZodRegion>(() => {
    const stored = localStorage.getItem('zenith-jurisdiction') as ZodRegion;
    return stored && ['PA', 'CR', 'GT'].includes(stored) ? stored : 'PA';
  });

  useEffect(() => {
    zodEngine.setRegion(current);
    stellaEngine.setJurisdiction(current);
    localStorage.setItem('zenith-jurisdiction', current);
  }, [current]);

  const active = JURISDICTIONS.find(j => j.code === current)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 text-[11px]',
            collapsed ? 'w-full justify-center px-0' : 'w-full justify-start px-2'
          )}
        >
          <span className="text-sm">{active.flag}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{active.code}</span>
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 font-mono border-sidebar-border text-sidebar-foreground/40">
                {active.authority}
              </Badge>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-52">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Jurisdicción Activa
        </div>
        {JURISDICTIONS.map((j) => (
          <DropdownMenuItem
            key={j.code}
            onClick={() => setCurrent(j.code)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              current === j.code && 'bg-accent'
            )}
          >
            <span className="text-base">{j.flag}</span>
            <div className="flex-1">
              <p className="text-xs font-medium">{j.label}</p>
              <p className="text-[10px] text-muted-foreground">{j.authority}</p>
            </div>
            {current === j.code && (
              <Badge className="text-[8px] px-1 h-3.5 bg-primary/15 text-primary border-0">
                Activa
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
