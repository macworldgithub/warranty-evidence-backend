export const VEHICLE_PHOTO_CATEGORIES = [
  { ruleKey: 'front_vehicle_photo', name: 'FRONT', description: 'Full front of the vehicle, including the number plate.', isMandatory: true },
  { ruleKey: 'rear_vehicle_photo', name: 'REAR', description: 'Full rear of the vehicle, including the number plate.', isMandatory: true },
  { ruleKey: 'odometer_photo', name: 'ODO/DASH', description: 'Dashboard with the odometer reading clearly visible.', isMandatory: true },
  { ruleKey: 'vin_photo', name: 'VIN PLATE', description: 'VIN plate with all characters clearly readable.', isMandatory: true },
  { ruleKey: 'engine_bay_photo', name: 'ENGINE BAY', description: 'Open engine bay or front electronics compartment.', isMandatory: true },
  // Preserve existing Australian passenger/driver side evidence keys.
  { ruleKey: 'passenger_side_photo', name: 'LEFT SIDE', description: 'Full left side, looking forward from inside the vehicle.', isMandatory: true },
  { ruleKey: 'driver_side_photo', name: 'RIGHT SIDE', description: 'Full right side, looking forward from inside the vehicle.', isMandatory: true },
  { ruleKey: 'modifications_photo', name: 'MODIFICATIONS', description: 'Any vehicle modifications, if applicable.', isMandatory: false },
] as const;


// Presentation evidence fulfils the same VIN/odometer walkaround photo.
export const vehiclePhotoKey = (key: string) =>
  key === 'vin_presentation' ? 'vin_photo' : key === 'odometer_presentation' ? 'odometer_photo' : key;
export const evidenceRuleKeysMatch = (left: string, right: string) => vehiclePhotoKey(left) === vehiclePhotoKey(right);

type PhotoEvidence = { ruleKey: string; mediaType?: string; fileUri?: string; storageUrl?: string; serverUrl?: string; qualityStatus?: string };
export function hasVehiclePhoto(item?: PhotoEvidence, uploadedOnly = false): boolean {
  if (!item || item.mediaType !== 'image' || item.qualityStatus === 'FAILED') return false;
  const urls = uploadedOnly ? [item.storageUrl, item.serverUrl] : [item.fileUri, item.storageUrl, item.serverUrl];
  return urls.some(url => !!url?.trim() && (!uploadedOnly || /^(https?:\/\/|\/uploads\/)/i.test(url)));
}
export function missingVehiclePhotos(items: readonly PhotoEvidence[], uploadedOnly = false) {
  return VEHICLE_PHOTO_CATEGORIES.filter(category => category.isMandatory &&
    !items.some(item => evidenceRuleKeysMatch(item.ruleKey, category.ruleKey) && hasVehiclePhoto(item, uploadedOnly)));
}
