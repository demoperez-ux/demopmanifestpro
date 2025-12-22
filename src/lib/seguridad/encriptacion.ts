/**
 * Protector de Datos - Módulo de seguridad para encriptación cliente-side
 * 
 * SEGURIDAD MEJORADA v2.0:
 * - Usa Web Crypto API para generación segura de claves
 * - No almacena claves en sessionStorage/localStorage (vulnerable a XSS)
 * - Falla de forma segura (no devuelve datos sin cifrar en caso de error)
 * - Logging condicional solo en desarrollo
 */

// Logger seguro - solo en desarrollo
const secureLog = (message: string) => {
  if (import.meta.env.DEV) {
    console.log(message);
  }
};

const secureError = (message: string) => {
  if (import.meta.env.DEV) {
    console.error(message);
  }
};

// Clave en memoria (no persistida) - más seguro que sessionStorage
let encryptionKey: CryptoKey | null = null;

/**
 * Genera una clave criptográficamente segura usando Web Crypto API
 */
async function generateSecureKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // No extractable - más seguro
    ['encrypt', 'decrypt']
  );
}

/**
 * Convierte ArrayBuffer a string Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convierte string Base64 a ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class ProtectorDatos {
  /**
   * Inicializa la sesión con una clave segura
   * La clave solo existe en memoria y no se persiste
   */
  static async inicializarSesion(): Promise<void> {
    if (!encryptionKey) {
      try {
        encryptionKey = await generateSecureKey();
        secureLog('✅ Sesión de seguridad inicializada');
      } catch (error) {
        secureError('Error inicializando seguridad');
        throw new Error('No se pudo inicializar el módulo de seguridad');
      }
    }
  }

  /**
   * Obtiene la clave actual o inicializa una nueva
   */
  private static async obtenerClave(): Promise<CryptoKey> {
    if (!encryptionKey) {
      await this.inicializarSesion();
    }
    if (!encryptionKey) {
      throw new Error('No se pudo obtener la clave de encriptación');
    }
    return encryptionKey;
  }

  /**
   * Encripta texto de forma segura
   * IMPORTANTE: Falla de forma segura - lanza error en lugar de devolver texto plano
   */
  static async encriptar(texto: string): Promise<string> {
    if (!texto || texto.trim() === '') return texto;
    
    try {
      const clave = await this.obtenerClave();
      
      // Generar IV seguro
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        clave,
        data
      );
      
      // Combinar IV + datos encriptados
      const encryptedBytes = new Uint8Array(encrypted);
      const combined = new Uint8Array(12 + encryptedBytes.byteLength);
      combined.set(iv, 0);
      combined.set(encryptedBytes, 12);
      
      return arrayBufferToBase64(combined.buffer);
    } catch (error) {
      secureError('Error encriptando datos');
      // SEGURIDAD: NO devolver texto plano - fallar de forma segura
      throw new Error('Error de encriptación - datos no procesados');
    }
  }

  /**
   * Desencripta texto de forma segura
   */
  static async desencriptar(textoEncriptado: string): Promise<string> {
    if (!textoEncriptado || textoEncriptado.trim() === '') return textoEncriptado;
    
    try {
      const clave = await this.obtenerClave();
      
      // Decodificar base64
      const combined = new Uint8Array(base64ToArrayBuffer(textoEncriptado));
      
      // Extraer IV (primeros 12 bytes) y datos
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        clave,
        data
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      secureError('Error desencriptando datos');
      return '[DATO PROTEGIDO - NO DISPONIBLE]';
    }
  }

  /**
   * Genera un hash SHA-256 de forma segura
   */
  static async hashear(texto: string): Promise<string> {
    if (!texto) return '';
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      secureError('Error generando hash');
      throw new Error('Error de hash - operación no completada');
    }
  }

  /**
   * Ofusca datos sensibles para visualización
   * (No usa encriptación, solo oculta partes del texto)
   */
  static ofuscar(texto: string, tipo: 'cedula' | 'telefono' | 'email' | 'direccion'): string {
    if (!texto || texto.trim() === '') return texto;
    
    switch (tipo) {
      case 'cedula':
        return texto.replace(/(\d{1,2})-(\d+)-(\d{4})/, '$1-***-$3');
      case 'telefono':
        return texto.replace(/(\+?\d{1,3})?-?(\d+)-(\d{4})/, '$1-****-$3');
      case 'email':
        const [local, domain] = texto.split('@');
        if (!domain) return texto;
        return `${local[0]}***${local[local.length-1]}@${domain}`;
      case 'direccion':
        const partes = texto.split(',');
        if (partes.length < 2) return '***';
        return `${partes[0]}, ***, ${partes[partes.length-1]}`;
      default:
        return '***';
    }
  }

  /**
   * Limpia la sesión de seguridad
   */
  static limpiarSesion(): void {
    encryptionKey = null;
    secureLog('🔒 Sesión de seguridad limpiada');
  }

  /**
   * Verifica si la sesión está inicializada
   */
  static sesionActiva(): boolean {
    return encryptionKey !== null;
  }
}

// Auto-inicializar en cliente (de forma asíncrona)
if (typeof window !== 'undefined') {
  ProtectorDatos.inicializarSesion().catch(() => {
    // Silenciar error en producción
    if (import.meta.env.DEV) {
      console.warn('No se pudo auto-inicializar el módulo de seguridad');
    }
  });
}
