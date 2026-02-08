// ============================================
// MFASetup - Multi-Factor Authentication enrollment & verification
// Enterprise Security: TOTP-based MFA via Supabase Auth
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertCircle, Loader2, Smartphone, Key } from 'lucide-react';

interface MFASetupProps {
  onComplete?: () => void;
  mode?: 'setup' | 'verify';
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, mode = 'setup' }) => {
  const [step, setStep] = useState<'check' | 'enroll' | 'verify' | 'complete'>('check');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      if (verifiedFactors.length > 0) {
        setMfaEnabled(true);
        setStep('complete');
      } else if (mode === 'verify') {
        setStep('verify');
      } else {
        setStep('enroll');
      }
    } catch (err) {
      console.warn('MFA check error:', err);
      setStep('enroll');
    }
  };

  const enrollMFA = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'ZENITH Authenticator',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message || 'Error enrollando MFA');
    }
    setLoading(false);
  };

  const verifyMFA = async () => {
    if (otpCode.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      // If we have a factorId from enrollment, challenge it
      let currentFactorId = factorId;

      if (!currentFactorId) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const unverified = factors?.totp?.find(f => (f.status as string) === 'unverified');
        const verified = factors?.totp?.find(f => (f.status as string) === 'verified');
        currentFactorId = unverified?.id || verified?.id || '';
      }

      if (!currentFactorId) {
        setError('No se encontró factor MFA. Intenta enrollarte primero.');
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: currentFactorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: currentFactorId,
        challengeId: challenge.id,
        code: otpCode,
      });

      if (verifyError) throw verifyError;

      setMfaEnabled(true);
      setStep('complete');
      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Código OTP inválido');
      setOtpCode('');
    }
    setLoading(false);
  };

  const unenrollMFA = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find(f => f.status === 'verified');
      if (verified) {
        await supabase.auth.mfa.unenroll({ factorId: verified.id });
        setMfaEnabled(false);
        setStep('enroll');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Card className="card-elevated max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Autenticación Multi-Factor (MFA)</CardTitle>
        </div>
        <CardDescription>
          Protege tu cuenta con verificación de dos pasos usando una app de autenticación
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step: Enroll */}
        {step === 'enroll' && !qrCode && (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Usa una aplicación como <strong>Google Authenticator</strong> o <strong>Authy</strong> para
              escanear el código QR y generar códigos de verificación.
            </p>
            <Button onClick={enrollMFA} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><Key className="mr-2 h-4 w-4" /> Activar MFA</>
              )}
            </Button>
          </div>
        )}

        {/* Step: QR Code + Verify */}
        {step === 'verify' && qrCode && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Escanea este código QR con tu app de autenticación:
              </p>
              <div className="inline-block p-3 bg-card border rounded-lg">
                <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
              </div>
            </div>

            {secret && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Clave manual:</p>
                <code className="text-xs font-mono break-all">{secret}</code>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Ingresa el código de 6 dígitos:</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              onClick={verifyMFA}
              disabled={loading || otpCode.length !== 6}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                'Verificar y Activar'
              )}
            </Button>
          </div>
        )}

        {/* Step: Verify only (no QR) */}
        {step === 'verify' && !qrCode && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Ingresa el código de tu aplicación de autenticación:
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={verifyMFA}
              disabled={loading || otpCode.length !== 6}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                'Verificar'
              )}
            </Button>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-success/10 w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <Badge className="bg-success-light text-success">MFA Activo</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Tu cuenta está protegida con autenticación de dos factores.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={unenrollMFA} disabled={loading}>
              Desactivar MFA
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <p className="text-[10px] text-muted-foreground text-center w-full">
          ZENITH Enterprise Security • Cumplimiento BASC v6-2022
        </p>
      </CardFooter>
    </Card>
  );
};

export default MFASetup;
