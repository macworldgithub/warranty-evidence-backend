jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => {}, Prop: () => () => {}, Schema: () => () => {},
  SchemaFactory: { createForClass: () => ({}) },
}));

import { BrandPacksService } from './brand-packs.service';
import { CHERY_EVIDENCE_RULES } from './chery-evidence-rules';
import { FaultCategory, RepairStage } from '../../common/enums';

describe('Chery pack installation and evaluation', () => {
  function setup(existing: any[] = []) {
    const packs = [...existing];
    const packModel: any = {
      countDocuments: async () => 2,
      findOne: jest.fn(query => {
        const matches = packs.filter(pack => Object.entries(query).every(([key, value]) => pack[key] === value));
        return { lean: async () => matches[0] || null, sort: () => ({ lean: async () => matches.sort((a, b) => b.version - a.version)[0] || null }) };
      }),
      updateOne: jest.fn(async (query, update) => {
        if (!packs.some(pack => pack.id === query.id)) packs.push(update.$setOnInsert);
      }),
    };
    const brandModel: any = { updateOne: jest.fn() };
    return { service: new BrandPacksService(packModel, brandModel), packs, packModel, brandModel };
  }

  it('installs on an already populated database and is idempotent on restart', async () => {
    const { service, packs, packModel, brandModel } = setup();
    await service.onModuleInit();
    await service.onModuleInit();
    expect(packs).toHaveLength(1);
    expect(packs[0]).toMatchObject({ brandId: 'brand_chery', status: 'PUBLISHED', rules: CHERY_EVIDENCE_RULES });
    expect(packModel.updateOne).toHaveBeenCalledTimes(1);
    expect(brandModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'brand_chery' }),
      expect.objectContaining({ $set: expect.objectContaining({ activeBrandPackId: 'brandpack_chery_v1' }) }),
    );
  });

  it('preserves a published administrator pack and an archived template', async () => {
    for (const pack of [
      { id: 'custom_chery', brandId: 'brand_chery', status: 'PUBLISHED' },
      { id: 'brandpack_chery_v1', brandId: 'brand_chery', status: 'ARCHIVED' },
    ]) {
      const { service, packModel } = setup([pack]);
      await service.onModuleInit();
      expect(packModel.updateOne).not.toHaveBeenCalled();
    }
  });

  it('keeps all template rows mandatory regardless of BYD conditional switches', async () => {
    const { service } = setup();
    await service.onModuleInit();
    for (const enabled of [false, true]) {
      const result = await service.evaluateRules({
        brandId: 'brand_chery', faultCategory: FaultCategory.GENERAL_OTHER,
        partReplaced: enabled, noiseFault: enabled, diagnosticsAvailable: enabled,
        repairStage: enabled ? RepairStage.REPAIR_COMPLETE : RepairStage.PRE_REPAIR,
      });
      expect(result).toMatchObject({ brandPackId: 'brandpack_chery_v1', resolvedRules: CHERY_EVIDENCE_RULES, mandatoryCount: 20, optionalCount: 0 });
    }
  });
});
