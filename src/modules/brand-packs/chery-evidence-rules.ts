import type { EvidenceRuleSubdocument as BrandPackRule } from '../../schemas/brand-pack.schema';
// Source: chery_evidence_rules_template.csv supplied for the Chery flow.
// All 20 rows are Tier 1, mandatory, with Trigger=None; preserve those flags.
export const CHERY_EVIDENCE_RULES: BrandPackRule[] = [
  {
    "id": "chery_vin_presentation",
    "ruleKey": "vin_presentation",
    "name": "VIN at time of presentation",
    "description": "Clear photo or record of VIN plate or digital readout at presentation",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_VIN.jpg",
    "guidanceText": "Clear photo or record of VIN plate or digital readout at presentation"
  },
  {
    "id": "chery_odometer_presentation",
    "ruleKey": "odometer_presentation",
    "name": "Odometer reading at time of presentation",
    "description": "Clear photo of odometer reading at time of presentation",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Odometer.jpg",
    "guidanceText": "Clear photo of odometer reading at time of presentation"
  },
  {
    "id": "chery_customer_complaint",
    "ruleKey": "customer_complaint",
    "name": "Clear description of the customer complaint",
    "description": "Written clear description of the customer complaint",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Complaint.txt",
    "guidanceText": "Written clear description of the customer complaint"
  },
  {
    "id": "chery_fault_description",
    "ruleKey": "fault_description",
    "name": "Clear description of the fault",
    "description": "Written clear description of the fault",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Fault.txt",
    "guidanceText": "Written clear description of the fault"
  },
  {
    "id": "chery_cause_description",
    "ruleKey": "cause_description",
    "name": "Clear description of the cause",
    "description": "Written clear description of the cause",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Cause.txt",
    "guidanceText": "Written clear description of the cause"
  },
  {
    "id": "chery_correction_description",
    "ruleKey": "correction_description",
    "name": "Clear description of the correction",
    "description": "Written clear description of the correction performed",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Correction.txt",
    "guidanceText": "Written clear description of the correction performed"
  },
  {
    "id": "chery_diagnostic_findings",
    "ruleKey": "diagnostic_findings",
    "name": "Technician diagnostic findings",
    "description": "Technician diagnostic findings report or notes",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Diagnostics.pdf",
    "guidanceText": "Technician diagnostic findings report or notes"
  },
  {
    "id": "chery_technician_reports",
    "ruleKey": "technician_reports",
    "name": "Technician reports",
    "description": "Full technician reports",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_TechReport.pdf",
    "guidanceText": "Full technician reports"
  },
  {
    "id": "chery_test_results",
    "ruleKey": "test_results",
    "name": "Technician test results",
    "description": "Technician test results",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_TestResults.pdf",
    "guidanceText": "Technician test results"
  },
  {
    "id": "chery_measurements",
    "ruleKey": "measurements",
    "name": "Technician measurements",
    "description": "Technician measurements and readings",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Measurements.pdf",
    "guidanceText": "Technician measurements and readings"
  },
  {
    "id": "chery_failure_images",
    "ruleKey": "failure_images",
    "name": "Clear images of the failure",
    "description": "Clear images of the failure",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_Failure.jpg",
    "guidanceText": "Clear images of the failure"
  },
  {
    "id": "chery_failure_location_images",
    "ruleKey": "failure_location_images",
    "name": "Clear images of the failure location",
    "description": "Clear images showing the location of the failure",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_FailureLocation.jpg",
    "guidanceText": "Clear images showing the location of the failure"
  },
  {
    "id": "chery_failure_extent_images",
    "ruleKey": "failure_extent_images",
    "name": "Clear images of the failure extent",
    "description": "Clear images showing the extent of the failure",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_FailureExtent.jpg",
    "guidanceText": "Clear images showing the extent of the failure"
  },
  {
    "id": "chery_affected_component_images",
    "ruleKey": "affected_component_images",
    "name": "Clear images of the affected component",
    "description": "Clear images of the affected component",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_AffectedComponent.jpg",
    "guidanceText": "Clear images of the affected component"
  },
  {
    "id": "chery_failed_part_images",
    "ruleKey": "failed_part_images",
    "name": "Images of the failed part",
    "description": "Images of the failed part",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_FailedPart.jpg",
    "guidanceText": "Images of the failed part"
  },
  {
    "id": "chery_displaced_part_images",
    "ruleKey": "displaced_part_images",
    "name": "Images of the displaced part",
    "description": "Images of the displaced part",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_DisplacedPart.jpg",
    "guidanceText": "Images of the displaced part"
  },
  {
    "id": "chery_part_barcode",
    "ruleKey": "part_barcode",
    "name": "Part barcode (where applicable)",
    "description": "Clear image of the part barcode where applicable",
    "mediaType": "image",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_PartBarcode.jpg",
    "guidanceText": "Clear image of the part barcode where applicable"
  },
  {
    "id": "chery_fault_video",
    "ruleKey": "fault_video",
    "name": "Video where fault or operation cannot be demonstrated through photographs",
    "description": "Video demonstrating the fault or operation that cannot be shown in photos",
    "mediaType": "video",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_FaultVideo.mp4",
    "guidanceText": "Video demonstrating the fault or operation that cannot be shown in photos"
  },
  {
    "id": "chery_tech_time_records",
    "ruleKey": "tech_time_records",
    "name": "Technician time/clocking records",
    "description": "Technician time and clocking records",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_TimeRecords.pdf",
    "guidanceText": "Technician time and clocking records"
  },
  {
    "id": "chery_warranty_policy_other",
    "ruleKey": "warranty_policy_other",
    "name": "Anything else the Warranty Policy and Procedure v2.0 requires",
    "description": "Any additional evidence required by Warranty Policy and Procedure v2.0",
    "mediaType": "document",
    "tier": 1,
    "isMandatory": true,
    "namingConvention": "[DealerRONumber]_AdditionalEvidence.pdf",
    "guidanceText": "Any additional evidence required by Warranty Policy and Procedure v2.0"
  }
];
