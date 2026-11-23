jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined, Prop: () => () => undefined, Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));
jest.mock('../brand-packs/brand-packs.service', () => ({ BrandPacksService: class {} }));
jest.mock('../../common/storage/storage.service', () => ({ StorageService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../voice-to-tech/voice-to-tech.service', () => ({ VoiceToTechService: class {} }));
jest.mock('../sites/sites.service', () => ({ SitesService: class {} }));

import { BadRequestException } from '@nestjs/common';
import { WarrantyCasesService } from './warranty-cases.service';
import { VEHICLE_PHOTO_CATEGORIES } from './vehicle-photos';

const uploaded = VEHICLE_PHOTO_CATEGORIES.filter(photo => photo.isMandatory).map(photo => ({
  ruleKey: photo.ruleKey, mediaType: 'image', storageUrl: '/uploads/' + photo.ruleKey + '.jpg',
}));
function setup(evidenceItems: any[]) {
  const document: any = { roNumber: 'RO123', id: 'case', status: 'Uploading', evidenceItems, flagHistory: [], checklistSummary: {}, markModified: jest.fn() };
  document.save = jest.fn().mockResolvedValue({ toObject: () => document });
  const service = new WarrantyCasesService(
    { findOne: jest.fn().mockResolvedValue(document) } as never,
    { find: () => ({ lean: async () => [] }) } as never,
    {} as never, { uploadFile: async (_buffer: Buffer, _mime: string, filename: string) => ({
      url: '/uploads/' + filename, oemFileName: filename,
    }) } as never, { sendNewTicketRaisedAlert: async () => undefined, sendNewTicketPushToAdmins: async () => undefined } as never, {} as never, {} as never,
  );
  return { service, document };
}
describe('defect photo uploads', () => {
  it.each([
    ['fault_closeup', 'FaultCloseup'],
    ['fault_location', 'FaultLocation'],
  ])('stores separate %s photos and updates only the photo with the same ID', async (ruleKey, descriptor) => {
    const { service, document } = setup([]);
    const file = { buffer: Buffer.from('photo'), mimetype: 'image/jpeg' } as Express.Multer.File;
    await service.uploadEvidence('case', file, ruleKey, 'First', undefined, undefined, 'photo-1');
    await service.uploadEvidence('case', file, ruleKey, 'Second', undefined, undefined, 'photo-2');
    await service.uploadEvidence('case', file, ruleKey, 'Retake', undefined, undefined, 'photo-1');

    expect(document.evidenceItems.map(({ id, name, storageUrl }) => ({ id, name, storageUrl }))).toEqual([
      { id: 'photo-1', name: 'Retake', storageUrl: `/uploads/RO123${descriptor}_photo-1.jpg` },
      { id: 'photo-2', name: 'Second', storageUrl: `/uploads/RO123${descriptor}_photo-2.jpg` },
    ]);
  });
});

describe('server vehicle photo completion gates', () => {
  it.each(VEHICLE_PHOTO_CATEGORIES.filter(photo => photo.isMandatory))('blocks workshop submission without $name', async photo => {
    const { service, document } = setup(uploaded.filter(item => item.ruleKey !== photo.ruleKey));
    await expect(service.submitFromWorkshop('case')).rejects.toThrow(photo.name);
    expect(document.save).not.toHaveBeenCalled();
    expect(document.status).toBe('Uploading');
  });
  it('rejects local file paths even if the client says the checklist is ready', async () => {
    const { service, document } = setup(uploaded.map(item => ({ ...item, storageUrl: 'file:///phone.jpg' })));
    document.checklistSummary.isReadyForSubmission = true;
    await expect(service.submitFromWorkshop('case')).rejects.toBeInstanceOf(BadRequestException);
    expect(document.save).not.toHaveBeenCalled();
  });
  it('allows seven uploaded photos with no optional MODIFICATIONS photo', async () => {
    const { service, document } = setup(uploaded);
    const result = await service.submitFromWorkshop('case');
    expect(result.status).toBe('Awaiting Review');
    expect(document.checklistSummary).toMatchObject({ totalMandatory: 7, completedMandatory: 7, isReadyForSubmission: true });
  });
  it('blocks OEM completion for a historical incomplete record', async () => {
    const { service, document } = setup(uploaded.slice(1));
    await expect(service.markSubmitted('case', {} as never)).rejects.toThrow('FRONT');
    expect(document.save).not.toHaveBeenCalled();
  });
  it('preserves rejected-evidence blocking when all seven photos exist', async () => {
    // Separate fixture to verify that unresolved flags still block completion.
    const fixture = setup(uploaded);
    fixture.document.flagHistory = [{ evidenceRuleKey: 'vin_photo', reasonCode: 'BLURRY', instruction: 'Retake' }];
    await expect(fixture.service.submitFromWorkshop('case')).rejects.toThrow('reject reason');
    expect(fixture.document.save).not.toHaveBeenCalled();
  });
});
