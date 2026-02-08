// ============================================
// ZENITH API GATEWAY — Auth Manager
// OAuth2 + XML-DSIG dual authentication for
// VUCE and SIGA interoperability nodes
// ============================================

export type AuthMethod = 'oauth2' | 'xmldsig' | 'api_key' | 'mutual_tls';
export type TokenStatus = 'valid' | 'expired' | 'refreshing' | 'error';

export interface OAuth2Token {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresAt: number;        // Unix ms
  scope: string;
  issuedAt: number;
  issuer: string;
}

export interface CertificadoFirma {
  alias: string;
  emisor: string;
  validoDesde: string;
  validoHasta: string;
  serial: string;
  algoritmo: string;
  huella: string;           // SHA-256 fingerprint
  formato: 'PKCS12' | 'PFX';
  cargado: boolean;
}

export interface XMLDSIGEnvelope {
  signedXml: string;
  signatureValue: string;
  certificateRef: string;
  algorithm: string;
  timestamp: string;
  canonicalizationMethod: string;
}

export interface AuthSession {
  id: string;
  metodo: AuthMethod;
  servicio: string;
  estado: TokenStatus;
  ultimaActividad: string;
  token?: OAuth2Token;
  certificado?: CertificadoFirma;
  intentos: number;
  maxReintentos: number;
}

// ── OAuth2 Manager ──────────────────────────

export class GestorOAuth2 {
  private tokens: Map<string, OAuth2Token> = new Map();
  private refreshTimers: Map<string, number> = new Map();

  /**
   * Simulates OAuth2 token acquisition for VUCE / ANA endpoints.
   * In production this would call the real /oauth2/token endpoint.
   */
  async obtenerToken(servicio: string, _credentials: {
    clientId: string;
    clientSecret: string;
    scope: string;
    grantType: 'client_credentials' | 'authorization_code';
  }): Promise<OAuth2Token> {
    // Simulated token response
    const now = Date.now();
    const token: OAuth2Token = {
      accessToken: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
        sub: 'ZENITH-GATEWAY',
        iss: `ana-${servicio}`,
        aud: servicio,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + 3600,
        scope: _credentials.scope,
      }))}._sig_placeholder`,
      refreshToken: `rt_${crypto.randomUUID().replace(/-/g, '')}`,
      tokenType: 'Bearer',
      expiresAt: now + 3600_000, // 1 hour
      scope: _credentials.scope,
      issuedAt: now,
      issuer: `ana-${servicio}`,
    };

    this.tokens.set(servicio, token);
    this.programarRefresh(servicio, token);
    return token;
  }

  async refrescarToken(servicio: string): Promise<OAuth2Token | null> {
    const existing = this.tokens.get(servicio);
    if (!existing) return null;

    const now = Date.now();
    const refreshed: OAuth2Token = {
      ...existing,
      accessToken: `eyJhbGciOiJSUzI1NiJ9.${btoa(JSON.stringify({
        sub: 'ZENITH-GATEWAY',
        iss: existing.issuer,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + 3600,
      }))}._refreshed`,
      expiresAt: now + 3600_000,
      issuedAt: now,
    };

    this.tokens.set(servicio, refreshed);
    this.programarRefresh(servicio, refreshed);
    return refreshed;
  }

  getTokenStatus(servicio: string): TokenStatus {
    const token = this.tokens.get(servicio);
    if (!token) return 'error';
    if (Date.now() >= token.expiresAt) return 'expired';
    return 'valid';
  }

  revocarToken(servicio: string): void {
    this.tokens.delete(servicio);
    const timer = this.refreshTimers.get(servicio);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(servicio);
    }
  }

  private programarRefresh(servicio: string, token: OAuth2Token): void {
    const existing = this.refreshTimers.get(servicio);
    if (existing) clearTimeout(existing);

    // Refresh 5 minutes before expiry
    const refreshIn = Math.max((token.expiresAt - Date.now()) - 300_000, 60_000);
    const timer = window.setTimeout(() => {
      this.refrescarToken(servicio);
    }, refreshIn);
    this.refreshTimers.set(servicio, timer);
  }
}

// ── XML-DSIG Signature Engine ───────────────

export class MotorFirmaXMLDSIG {
  private certificado: CertificadoFirma | null = null;

  cargarCertificado(cert: CertificadoFirma): void {
    this.certificado = cert;
  }

  getCertificado(): CertificadoFirma | null {
    return this.certificado;
  }

  /**
   * Wraps the given XML content with an XML-DSIG envelope.
   * In production, this would use the actual private key from the PKCS12 file.
   */
  async firmarXML(xmlContent: string): Promise<XMLDSIGEnvelope> {
    if (!this.certificado) {
      throw new Error('No se ha cargado un certificado de firma electrónica');
    }

    const ts = new Date().toISOString();

    // Generate digest of the content
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlContent);
    const digestBuf = await crypto.subtle.digest('SHA-256', data);
    const digestB64 = btoa(String.fromCharCode(...new Uint8Array(digestBuf)));

    // Simulated signature value (in production: RSA-SHA256 with private key)
    const sigData = encoder.encode(`${digestB64}:${ts}:${this.certificado.serial}`);
    const sigBuf = await crypto.subtle.digest('SHA-256', sigData);
    const signatureValue = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

    const signedXml = `${xmlContent.replace('</TradeNetDeclaration>', '').replace('</Declaration>', '')}
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>${digestB64}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>${this.certificado.huella}</ds:X509Certificate>
        <ds:X509SerialNumber>${this.certificado.serial}</ds:X509SerialNumber>
        <ds:X509IssuerName>${this.certificado.emisor}</ds:X509IssuerName>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>
${xmlContent.includes('</TradeNetDeclaration>') ? '</TradeNetDeclaration>' : '</Declaration>'}`;

    return {
      signedXml,
      signatureValue,
      certificateRef: this.certificado.serial,
      algorithm: 'RSA-SHA256',
      timestamp: ts,
      canonicalizationMethod: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    };
  }

  verificarFirma(_signedXml: string): { valida: boolean; motivo: string } {
    if (!this.certificado) {
      return { valida: false, motivo: 'No hay certificado cargado' };
    }
    const ahora = new Date();
    const vencimiento = new Date(this.certificado.validoHasta);
    if (ahora > vencimiento) {
      return { valida: false, motivo: 'Certificado vencido' };
    }
    return { valida: true, motivo: 'Firma verificada correctamente' };
  }
}

// ── Unified Auth Session Manager ────────────

export class GestorSesionesAuth {
  private sesiones: Map<string, AuthSession> = new Map();
  private oauth2 = new GestorOAuth2();
  private xmldsig = new MotorFirmaXMLDSIG();

  getOAuth2(): GestorOAuth2 { return this.oauth2; }
  getXMLDSIG(): MotorFirmaXMLDSIG { return this.xmldsig; }

  crearSesion(servicio: string, metodo: AuthMethod): AuthSession {
    const session: AuthSession = {
      id: crypto.randomUUID(),
      metodo,
      servicio,
      estado: 'expired',
      ultimaActividad: new Date().toISOString(),
      intentos: 0,
      maxReintentos: 3,
    };
    this.sesiones.set(servicio, session);
    return session;
  }

  getSesion(servicio: string): AuthSession | undefined {
    return this.sesiones.get(servicio);
  }

  getAllSesiones(): AuthSession[] {
    return Array.from(this.sesiones.values());
  }

  async autenticar(servicio: string): Promise<AuthSession> {
    const session = this.sesiones.get(servicio);
    if (!session) throw new Error(`No hay sesión configurada para ${servicio}`);

    session.intentos++;
    session.ultimaActividad = new Date().toISOString();

    try {
      if (session.metodo === 'oauth2') {
        const token = await this.oauth2.obtenerToken(servicio, {
          clientId: `zenith_${servicio}`,
          clientSecret: '***',
          scope: 'customs:write customs:read',
          grantType: 'client_credentials',
        });
        session.token = token;
        session.estado = 'valid';
      } else if (session.metodo === 'xmldsig') {
        const cert = this.xmldsig.getCertificado();
        if (cert) {
          session.certificado = cert;
          session.estado = 'valid';
        } else {
          session.estado = 'error';
        }
      }
    } catch {
      session.estado = 'error';
    }

    this.sesiones.set(servicio, session);
    return session;
  }
}

// ── Singleton instance ──────────────────────
export const gestorAuth = new GestorSesionesAuth();
