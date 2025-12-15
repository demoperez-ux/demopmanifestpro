import { ManifestRow, Consignee, ConsigneeStats, ConsolidatedDelivery } from '@/types/manifest';

/**
 * Normalize a name for comparison (remove accents, extra spaces, lowercase)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeName(str1);
  const normalized2 = normalizeName(str2);
  
  if (normalized1 === normalized2) return 100;
  if (!normalized1 || !normalized2) return 0;
  
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const distance = levenshteinDistance(normalized1, normalized2);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Generate a unique consignee ID from normalized name
 */
function generateConsigneeId(normalizedName: string, identification?: string): string {
  if (identification) {
    return `consignee-${identification.replace(/[^a-z0-9]/gi, '')}`;
  }
  return `consignee-${normalizedName.replace(/\s/g, '-').substring(0, 30)}`;
}

/**
 * Group rows by consignee with fuzzy matching
 */
export function groupByConsignee(
  rows: ManifestRow[],
  similarityThreshold: number = 90
): Map<string, Consignee> {
  const consigneeMap = new Map<string, Consignee>();
  const normalizedToId = new Map<string, string>();

  rows.forEach(row => {
    const normalizedName = normalizeName(row.recipient);
    let consigneeId: string | undefined;

    // First, check for exact match by identification
    if (row.identification) {
      const idKey = row.identification.replace(/[^a-z0-9]/gi, '').toLowerCase();
      for (const [, consignee] of consigneeMap) {
        if (consignee.identification && 
            consignee.identification.replace(/[^a-z0-9]/gi, '').toLowerCase() === idKey) {
          consigneeId = consignee.id;
          break;
        }
      }
    }

    // If no ID match, try fuzzy name matching
    if (!consigneeId) {
      // Check if we have an exact normalized name match
      if (normalizedToId.has(normalizedName)) {
        consigneeId = normalizedToId.get(normalizedName);
      } else {
        // Try fuzzy matching with existing consignees
        for (const [existingNormalized, existingId] of normalizedToId) {
          const similarity = calculateSimilarity(normalizedName, existingNormalized);
          if (similarity >= similarityThreshold) {
            // Also check if phone matches for higher confidence
            const existingConsignee = consigneeMap.get(existingId);
            if (existingConsignee) {
              if (row.phone && existingConsignee.phone && row.phone === existingConsignee.phone) {
                consigneeId = existingId;
                break;
              } else if (similarity >= 95) {
                // Very high similarity, assume same person
                consigneeId = existingId;
                break;
              }
            }
          }
        }
      }
    }

    // Create new consignee if no match found
    if (!consigneeId) {
      consigneeId = generateConsigneeId(normalizedName, row.identification);
      normalizedToId.set(normalizedName, consigneeId);
      
      consigneeMap.set(consigneeId, {
        id: consigneeId,
        name: row.recipient,
        normalizedName,
        phone: row.phone,
        identification: row.identification,
        addresses: [],
        packages: [],
        totalPackages: 0,
        totalWeight: 0,
        totalValue: 0,
        isConsolidatable: false,
        provinces: [],
        cities: [],
      });
    }

    // Add package to consignee
    const consignee = consigneeMap.get(consigneeId)!;
    
    // Update row with consignee info
    row.consigneeId = consigneeId;
    row.normalizedRecipient = normalizedName;
    
    consignee.packages.push(row);
    consignee.totalPackages++;
    consignee.totalWeight += row.weight || 0;
    consignee.totalValue += row.valueUSD || 0;
    
    // Track unique addresses
    if (row.address && !consignee.addresses.includes(row.address)) {
      consignee.addresses.push(row.address);
    }
    
    // Track geographic info
    if (row.province && !consignee.provinces.includes(row.province)) {
      consignee.provinces.push(row.province);
    }
    if (row.city && !consignee.cities.includes(row.city)) {
      consignee.cities.push(row.city);
    }
    
    // Update phone/identification if not set
    if (row.phone && !consignee.phone) {
      consignee.phone = row.phone;
    }
    if (row.identification && !consignee.identification) {
      consignee.identification = row.identification;
    }
  });

  // Mark consolidatable consignees (2+ packages)
  for (const consignee of consigneeMap.values()) {
    consignee.isConsolidatable = consignee.totalPackages >= 2;
  }

  return consigneeMap;
}

/**
 * Calculate consignee statistics
 */
export function calculateConsigneeStats(consigneeMap: Map<string, Consignee>): ConsigneeStats {
  const consignees = Array.from(consigneeMap.values());
  const consolidatable = consignees.filter(c => c.isConsolidatable);
  const consolidatablePackages = consolidatable.reduce((sum, c) => sum + c.totalPackages, 0);
  
  // Sort by total packages descending for top consignees
  const topConsignees = [...consignees]
    .sort((a, b) => b.totalPackages - a.totalPackages)
    .slice(0, 10);

  // Calculate consolidation savings (trips saved)
  const tripsSaved = consolidatablePackages - consolidatable.length;

  return {
    totalConsignees: consignees.length,
    consolidatableConsignees: consolidatable.length,
    consolidatablePackages,
    avgPackagesPerConsignee: consignees.length > 0 
      ? Math.round((consignees.reduce((sum, c) => sum + c.totalPackages, 0) / consignees.length) * 100) / 100
      : 0,
    topConsignees,
    consolidationSavings: tripsSaved,
  };
}

/**
 * Get consolidated deliveries (consignees with 2+ packages)
 */
export function getConsolidatedDeliveries(
  consigneeMap: Map<string, Consignee>,
  minPackages: number = 2
): ConsolidatedDelivery[] {
  const deliveries: ConsolidatedDelivery[] = [];

  for (const consignee of consigneeMap.values()) {
    if (consignee.totalPackages >= minPackages) {
      deliveries.push({
        consignee,
        packages: consignee.packages,
        deliveryAddress: consignee.addresses[0] || '',
        province: consignee.provinces[0] || '',
        city: consignee.cities[0] || '',
      });
    }
  }

  // Sort by number of packages descending
  return deliveries.sort((a, b) => b.packages.length - a.packages.length);
}

/**
 * Filter consignees by various criteria
 */
export function filterConsignees(
  consigneeMap: Map<string, Consignee>,
  options: {
    minPackages?: number;
    maxPackages?: number;
    province?: string;
    city?: string;
    searchTerm?: string;
  }
): Consignee[] {
  let consignees = Array.from(consigneeMap.values());

  if (options.minPackages !== undefined) {
    consignees = consignees.filter(c => c.totalPackages >= options.minPackages!);
  }

  if (options.maxPackages !== undefined) {
    consignees = consignees.filter(c => c.totalPackages <= options.maxPackages!);
  }

  if (options.province) {
    consignees = consignees.filter(c => 
      c.provinces.some(p => p.toLowerCase().includes(options.province!.toLowerCase()))
    );
  }

  if (options.city) {
    consignees = consignees.filter(c => 
      c.cities.some(city => city.toLowerCase().includes(options.city!.toLowerCase()))
    );
  }

  if (options.searchTerm) {
    const term = options.searchTerm.toLowerCase();
    consignees = consignees.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.normalizedName.includes(term) ||
      c.identification?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  }

  return consignees;
}

/**
 * Export consolidated deliveries to a format suitable for Excel
 */
export function formatConsolidatedForExport(deliveries: ConsolidatedDelivery[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  deliveries.forEach(delivery => {
    delivery.packages.forEach((pkg, index) => {
      rows.push({
        'Consignatario': delivery.consignee.name,
        'ID Consignatario': delivery.consignee.id,
        'Total Paquetes': delivery.consignee.totalPackages,
        'Paquete #': index + 1,
        'Número de Guía': pkg.trackingNumber,
        'Descripción': pkg.description,
        'Valor USD': pkg.valueUSD,
        'Peso': pkg.weight,
        'Dirección': pkg.address,
        'Provincia': pkg.province || '',
        'Ciudad': pkg.city || '',
        'Teléfono': delivery.consignee.phone || '',
        'Identificación': delivery.consignee.identification || '',
      });
    });
  });

  return rows;
}
