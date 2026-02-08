/**
 * STELLA KNOWLEDGE BASE — Enciclopedia Operativa Viva de ZENITH
 * 5 niveles de documentación operativa indexados por ruta y contexto
 */

export interface KnowledgeArticle {
  id: string;
  nivel: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  categoria: string;
  contenido: string;
  keywords: string[];
  rutasRelacionadas: string[];
  pasosGuiados?: TrainingStep[];
  formulasRelacionadas?: FormulaDoc[];
  alertasEmergencia?: EmergencyAlert[];
}

export interface TrainingStep {
  paso: number;
  titulo: string;
  instruccion: string;
  elementoUI?: string;
  tip?: string;
}

export interface FormulaDoc {
  nombre: string;
  formula: string;
  ejemplo: string;
  baseLegal: string;
}

export interface EmergencyAlert {
  condicion: string;
  mensaje: string;
  accionCorrectiva: string;
  severidad: 'critico' | 'advertencia' | 'info';
}

// ─────────────────────────────────────────────────
// NIVEL 1: INGESTO Y CAPTURA (LEXIS)
// ─────────────────────────────────────────────────

const nivel1Articles: KnowledgeArticle[] = [
  {
    id: 'lexis-carga-manifiesto',
    nivel: 1,
    titulo: 'Cómo Cargar un Manifiesto de Carga',
    categoria: 'Ingesto y Captura (LEXIS)',
    contenido: `El proceso de carga de manifiestos en ZENITH es automático e inteligente.

**Formatos aceptados:** Excel (.xlsx, .xls), CSV
**Detección automática:** ZENITH detecta automáticamente las columnas del manifiesto usando IA con más de 500 variaciones de nombres de columnas.

**Proceso:**
1. Navegue a la pantalla principal (/).
2. Arrastre el archivo Excel del manifiesto a la zona de carga.
3. ZENITH identificará automáticamente: MAWB (formato IATA XXX-XXXXXXXX), guías hijas (HAWB), consignatarios, descripciones, pesos y valores.
4. El sistema validará la integridad del MAWB verificando el prefijo de aerolínea (ej: 230=Avianca, 172=Copa).

**Stitching Automático:** ZENITH cruza automáticamente los datos del manifiesto con las facturas comerciales usando el número de guía como llave de vinculación.`,
    keywords: ['manifiesto', 'excel', 'cargar', 'subir', 'MAWB', 'HAWB', 'stitching', 'carga'],
    rutasRelacionadas: ['/', '/lexis-ingress'],
    pasosGuiados: [
      { paso: 1, titulo: 'Preparar archivo', instruccion: 'Asegúrese de tener el archivo Excel del manifiesto listo. Debe contener al menos las columnas de MAWB, guía, consignatario y descripción.', tip: 'ZENITH acepta cualquier formato de columnas — la IA los detecta automáticamente.' },
      { paso: 2, titulo: 'Arrastrar a la zona de carga', instruccion: 'Arrastre el archivo Excel a la zona de carga indicada con el ícono de documento.', elementoUI: 'SmartDropZone' },
      { paso: 3, titulo: 'Verificar detección', instruccion: 'ZENITH mostrará las columnas detectadas y el MAWB identificado. Revise que sean correctos.', tip: 'Si alguna columna no fue detectada, puede ajustarla manualmente.' },
      { paso: 4, titulo: 'Subir facturas', instruccion: 'Suba los PDFs de las facturas comerciales. ZENITH los cruzará automáticamente con las guías del manifiesto.' },
      { paso: 5, titulo: 'Revisar resultados', instruccion: 'Revise el dashboard de resultados. Zod validará la integridad de los datos y Stella le notificará cualquier discrepancia.' },
    ],
  },
  {
    id: 'lexis-carga-facturas',
    nivel: 1,
    titulo: 'Cómo Subir Facturas Comerciales',
    categoria: 'Ingesto y Captura (LEXIS)',
    contenido: `Las facturas comerciales son el segundo pilar del despacho aduanero.

**Formatos aceptados:** PDF, imágenes (JPG, PNG)
**Extracción:** ZENITH usa OCR con IA para extraer datos clave: valor FOB, descripción de mercancía, shipper, y datos del consignatario.

**Triangulación de Datos:**
ZENITH realiza una triangulación triple entre:
1. Manifiesto de carga (Excel)
2. Factura comercial (PDF)
3. Documento de transporte (AWB/BL)

Si hay discrepancias entre estos documentos, Zod emitirá una alerta de integridad.

**Facturas faltantes:** Si algunas guías no tienen factura, el sistema permite continuar y las marca para verificación posterior.`,
    keywords: ['factura', 'PDF', 'OCR', 'subir', 'comercial', 'invoice', 'triangulación'],
    rutasRelacionadas: ['/', '/lexis-ingress'],
    pasosGuiados: [
      { paso: 1, titulo: 'Preparar PDFs', instruccion: 'Reúna todos los PDFs de facturas comerciales del embarque.' },
      { paso: 2, titulo: 'Subir documentos', instruccion: 'Arrastre los PDFs a la segunda zona de carga o haga clic para seleccionarlos.' },
      { paso: 3, titulo: 'Esperar procesamiento', instruccion: 'ZENITH procesará cada factura con OCR e IA. Verá el progreso en tiempo real.' },
      { paso: 4, titulo: 'Revisar matching', instruccion: 'Verifique que cada factura fue correctamente vinculada a su guía correspondiente.' },
    ],
  },
  {
    id: 'lexis-stitching-automatico',
    nivel: 1,
    titulo: 'Qué es el Stitching Automático',
    categoria: 'Ingesto y Captura (LEXIS)',
    contenido: `El "Stitching" (costura) es el proceso automático de ZENITH para vincular datos de múltiples fuentes.

**¿Cómo funciona?**
1. ZENITH toma el número de guía (HAWB) del manifiesto.
2. Busca el mismo número en las facturas escaneadas por OCR.
3. Vincula automáticamente la información: valor declarado, descripción, shipper.
4. Cuando hay un GTIN (código de barras), también lo cruza con la base GS1 para enriquecer la clasificación.

**Beneficios:**
- Elimina la carga manual de datos.
- Detecta inconsistencias entre documentos (valor en factura vs. valor en manifiesto).
- Acelera el despacho en un 80% comparado con el proceso manual.

**Base Legal:** Art. 321 del RECAUCA establece que el despachante debe verificar la concordancia entre los documentos de soporte.`,
    keywords: ['stitching', 'costura', 'vincular', 'cruzar', 'automático', 'matching'],
    rutasRelacionadas: ['/', '/lexis-ingress'],
  },
];

// ─────────────────────────────────────────────────
// NIVEL 2: AUDITORÍA DE INTEGRIDAD (ZOD)
// ─────────────────────────────────────────────────

const nivel2Articles: KnowledgeArticle[] = [
  {
    id: 'zod-alertas-integridad',
    nivel: 2,
    titulo: 'Interpretación de Alertas de Zod',
    categoria: 'Auditoría de Integridad (ZOD)',
    contenido: `Zod es el motor de integridad de ZENITH. Cada alerta tiene un significado y una acción requerida.

**Tipos de Alertas:**

🔴 **CRÍTICA — Bloquea el despacho:**
- Subvaluación detectada: El valor CIF está por debajo del rango esperado para esa partida arancelaria.
- RUC inválido: El número de identificación fiscal del importador no coincide con los registros.
- Duplicado detectado: Otra declaración con el mismo MAWB ya fue procesada.

🟡 **ADVERTENCIA — Requiere revisión:**
- Peso discrepante: Diferencia >10% entre peso bruto declarado y peso calculado.
- Partida arancelaria cambiada: La clasificación fue modificada manualmente.
- Documento faltante: Una guía no tiene factura comercial vinculada.

🟢 **INFORMATIVA:**
- Clasificación validada por aprendizaje previo.
- GTIN verificado con base GS1.

**Base Legal:** Art. 42 del CAUCA — Obligaciones del Declarante.`,
    keywords: ['zod', 'alerta', 'integridad', 'error', 'crítico', 'advertencia', 'bloqueo'],
    rutasRelacionadas: ['/dashboard', '/stella-inbox'],
    alertasEmergencia: [
      {
        condicion: 'Subvaluación detectada',
        mensaje: '⚠️ DETENTE. Zod ha detectado que el valor declarado está significativamente por debajo del rango normal. Esto puede generar una retención por la ANA.',
        accionCorrectiva: 'Verifique la factura comercial original y confirme el valor FOB con el shipper antes de transmitir.',
        severidad: 'critico',
      },
      {
        condicion: 'RUC inválido',
        mensaje: '⚠️ DETENTE. El RUC/Cédula del importador no es válido. No puede transmitir al SIGA sin un RUC verificado.',
        accionCorrectiva: 'Navegue a la sección de Consignatarios y actualice el RUC. Verifique en el registro público de Panamá.',
        severidad: 'critico',
      },
    ],
  },
  {
    id: 'zod-correccion-valores',
    nivel: 2,
    titulo: 'Cómo Corregir Valores en una Declaración',
    categoria: 'Auditoría de Integridad (ZOD)',
    contenido: `Cuando Zod detecta un valor incorrecto, el operador debe corregirlo antes de transmitir.

**Procedimiento de corrección:**
1. Identifique la alerta en el Dashboard o en Stella Inbox.
2. Haga clic en la guía afectada para abrir el detalle.
3. Edite el campo marcado en rojo (valor, peso, descripción).
4. Zod re-validará automáticamente al guardar.
5. Si la corrección es aceptada, la alerta cambiará a verde.

**Trazabilidad:** Toda corrección queda registrada en el Audit Trail con:
- Quién la hizo (operador ID)
- Cuándo se realizó (timestamp)
- Valor anterior vs. valor nuevo
- Hash SHA-256 de integridad

**Base Legal:** Art. 124 del DL 1/2008 — Rectificación voluntaria de declaraciones.`,
    keywords: ['corregir', 'valor', 'rectificar', 'editar', 'declaración', 'corrección'],
    rutasRelacionadas: ['/dashboard'],
    pasosGuiados: [
      { paso: 1, titulo: 'Identificar la alerta', instruccion: 'En el Dashboard, localice la guía con alerta roja o amarilla de Zod.' },
      { paso: 2, titulo: 'Abrir detalle', instruccion: 'Haga clic en la guía para ver el detalle completo de la alerta.' },
      { paso: 3, titulo: 'Editar valor', instruccion: 'Modifique el campo señalado. Zod verificará automáticamente la corrección.' },
      { paso: 4, titulo: 'Confirmar', instruccion: 'Guarde los cambios. El sistema generará un registro de auditoría automáticamente.' },
    ],
  },
  {
    id: 'zod-clasificacion-hts',
    nivel: 2,
    titulo: 'Validación de Partidas Arancelarias (HS Codes)',
    categoria: 'Auditoría de Integridad (ZOD)',
    contenido: `La clasificación arancelaria es la columna vertebral del despacho. ZENITH usa IA para sugerir el código HTS más preciso.

**Sistema de Clasificación:**
- ZENITH analiza la descripción del producto en la factura.
- Consulta la base de clasificaciones validadas previamente por corredores idóneos.
- Si no encuentra coincidencia, utiliza las Reglas Generales Interpretativas (RGI 1-6) del Sistema Armonizado.
- Asigna un % de confianza. Si es <85%, marca para revisión manual.

**RGI aplicables:**
1. **RGI 1:** Textos de partidas y notas de sección/capítulo.
2. **RGI 2a:** Productos incompletos o sin terminar.
3. **RGI 2b:** Mezclas y combinaciones.
4. **RGI 3:** Clasificación por la materia que les confiere el carácter esencial.
5. **RGI 4:** Mercancías más análogas.
6. **RGI 5:** Envases y embalajes.

**Base Legal:** Art. 86 del CAUCA — Sistema Arancelario Centroamericano (SAC).`,
    keywords: ['clasificación', 'HTS', 'arancelario', 'HS Code', 'partida', 'RGI', 'código'],
    rutasRelacionadas: ['/aranceles', '/dashboard', '/consultas-clasificatorias'],
  },
];

// ─────────────────────────────────────────────────
// NIVEL 3: GESTIÓN FINANCIERA
// ─────────────────────────────────────────────────

const nivel3Articles: KnowledgeArticle[] = [
  {
    id: 'fin-pago-impuestos',
    nivel: 3,
    titulo: 'Procedimiento de Pago de Impuestos',
    categoria: 'Gestión Financiera',
    contenido: `El pago de impuestos aduaneros se realiza a través del sistema bancario panameño.

**Bancos autorizados:**
- **Banco General:** Módulo de pagos SIGA integrado en banca en línea empresarial.
- **Banistmo:** Pago vía transferencia ACH a la cuenta de la DGI.
- **BNP (Banco Nacional de Panamá):** Ventanilla única para pagos al Tesoro Nacional.

**Impuestos a pagar:**
1. **DAI (Derecho Arancelario de Importación):** Varía por partida (0% - 40%).
2. **ITBMS (7%):** Sobre el valor CIF + DAI. Excepción: medicamentos y canasta básica.
3. **ISC (Impuesto Selectivo al Consumo):** Solo aplica a ciertos bienes (alcohol, tabaco, vehículos).
4. **Tasa AFC:** Tasa de facilitación de comercio de la ANA.

**Fórmula de liquidación:**
Base Imponible = CIF = FOB + Flete + Seguro
DAI = CIF × % DAI
ITBMS = (CIF + DAI) × 7%
ISC = (CIF + DAI) × % ISC (si aplica)
Total = DAI + ITBMS + ISC + Tasas`,
    keywords: ['pago', 'impuestos', 'banco', 'DAI', 'ITBMS', 'ISC', 'liquidación', 'Banco General', 'Banistmo', 'BNP'],
    rutasRelacionadas: ['/tax-simulator', '/enterprise-billing'],
    formulasRelacionadas: [
      {
        nombre: 'Cálculo DAI',
        formula: 'DAI = CIF × (% DAI / 100)',
        ejemplo: 'CIF = $1,000 × 15% DAI = $150.00',
        baseLegal: 'Arancel Nacional de Importación de Panamá',
      },
      {
        nombre: 'Cálculo ITBMS',
        formula: 'ITBMS = (CIF + DAI) × 0.07',
        ejemplo: '($1,000 + $150) × 0.07 = $80.50',
        baseLegal: 'Ley 8 de 2010 — ITBMS al 7%',
      },
      {
        nombre: 'Cálculo Total Liquidación',
        formula: 'Total = DAI + ITBMS + ISC + Tasa AFC',
        ejemplo: '$150 + $80.50 + $0 + $5 = $235.50',
        baseLegal: 'Art. 60 DL 1/2008 — Base imponible CIF',
      },
    ],
    pasosGuiados: [
      { paso: 1, titulo: 'Generar liquidación', instruccion: 'En el Dashboard del manifiesto, haga clic en "Generar Liquidación" para obtener el cálculo exacto de impuestos.' },
      { paso: 2, titulo: 'Descargar boleta', instruccion: 'Descargue la boleta de pago en formato PDF. Contiene el número de referencia y el monto exacto.' },
      { paso: 3, titulo: 'Pagar en banca en línea', instruccion: 'Ingrese a su banca en línea (Banco General, Banistmo o BNP) y realice el pago usando el número de referencia.' },
      { paso: 4, titulo: 'Subir comprobante', instruccion: 'Suba el comprobante de pago a ZENITH para reconciliar. El sistema verificará el monto pagado vs. la liquidación.' },
    ],
  },
  {
    id: 'fin-reconciliacion',
    nivel: 3,
    titulo: 'Reconciliación de Comprobantes de Pago',
    categoria: 'Gestión Financiera',
    contenido: `La reconciliación garantiza que el pago realizado coincide con la liquidación calculada.

**Proceso:**
1. El operador sube el comprobante de pago (PDF o imagen del recibo bancario).
2. ZENITH extrae el monto pagado usando OCR.
3. Compara automáticamente con la liquidación generada.
4. Si coincide → Marca como "Pagado — Listo para transmitir".
5. Si no coincide → Alerta de discrepancia con detalle de la diferencia.

**Diferencias comunes:**
- Redondeo bancario (tolerancia de ±$0.05).
- Pago parcial (requiere aprobación del supervisor).
- Pago doble (genera crédito fiscal a favor del importador).

**Base Legal:** Art. 138 del DL 1/2008 — Pago de tributos aduaneros.`,
    keywords: ['reconciliación', 'comprobante', 'pago', 'verificar', 'recibo', 'bancario'],
    rutasRelacionadas: ['/enterprise-billing'],
  },
  {
    id: 'fin-prefactura',
    nivel: 3,
    titulo: 'Generación de Pre-Facturas de Honorarios',
    categoria: 'Gestión Financiera',
    contenido: `ZENITH genera pre-facturas automáticas de honorarios del corredor de aduanas.

**Componentes de la pre-factura:**
- **Honorarios profesionales:** Calculados según tarifario del corredor (% CIF o tarifa plana).
- **Handling por paquete:** Cargo por cada guía/paquete procesado.
- **Recargos especiales:** Fumigación, inspección, almacenaje, permisos especiales.
- **Soportes de terceros:** Costos de flete terrestre, acarreo, etc.
- **ITBMS (7%):** Aplica sobre honorarios y handling (NO sobre impuestos reembolsables).

**Resolución 222/2025:** Establece honorarios mínimos según valor CIF:
- CIF hasta $1,000: Honorario mínimo $60.00
- CIF $1,001-$5,000: Honorario mínimo $120.00
- CIF >$5,000: 0.27% del CIF (mínimo $120.00)

**Flujo de aprobación:**
1. Operador genera pre-factura → 2. Cliente recibe link de aprobación → 3. Cliente aprueba/rechaza → 4. Se exporta a SAP/ERP.`,
    keywords: ['pre-factura', 'honorarios', 'facturación', 'tarifa', 'handling', 'corredor'],
    rutasRelacionadas: ['/enterprise-billing'],
  },
];

// ─────────────────────────────────────────────────
// NIVEL 4: TRANSMISIÓN SIGA
// ─────────────────────────────────────────────────

const nivel4Articles: KnowledgeArticle[] = [
  {
    id: 'siga-firma-electronica',
    nivel: 4,
    titulo: 'Uso de la Firma Electrónica para SIGA',
    categoria: 'Transmisión SIGA',
    contenido: `La firma electrónica es obligatoria para transmitir declaraciones al SIGA.

**Requisitos previos:**
1. Certificado digital .p12 o .pfx vigente emitido por la ANA.
2. Licencia ANA del corredor activa y no vencida.
3. Fianza del corredor vigente.

**Proceso de firma:**
1. ZENITH genera el XML de la declaración según el esquema TradeNet/CrimsonLogic.
2. El sistema aplica la firma XML-DSIG (RSA-SHA256) usando el certificado del corredor.
3. Se calcula el hash SHA-256 del documento firmado.
4. Se encola la transmisión al servidor de la ANA.

**Verificación:**
- El SIGA retorna un número de registro (DUCAV) si la transmisión es exitosa.
- Si hay error, retorna un código de rechazo con la descripción del problema.

**Base Legal:** Ley 51 de 2008 — Firma Electrónica y Documentos Electrónicos.`,
    keywords: ['firma', 'electrónica', 'digital', 'certificado', 'p12', 'pfx', 'SIGA', 'transmitir'],
    rutasRelacionadas: ['/siga-gateway'],
    pasosGuiados: [
      { paso: 1, titulo: 'Verificar certificado', instruccion: 'Navegue a SIGA Gateway > Conectividad ANA y verifique que su certificado digital está cargado y vigente.' },
      { paso: 2, titulo: 'Seleccionar declaración', instruccion: 'En el Dashboard del manifiesto, seleccione la declaración lista para transmitir (debe tener sello verde de Zod).' },
      { paso: 3, titulo: 'Firmar y transmitir', instruccion: 'Haga clic en "Firmar y Transmitir". ZENITH aplicará su firma electrónica y enviará al SIGA.' },
      { paso: 4, titulo: 'Confirmar recepción', instruccion: 'Espere el número DUCAV de confirmación. Si hay error, revise el log de transmisión.' },
    ],
    alertasEmergencia: [
      {
        condicion: 'Certificado vencido',
        mensaje: '🛑 DETENTE. Su certificado de firma electrónica está vencido. No puede transmitir al SIGA.',
        accionCorrectiva: 'Renueve su certificado con la ANA antes de intentar transmitir. Contacte a la División de Tecnología de la ANA.',
        severidad: 'critico',
      },
      {
        condicion: 'Transmisión sin validación Zod',
        mensaje: '🛑 DETENTE. Antes de transmitir, Zod requiere que valide la integridad de la declaración. Hay errores pendientes.',
        accionCorrectiva: 'Vuelva al Dashboard y resuelva todas las alertas rojas de Zod antes de intentar transmitir.',
        severidad: 'critico',
      },
    ],
  },
  {
    id: 'siga-envio-crimsonlogic',
    nivel: 4,
    titulo: 'Envío de Datos al Servidor CrimsonLogic',
    categoria: 'Transmisión SIGA',
    contenido: `CrimsonLogic (Singapur) opera la infraestructura tecnológica del SIGA de Panamá bajo la marca TradeNet.

**Protocolo de comunicación:**
- ZENITH convierte los datos JSON internos a esquemas XML compatibles con TradeNet.
- La transmisión se realiza via SOAP/HTTPS con certificado SSL.
- Cada mensaje incluye la firma XML-DSIG del corredor autorizado.

**Cola de reintentos:**
- Si el servidor no responde, ZENITH reintenta automáticamente cada 5 minutos (máximo 5 intentos).
- Backoff exponencial: 5min → 7.5min → 11.25min → 16.87min → 25.31min
- Si todos los intentos fallan, Stella notifica al operador para intervención manual.

**Modos de operación:**
- 🟢 **Producción:** Transmisión real al SIGA.
- 🟡 **Homologación (Sandbox):** Pruebas sin afectar la base real.

**Base Legal:** Decreto Ejecutivo 47 de 2019 — Sistema Integrado de Gestión Aduanera.`,
    keywords: ['CrimsonLogic', 'TradeNet', 'transmisión', 'SIGA', 'XML', 'SOAP', 'envío', 'servidor'],
    rutasRelacionadas: ['/siga-gateway'],
  },
];

// ─────────────────────────────────────────────────
// NIVEL 5: SOPORTE Y LOGS
// ─────────────────────────────────────────────────

const nivel5Articles: KnowledgeArticle[] = [
  {
    id: 'soporte-erp-sync',
    nivel: 5,
    titulo: 'Lectura de Errores en ERP Sync',
    categoria: 'Soporte y Logs',
    contenido: `El módulo ERP Sync conecta ZENITH con sistemas contables externos (SAP, QuickBooks, etc.).

**Errores comunes:**

| Código | Descripción | Solución |
|--------|------------|----------|
| ERR-001 | Timeout de conexión | Verificar conectividad de red y reintentar. |
| ERR-002 | Formato incompatible | El ERP rechazó el formato. Verifique el mapeo de campos. |
| ERR-003 | Duplicado en ERP | El registro ya existe en el sistema contable. |
| ERR-004 | Credenciales inválidas | Actualizar las credenciales de API en Configuración. |
| ERR-005 | Límite de registros | El ERP tiene un límite de batch. Divida el envío. |

**Cómo revisar logs:**
1. Navegue a ERP Sync History (/erp-sync-history).
2. Filtre por fecha y estado (éxito/error).
3. Haga clic en un registro para ver el detalle del error.
4. Use el botón "Reintentar" para enviar nuevamente.

**Consejo:** Si el error persiste, exporte el log y contacte al soporte del ERP.`,
    keywords: ['ERP', 'sync', 'error', 'log', 'SAP', 'conexión', 'soporte'],
    rutasRelacionadas: ['/erp-sync-history'],
  },
  {
    id: 'soporte-rechazos-ana',
    nivel: 5,
    titulo: 'Resolución de Rechazos de la ANA',
    categoria: 'Soporte y Logs',
    contenido: `Cuando la ANA rechaza una transmisión, ZENITH registra el código de error y la descripción.

**Rechazos frecuentes:**

| Código ANA | Motivo | Acción |
|-----------|--------|--------|
| R-101 | Partida arancelaria no existe | Verificar código HTS en el Arancel Nacional. |
| R-102 | Valor CIF fuera de rango | Subvaluación/sobrevaluación. Revisar factura. |
| R-103 | RUC no registrado | El importador no tiene RUC activo en DGI. |
| R-104 | Certificado expirado | Renovar certificado de firma electrónica. |
| R-105 | Duplicado DUCAV | Ya existe una declaración con esos datos. |
| R-106 | Permiso anuente faltante | Se requiere permiso de MINSA, AUPSA o MIDA. |
| R-107 | Peso excede tolerancia | Diferencia >15% entre peso declarado y real. |

**Proceso de resolución:**
1. Identifique el código de rechazo en el Monitor de Transmisión.
2. Corrija el dato según la tabla de acciones.
3. Re-firme y re-transmita la declaración.
4. Zod generará un nuevo hash de integridad para la versión corregida.

**Base Legal:** Art. 46 del CAUCA — Causales de rechazo de declaración.`,
    keywords: ['rechazo', 'ANA', 'error', 'código', 'resolución', 'DUCAV', 'transmisión'],
    rutasRelacionadas: ['/siga-gateway'],
    pasosGuiados: [
      { paso: 1, titulo: 'Identificar rechazo', instruccion: 'En SIGA Gateway > Monitor de Transmisión, localice la transmisión rechazada.' },
      { paso: 2, titulo: 'Leer código de error', instruccion: 'Revise el código de rechazo y la descripción proporcionada por la ANA.' },
      { paso: 3, titulo: 'Aplicar corrección', instruccion: 'Según el código, corrija los datos en el Dashboard del manifiesto.' },
      { paso: 4, titulo: 'Re-transmitir', instruccion: 'Vuelva a firmar y transmitir. ZENITH generará un nuevo hash de integridad.' },
    ],
  },
  {
    id: 'soporte-stella-inbox',
    nivel: 5,
    titulo: 'Uso del Stella Inbox como Centro de Control',
    categoria: 'Soporte y Logs',
    contenido: `Stella Inbox es el centro de comando táctico del corredor de aduanas.

**Cuadrantes del Dashboard:**

🔴 **Bloqueo de Integridad (Zod):** Errores críticos que bloquean el despacho. Requieren corrección inmediata.
🟠 **Urgencias Regulatorias:** Alertas de autoridades anuentes (MINSA, MIDA, AUPSA) con tracking de ETA.
🔵 **Flujo Dorado:** Expedientes 100% compliant, listos para firma SHA-256 y transmisión.
🟡 **Consultoría:** Noticias legales, actualizaciones normativas y recomendaciones de Stella.

**Cada item incluye:**
- Justificación técnica de por qué está en ese cuadrante.
- Citas legales relevantes.
- Botón de acción para resolver directamente.

**Consejo:** Comience siempre por los items rojos. Son los que más riesgo fiscal representan.`,
    keywords: ['Stella', 'inbox', 'dashboard', 'control', 'cuadrante', 'centro', 'comando'],
    rutasRelacionadas: ['/stella-inbox'],
  },
];

// ─────────────────────────────────────────────────
// EXPORTACIONES Y BÚSQUEDA
// ─────────────────────────────────────────────────

export const STELLA_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  ...nivel1Articles,
  ...nivel2Articles,
  ...nivel3Articles,
  ...nivel4Articles,
  ...nivel5Articles,
];

const NIVEL_LABELS: Record<number, string> = {
  1: 'Ingesto y Captura (LEXIS)',
  2: 'Auditoría de Integridad (ZOD)',
  3: 'Gestión Financiera',
  4: 'Transmisión SIGA',
  5: 'Soporte y Logs',
};

export function getNivelLabel(nivel: number): string {
  return NIVEL_LABELS[nivel] || `Nivel ${nivel}`;
}

/**
 * Busca artículos relevantes por query de texto
 */
export function searchKnowledge(query: string): KnowledgeArticle[] {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = q.split(/\s+/).filter(t => t.length > 2);

  return STELLA_KNOWLEDGE_BASE
    .map(article => {
      const searchableText = [
        article.titulo,
        article.categoria,
        article.contenido,
        ...article.keywords,
      ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let score = 0;
      for (const token of tokens) {
        if (searchableText.includes(token)) score++;
        if (article.keywords.some(k => k.toLowerCase().includes(token))) score += 2;
        if (article.titulo.toLowerCase().includes(token)) score += 3;
      }
      return { article, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.article);
}

/**
 * Obtiene artículos relevantes para una ruta específica
 */
export function getArticlesForRoute(route: string): KnowledgeArticle[] {
  const normalizedRoute = route.split('/').slice(0, 2).join('/') || '/';
  return STELLA_KNOWLEDGE_BASE.filter(a =>
    a.rutasRelacionadas.some(r => normalizedRoute.startsWith(r) || r === normalizedRoute)
  );
}

/**
 * Obtiene guía paso a paso para una ruta
 */
export function getTrainingStepsForRoute(route: string): { article: KnowledgeArticle; steps: TrainingStep[] }[] {
  return getArticlesForRoute(route)
    .filter(a => a.pasosGuiados && a.pasosGuiados.length > 0)
    .map(a => ({ article: a, steps: a.pasosGuiados! }));
}

/**
 * Obtiene alertas de emergencia para una ruta
 */
export function getEmergencyAlertsForRoute(route: string): { article: KnowledgeArticle; alerts: EmergencyAlert[] }[] {
  return getArticlesForRoute(route)
    .filter(a => a.alertasEmergencia && a.alertasEmergencia.length > 0)
    .map(a => ({ article: a, alerts: a.alertasEmergencia! }));
}

/**
 * Serializa artículos relevantes como contexto para el prompt de IA
 */
export function serializeKnowledgeForAI(articles: KnowledgeArticle[]): string {
  if (articles.length === 0) return '';

  return articles.map(a => {
    let text = `### ${a.titulo} (Nivel ${a.nivel}: ${getNivelLabel(a.nivel)})\n${a.contenido}`;
    if (a.formulasRelacionadas) {
      text += '\n\n**Fórmulas:**\n' + a.formulasRelacionadas.map(f =>
        `- ${f.nombre}: ${f.formula} | Ejemplo: ${f.ejemplo} | Base Legal: ${f.baseLegal}`
      ).join('\n');
    }
    return text;
  }).join('\n\n---\n\n');
}
