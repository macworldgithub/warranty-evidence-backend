jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined, Prop: () => () => undefined, Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));
import { BadRequestException, ConflictException } from '@nestjs/common';
import { HoistsService } from './hoists.service';

describe('numbered workshop hoists', () => {
  function setup() {
    const model = { updateOne: jest.fn().mockResolvedValue({}), findOneAndUpdate: jest.fn(() => ({ lean: async () => null as any })) };
    return { model, service: new HoistsService(model as never, {} as never) };
  }
  it('synchronizes exactly Hoist 1-11 in each existing workshop', async () => {
    const { model, service } = setup();
    await service.seedDefaultHoists();
    const seeds = model.updateOne.mock.calls.filter((call: any[]) => call[2]?.upsert) as any[][];
    for (const facility of ['hyundai_chery', 'byd_kia']) {
      const hoists = seeds.filter(call => call[1].$setOnInsert.facility === facility);
      expect(hoists.map(call => call[1].$setOnInsert.hoistNumber)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
      expect(hoists.map(call => call[1].$set.name)).toEqual(Array.from({ length: 11 }, (_, i) => `Hoist ${i + 1}`));
    }
    const southland = seeds.map(call => call[1].$setOnInsert).filter(hoist => hoist.facility === 'southland');
    expect(southland).toHaveLength(30);
    expect(southland.filter(hoist => hoist.facilityName === 'Main Workshop')).toHaveLength(22);
    expect(southland.filter(hoist => hoist.facilityName === 'Holding Yard')).toHaveLength(3);
    expect(southland.filter(hoist => hoist.facilityName === 'Used Car Reco')).toHaveLength(5);
    expect(new Set(southland.map(hoist => hoist.id)).size).toBe(30);
    const gwm = seeds.map(call => call[1].$setOnInsert).filter(hoist => hoist.facility === 'dandenong_gwm');
    expect(gwm.map(hoist => hoist.hoistNumber)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
    expect(gwm.every(hoist => hoist.siteId === 'site_dandenong_gwm')).toBe(true);
    expect(seeds).toHaveLength(63);
  });
  it('renames existing records without resetting safety status or deleting audit history', async () => {
    const { model, service } = setup();
    await service.seedDefaultHoists();
    expect(model.updateOne).toHaveBeenCalledWith({ id: 'hoist_sm_hc_01' }, {
      $set: { name: 'Hoist 1' }, $setOnInsert: expect.objectContaining({ status: 'OPERATIONAL', hoistNumber: 1 }),
    }, { upsert: true });
    expect(model.updateOne).toHaveBeenCalledWith({ id: 'hoist_sm_bk_12' }, { $set: { isActive: false } });
  });
  it('resynchronizes an already populated inventory', async () => {
    const { model, service } = setup();
    await service.seedDefaultHoists(); await service.seedDefaultHoists();
    expect(model.updateOne).toHaveBeenCalledTimes(128);
  });
  it('requires a vehicle or job reference', async () => {
    const { model, service } = setup();
    await expect(service.assign('hoist', { jobNumber: ' ', vehicleRego: '' }, 'staff')).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('atomically assigns only a vacant operational hoist and normalizes registration', async () => {
    const { model, service } = setup();
    model.findOneAndUpdate.mockReturnValue({ lean: async () => ({ id: 'hoist' }) });
    await service.assign('hoist', { jobNumber: ' RO123 ', vehicleRego: ' abc123 ' }, 'staff');
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({
      id: 'hoist', isActive: true, status: 'OPERATIONAL',
      $or: [
        { facility: 'southland', hoistNumber: { $gte: 1 } },
        { facility: { $ne: 'southland' }, hoistNumber: { $gte: 1, $lte: 11 } },
      ],
      lockoutTagoutActive: { $ne: true }, assignment: null,
    }, { $set: { assignment: expect.objectContaining({ jobNumber: 'RO123', vehicleRego: 'ABC123', assignedBy: 'staff' }) } }, { returnDocument: 'after' });
  });
  it('rejects occupied or unavailable hoists without overwriting the assignment', async () => {
    const { service } = setup();
    await expect(service.assign('hoist', { vehicleRego: 'ABC123' }, 'staff')).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not release a different assignment after a stale screen action', async () => {
    const { model, service } = setup();
    await expect(service.release('hoist', 'old-assignment')).rejects.toBeInstanceOf(ConflictException);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ id: 'hoist', 'assignment.id': 'old-assignment' }, { $unset: { assignment: '' } }, { returnDocument: 'after' });
  });
});
