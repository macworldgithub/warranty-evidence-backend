const fs = require('fs');
const path = require('path');

const targetRoot = 'd:/booran-warranty-new';

function writeFile(relPath, content) {
  const fullPath = path.join(targetRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created:', relPath);
}

// Write lib/api.ts
writeFile('lib/api.ts', `
import {
  UserProfile,
  Site,
  Brand,
  BrandPack,
  WarrantyCase,
  DashboardKPIs,
  FlagReasonStat,
  SitePerformance,
  SubmissionPackResponse,
  DecodedVehicle,
  FaultCategory,
  FlagReasonCode,
  MediaType
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeader(): HeadersInit {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('booran_auth_token');
    if (token) {
      return {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      };
    }
  }
  return {
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = \`HTTP Error \${res.status}: \${res.statusText}\`;
    try {
      const errJson = await res.json();
      if (errJson.message) {
        errorMsg = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ accessToken: string; user: UserProfile }> {
    const res = await fetch(\`\${BASE_URL}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<UserProfile> {
    const res = await fetch(\`\${BASE_URL}/auth/me\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch(\`\${BASE_URL}/auth/users\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Sites
  async getSites(): Promise<Site[]> {
    const res = await fetch(\`\${BASE_URL}/sites\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getSite(id: string): Promise<Site> {
    const res = await fetch(\`\${BASE_URL}/sites/\${id}\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async createSite(data: { name: string; location: string; roPrefix: string; authorizedBrandIds: string[] }): Promise<Site> {
    const res = await fetch(\`\${BASE_URL}/sites\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Brands
  async getBrands(): Promise<Brand[]> {
    const res = await fetch(\`\${BASE_URL}/brands\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getBrand(id: string): Promise<Brand> {
    const res = await fetch(\`\${BASE_URL}/brands/\${id}\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Brand Packs
  async getBrandPacks(): Promise<BrandPack[]> {
    const res = await fetch(\`\${BASE_URL}/brand-packs\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getBrandPack(id: string): Promise<BrandPack> {
    const res = await fetch(\`\${BASE_URL}/brand-packs/\${id}\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getActiveBrandPack(brandId: string): Promise<BrandPack> {
    const res = await fetch(\`\${BASE_URL}/brand-packs/brand/\${brandId}/active\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async evaluateRules(data: {
    brandId: string;
    faultCategory: FaultCategory;
    partReplaced: boolean;
    noiseFault: boolean;
    diagnosticsAvailable: boolean;
    repairStage: string;
  }): Promise<{
    brandPackId: string;
    brandPackVersion: number;
    packName: string;
    resolvedRules: string[];
    mandatoryCount: number;
    optionalCount: number;
  }> {
    const res = await fetch(\`\${BASE_URL}/brand-packs/evaluate-rules\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async cloneBrandPackVersion(id: string): Promise<BrandPack> {
    const res = await fetch(\`\${BASE_URL}/brand-packs/\${id}/clone-version\`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async publishBrandPackVersion(id: string): Promise<BrandPack> {
    const res = await fetch(\`\${BASE_URL}/brand-packs/\${id}/publish\`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Warranty Cases
  async getWarrantyCases(params?: {
    siteId?: string;
    brandId?: string;
    status?: string;
    ro?: string;
    vin?: string;
    flaggedOnly?: boolean;
    agedHours?: number;
  }): Promise<WarrantyCase[]> {
    const query = new URLSearchParams();
    if (params?.siteId) query.append('siteId', params.siteId);
    if (params?.brandId) query.append('brandId', params.brandId);
    if (params?.status) query.append('status', params.status);
    if (params?.ro) query.append('ro', params.ro);
    if (params?.vin) query.append('vin', params.vin);
    if (params?.flaggedOnly) query.append('flaggedOnly', 'true');
    if (params?.agedHours) query.append('agedHours', params.agedHours.toString());

    const qs = query.toString();
    const url = \`\${BASE_URL}/warranty-cases\${qs ? '?' + qs : ''}\`;
    const res = await fetch(url, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getCase(id: string): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${id}\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async createCase(data: {
    siteId: string;
    brandId: string;
    roNumber: string;
    claimNumber?: string;
    vin: string;
    odometer: number;
    make: string;
    model: string;
    year: number;
    powertrain: 'EV' | 'Hybrid' | 'PHEV' | 'ICE';
    technicianId: string;
    technicianName: string;
    concernTitle: string;
    faultCategory: FaultCategory;
    partReplaced: boolean;
    noiseFault: boolean;
    diagnosticsAvailable: boolean;
    repairStage: 'Pre-repair only' | 'During repair' | 'Repair complete';
  }): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async addEvidence(
    caseId: string,
    data: {
      ruleKey: string;
      name: string;
      mediaType: MediaType;
      storageUrl: string;
      ocrExtractedText?: string;
      ocrConfidence?: number;
      durationSeconds?: number;
    }
  ): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${caseId}/evidence\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async addVoiceNote(
    caseId: string,
    data: {
      transcript: string;
      durationSeconds: number;
      recordedBy: string;
      originalAudioUrl?: string;
      pinnedToEvidenceKey?: string;
    }
  ): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${caseId}/voice-notes\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async submitFromWorkshop(caseId: string): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${caseId}/submit-from-workshop\`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async flagCase(
    caseId: string,
    data: {
      evidenceRuleKey: string;
      reasonCode: FlagReasonCode;
      instruction: string;
      flaggedBy: string;
    }
  ): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${caseId}/flag\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async markSubmitted(
    caseId: string,
    data: {
      claimNumber: string;
      clerkNote?: string;
    }
  ): Promise<WarrantyCase> {
    const res = await fetch(\`\${BASE_URL}/warranty-cases/\${caseId}/mark-submitted\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Vehicle / VIN Decoder
  async decodeVin(vin: string): Promise<DecodedVehicle> {
    const res = await fetch(\`\${BASE_URL}/vehicle/decode-vin\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ vin }),
    });
    return handleResponse(res);
  },

  // Voice to Tech
  async transcribeAudio(data: {
    audioUrl?: string;
    audioBase64?: string;
    technicianName?: string;
  }): Promise<{
    transcript: string;
    confidence: number;
    durationSeconds: number;
    model: string;
    engine: string;
  }> {
    const res = await fetch(\`\${BASE_URL}/voice-to-tech/transcribe\`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Submission Pack Export
  async getSubmissionPack(caseId: string): Promise<SubmissionPackResponse> {
    const res = await fetch(\`\${BASE_URL}/submission-pack/\${caseId}\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Dashboard Analytics
  async getKPIs(): Promise<DashboardKPIs> {
    const res = await fetch(\`\${BASE_URL}/dashboard/kpis\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getFlagReasons(): Promise<FlagReasonStat[]> {
    const res = await fetch(\`\${BASE_URL}/dashboard/flag-reasons\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getSitePerformance(): Promise<SitePerformance[]> {
    const res = await fetch(\`\${BASE_URL}/dashboard/sites-performance\`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },
};
`);

console.log('lib/api.ts written!');
