// ============================================
// MÓDULO DE FIRMA ELECTRÓNICA CALIFICADA
// Interfaz para cargar certificados .p12 / .pfx
// ============================================

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield, Upload, KeyRound, CheckCircle2, AlertTriangle,
  Lock, FileKey2, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificadoInfo {
  nombre: string;
  emitidoPor: string;
  titular: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  serial: string;
  estado: 'vigente' | 'expirado' | 'no_cargado';
}

export default function FirmaElectronicaPanel() {
  const [certificado, setCertificado] = useState<CertificadoInfo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.p12') && !ext.endsWith('.pfx')) {
      return;
    }
    setArchivoNombre(file.name);
  };

  const handleCargarCertificado = () => {
    if (!archivoNombre || !password) return;
    setCargando(true);

    // Simulate certificate loading
    setTimeout(() => {
      const ahora = new Date();
      const vigenciaHasta = new Date(ahora);
      vigenciaHasta.setFullYear(vigenciaHasta.getFullYear() + 2);

      setCertificado({
        nombre: archivoNombre,
        emitidoPor: 'Autoridad Certificadora de Panamá (ACP)',
        titular: 'Corredor Aduanal Autorizado',
        vigenciaDesde: ahora.toISOString().split('T')[0],
        vigenciaHasta: vigenciaHasta.toISOString().split('T')[0],
        serial: `SN-${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
        estado: 'vigente',
      });
      setCargando(false);
      setPassword('');
    }, 1500);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileKey2 className="w-4 h-4 text-primary" />
          Firma Electrónica Calificada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Certificate Status */}
        {certificado ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-success">Certificado Activo</span>
              <Badge variant="outline" className="ml-auto text-[10px] border-success/30 text-success">
                Vigente
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Titular</p>
                <p className="font-medium">{certificado.titular}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Emitido por</p>
                <p className="font-medium">{certificado.emitidoPor}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Vigencia</p>
                <p className="font-medium">{certificado.vigenciaDesde} → {certificado.vigenciaHasta}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Serial</p>
                <p className="font-mono text-[10px]">{certificado.serial}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-md bg-success-light">
              <Lock className="w-3.5 h-3.5 text-success" />
              <span className="text-[11px] text-success">
                Listo para firmar declaraciones SIGA
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => { setCertificado(null); setArchivoNombre(''); }}
            >
              Cambiar Certificado
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                archivoNombre
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".p12,.pfx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {archivoNombre ? (
                <div className="flex items-center justify-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">{archivoNombre}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Cargar certificado <strong>.p12</strong> o <strong>.pfx</strong>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Firma Electrónica Calificada (FEC)
                  </p>
                </>
              )}
            </div>

            {/* Password */}
            {archivoNombre && (
              <div className="space-y-1.5">
                <Label className="text-xs">Contraseña del certificado</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {archivoNombre && (
              <Button
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={handleCargarCertificado}
                disabled={!password || cargando}
              >
                {cargando ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Cargar y Verificar
                  </>
                )}
              </Button>
            )}

            {/* Security notice */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-warning-light">
              <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-warning-foreground leading-relaxed">
                El certificado se procesa localmente y nunca se transmite a servidores externos.
                Solo se utiliza para firmar los paquetes XML antes del envío al SIGA.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
