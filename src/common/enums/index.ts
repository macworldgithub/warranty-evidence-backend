export enum UserRole {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

export enum CaseStatus {
  DRAFT = 'Draft',
  UPLOADING = 'Uploading',
  AWAITING_REVIEW = 'Awaiting Review',
  FLAGGED = 'Flagged',
  SUBMITTED = 'Submitted',
  CLOSED = 'Closed',
  WITHDRAWN = 'Withdrawn',
}

export enum PowertrainType {
  EV = 'EV',
  HYBRID = 'Hybrid',
  PHEV = 'PHEV',
  ICE = 'ICE',
}

export enum RepairStage {
  PRE_REPAIR = 'Pre-repair only',
  DURING_REPAIR = 'During repair',
  REPAIR_COMPLETE = 'Repair complete',
}

export enum FaultCategory {
  OIL_LEAK = 'Oil leaks or seepage',
  ECU_SENSOR = 'ECU or sensor internal faults',
  SOFTWARE_UPDATE = 'Software updates or program refreshes',
  BATTERY_HV = 'Battery and high-voltage (HV) components',
  CHARGING_SYSTEM = 'Charging system faults',
  POWERTRAIN_CHASSIS_BODY = 'Powertrain, chassis or body component faults',
  GENERAL_OTHER = 'General / other (Tier 1 only)',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

export enum FlagReasonCode {
  MISSING_SHOT = 'MISSING_SHOT',
  UNREADABLE_VIN = 'UNREADABLE_VIN',
  WRONG_ANGLE = 'WRONG_ANGLE',
  NO_SERIAL = 'NO_SERIAL',
  NO_DTC = 'NO_DTC',
  VIDEO_TOO_SHORT = 'VIDEO_TOO_SHORT',
  POOR_LIGHTING_BLUR = 'POOR_LIGHTING_BLUR',
  INCORRECT_MEDIA_TYPE = 'INCORRECT_MEDIA_TYPE',
  OTHER = 'OTHER',
}
