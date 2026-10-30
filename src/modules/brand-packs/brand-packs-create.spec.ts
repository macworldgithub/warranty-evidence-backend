jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => {},
  Prop: () => () => {},
  Schema: () => () => {},
  SchemaFactory: { createForClass: () => ({}) },
}));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));

import { BrandPacksService } from './brand-packs.service';
import { BrandPacksController } from './brand-packs.controller';

describe('Create brand packs', () => {
  function setup(common: unknown = { rules: [{ id: 'common-rule' }] }) {
    const saved: any[] = [];
    const packModel: any = jest.fn().mockImplementation((data) => ({
      save: async () => { saved.push(data); return { toObject: () => data }; },
    }));
    packModel.findOne = jest.fn((query) => query.id
      ? { lean: async () => common }
      : { sort: () => ({ lean: async () => null }) });
    const brandModel: any = { findOne: jest.fn(() => ({ lean: async () => ({ id: 'brand_chery', name: 'Chery' }) })) };
    return { service: new BrandPacksService(packModel, brandModel), saved, brandModel };
  }

  it('creates unique drafts for the selected brand without copying BYD rules', async () => {
    const { service } = setup();
    const dto = { brandId: 'brand_chery', name: ' Chery requirements ', template: 'blank' };
    const first = await service.create(dto);
    const second = await service.create(dto);
    expect(first).toMatchObject({ brandId: 'brand_chery', brandName: 'Chery', name: 'Chery requirements', status: 'DRAFT', version: 1, rules: [] });
    expect(second.id).not.toBe(first.id);
  });

  it('copies the common template only when requested', async () => {
    const { service } = setup();
    expect((await service.create({ brandId: 'brand_chery', name: 'Checklist', template: 'common' })).rules).toEqual([{ id: 'common-rule' }]);
  });

  it('rejects whitespace names and unknown brands', async () => {
    const { service, brandModel } = setup();
    await expect(service.create({ brandId: 'brand_chery', name: ' ' })).rejects.toThrow('required');
    brandModel.findOne.mockReturnValue({ lean: async () => null });
    await expect(service.create({ brandId: 'missing', name: 'Checklist' })).rejects.toThrow('active OEM brand');
  });

  it('reports a missing common template without creating a pack', async () => {
    const { service, saved } = setup(null);
    await expect(service.create({ brandId: 'brand_chery', name: 'Checklist', template: 'common' })).rejects.toThrow('unavailable');
    expect(saved).toHaveLength(0);
  });

  it('rejects non-admin creation requests', async () => {
    const service: any = { create: jest.fn() };
    const auth: any = { resolveUserFromAuthorization: async () => ({ role: 'TECHNICIAN' }) };
    await expect(new BrandPacksController(service, auth).create({ brandId: 'brand_chery', name: 'Checklist' }, 'Bearer test')).rejects.toThrow('Only administrators');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('does not archive a live pack if saving the replacement fails', async () => {
    const packModel: any = {
      findOne: async () => ({ status: 'DRAFT', rules: [{}], name: 'Checklist', validate: async () => {}, save: async () => { throw new Error('Database unavailable'); } }),
      updateMany: jest.fn(),
    };
    const service = new BrandPacksService(packModel, {} as any);
    await expect(service.publish('draft')).rejects.toThrow('Database unavailable');
    expect(packModel.updateMany).not.toHaveBeenCalled();
  });

  it('prevents publishing an empty draft', async () => {
    const packModel: any = { findOne: async () => ({ status: 'DRAFT', rules: [] }), updateMany: jest.fn() };
    await expect(new BrandPacksService(packModel, {} as any).publish('draft')).rejects.toThrow('at least one');
    expect(packModel.updateMany).not.toHaveBeenCalled();
  });
});
