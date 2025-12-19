// ============================================
// PROTECTOR DE DATOS PERSONALES
// Cumple con Ley 81/2019 de Panamá
// ============================================

import CryptoJS from 'crypto-js';

const STORAGE_KEY = '__app_encryption_key__';

/**
 * Protector de datos sensibles con encriptación AES-256
 */
export class ProtectorDatos {
  
  /**
   * Inicializa clave de encriptación para la sesión
   */
  static inicializarSesion(): void {
    if (typeof window === 'undefined') return;
    
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      const clave = CryptoJS.lib.WordArray.random(256/8).toString();
      sessionStorage.setItem(STORAGE_KEY, clave);
      console.log('✅ Clave de encriptación generada para sesión');
    }
  }
  
  /**
   * Obtiene clave de encriptación
   */
  private static obtenerClave(): string {
    let clave = sessionStorage.getItem(STORAGE_KEY);
    
    if (!clave) {
      this.inicializarSesion();
      clave = sessionStorage.getItem(STORAGE_KEY)!;
    }
    
    return clave;
  }
  
  /**
   * Encripta texto usando AES-256
   */
  static encriptar(texto: string): string {
    if (!texto || texto.trim() === '') {
      return texto;
    }
    
    try {
      const clave = this.obtenerClave();
      const encrypted = CryptoJS.AES.encrypt(texto, clave);
      return encrypted.toString();
    } catch (error) {
      console.error('Error encriptando datos:', error);
      throw new Error('Error de seguridad al encriptar datos');
    }
  }
  
  /**
   * Desencripta texto
   */
  static desencriptar(textoEncriptado: string): string {
    if (!textoEncriptado || textoEncriptado.trim() === '') {
      return textoEncriptado;
    }
    
    try {
      const clave = this.obtenerClave();
      const decrypted = CryptoJS.AES.decrypt(textoEncriptado, clave);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return '[DATO PROTEGIDO]';
    }
  }
  
  /**
   * Encripta objeto consignatario completo
   */
  static encriptarConsignatario(consignatario: {
    identificacion?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    [key: string]: unknown;
  }): typeof consignatario & { identificacionHash?: string; telefonoHash?: string } {
    return {
      ...consignatario,
      identificacion: this.encriptar(consignatario.identificacion || ''),
      telefono: this.encriptar(consignatario.telefono || ''),
      email: consignatario.email, // Email no se encripta (notificaciones)
      direccion: this.encriptar(consignatario.direccion || ''),
      identificacionHash: this.hashear(consignatario.identificacion || ''),
      telefonoHash: this.hashear(consignatario.telefono || '')
    };
  }
  
  /**
   * Desencripta objeto consignatario
   */
  static desencriptarConsignatario(consignatario: {
    identificacion?: string;
    telefono?: string;
    direccion?: string;
    [key: string]: unknown;
  }): typeof consignatario {
    return {
      ...consignatario,
      identificacion: this.desencriptar(consignatario.identificacion || ''),
      telefono: this.desencriptar(consignatario.telefono || ''),
      direccion: this.desencriptar(consignatario.direccion || '')
    };
  }
  
  /**
   * Hashea dato para búsqueda (one-way, no reversible)
   */
  static hashear(texto: string): string {
    if (!texto) return '';
    return CryptoJS.SHA256(texto).toString();
  }
  
  /**
   * Ofusca dato para mostrar en UI (parcialmente visible)
   */
  static ofuscar(texto: string, tipo: 'cedula' | 'telefono' | 'email' | 'direccion'): string {
    if (!texto || texto.trim() === '') {
      return texto;
    }
    
    switch (tipo) {
      case 'cedula':
        // 8-888-8888 → 8-***-8888
        return texto.replace(/(\d{1,2})-(\d+)-(\d{4})/, '$1-***-$3');
      
      case 'telefono':
        // +507-6666-6666 → +507-****-6666
        if (texto.length > 4) {
          return texto.slice(0, -4).replace(/\d/g, '*') + texto.slice(-4);
        }
        return '****';
      
      case 'email':
        // john.doe@example.com → j***e@example.com
        const parts = texto.split('@');
        if (parts.length !== 2) return texto;
        const local = parts[0];
        const domain = parts[1];
        if (local.length <= 2) return `${local[0]}***@${domain}`;
        return `${local[0]}***${local[local.length - 1]}@${domain}`;
      
      case 'direccion':
        // "Calle 50, Apto 5B, Panama" → "Calle 50, ***, Panama"
        const partes = texto.split(',');
        if (partes.length < 2) return '***';
        return `${partes[0].trim()}, ***, ${partes[partes.length - 1].trim()}`;
      
      default:
        return '***';
    }
  }
  
  /**
   * Limpia sesión al cerrar
   */
  static limpiarSesion(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('Sesión de encriptación limpiada');
    }
  }
}

// Inicializar al cargar el módulo
if (typeof window !== 'undefined') {
  ProtectorDatos.inicializarSesion();
  
  window.addEventListener('beforeunload', () => {
    ProtectorDatos.limpiarSesion();
  });
}
