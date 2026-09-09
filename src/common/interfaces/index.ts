import { FaultCategory, FlagReasonCode, MediaType, PowertrainType, RepairStage } from '../enums';

export interface EvidenceRule {
  key: string;
  name: string;
  category: 'Tier 1' | 'Tier 2' | 'Conditional';
  instruction: string;
  inAppGuidance: string;
  mediaType: MediaType;
  minCount: number;
  maxVideoSeconds?: number;
  isMandatory: boolean;
  requiresOcrMatch?: boolean;
  ocrTarget?: 'VIN' | 'ODOMETER' | 'BARCODE';
  namingTemplate: string; // e.g. "[DealerRONumber]FrontOfCar.jpg"
  exampleImageUrl?: string;
  conditionTrigger?: {
    field: 'partReplaced' | 'noiseFault' | 'diagnosticsAvailable' | 'repairStage' | 'faultCategory';
    operator: 'equals' | 'in';
    value: any;
  };
}

export interface BrandPackVersion {
  id: string;
  brandId: string;
  version: number;
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  publishedAt?: string;
  vehicleIdRules: {
    vinScanRequired: boolean;
    odometerTypes: PowertrainType[];
    frontReferenceRequired: boolean;
  };
  faultCategories: FaultCategory[];
  rules: EvidenceRule[];
  namingRules: {
    photoPattern: string;
    videoPattern: string;
    documentPattern: string;
  };
}

export interface CapturedEvidenceItem {
  id: string;
  ruleKey: string;
  name: string;
  mediaType: MediaType;
  originalFileName: string;
  oemFileName: string;
  storageUrl: string;
  thumbnailUrl?: string;
  ocrExtractedText?: string;
  ocrConfidence?: number;
  qualityStatus: 'PASS' | 'WARN_BLUR' | 'WARN_DARK' | 'WARN_LIGHT' | 'FAIL_RESOLUTION';
  capturedAt: string;
  capturedBy: string;
  deviceId?: string;
  durationSeconds?: number;
}

export interface VoiceNote {
  id: string;
  stepKey?: string;
  pinnedToEvidenceKey?: string;
  transcript: string;
  originalAudioUrl?: string;
  durationSeconds: number;
  recordedBy: string;
  recordedAt: string;
  isEdited: boolean;
}

export interface CaseFlag {
  id: string;
  evidenceRuleKey?: string;
  reasonCode: FlagReasonCode;
  instruction: string;
  flaggedBy: string;
  flaggedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
}
