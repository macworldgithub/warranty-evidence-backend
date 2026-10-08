import { BulletinsController, BulletinsService } from './bulletins.module';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
  MongooseModule: { forFeature: () => class {} },
}));

jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('../auth/auth.module', () => ({ AuthModule: class {} }));
jest.mock('../brands/brands.service', () => ({ BrandsService: class {} }));
jest.mock('../brands/brands.module', () => ({ BrandsModule: class {} }));
jest.mock('../../common/storage/storage.service', () => ({ StorageService: class {} }));
jest.mock('../../common/storage/storage.module', () => ({ StorageModule: class {} }));

describe('Manufacturer bulletin lifecycle', () => {
  const dto = { brandId: 'brand_byd', title: ' Official bulletin ', bulletinNumber: ' BYD-001 ', issueDate: '2026-10-01', effectiveDate: '2026-10-06' };
  const file = { buffer: Buffer.from('%PDF-1.7\n'), size: 9, mimetype: 'application/pdf' } as Express.Multer.File;
  const chain = (result: unknown) => ({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(result) });
  function setup() {
    const model = { create: jest.fn().mockImplementation(data => Promise.resolve(data)), find: jest.fn().mockReturnValue(chain([])), findOne: jest.fn().mockReturnValue(chain(null)), findOneAndUpdate: jest.fn().mockReturnValue(chain(null)) };
    const storage = { uploadFile: jest.fn().mockResolvedValue({ url: '/uploads/bulletin.pdf' }), deleteFile: jest.fn().mockResolvedValue(undefined), getReadUrl: jest.fn().mockResolvedValue('https://download.test/bulletin.pdf') };
    const brands = { findOne: jest.fn().mockResolvedValue({ id: dto.brandId }) };
    return { service: new BulletinsService(model as never, storage as never, brands as never), model, storage, brands };
  }
  it('stores metadata and creates only a draft', async () => {
    const { service, storage, brands } = setup();
    const result = await service.create(dto, file, 'admin_1');
    expect(brands.findOne).toHaveBeenCalledWith('brand_byd');
    expect(storage.uploadFile).toHaveBeenCalled();
    expect(result).toMatchObject({ title: 'Official bulletin', bulletinNumber: 'BYD-001', status: 'DRAFT', createdBy: 'admin_1', issueDate: dto.issueDate, effectiveDate: dto.effectiveDate });
  });
  it.each([undefined, { ...file, mimetype: 'image/png' }, { ...file, buffer: Buffer.from('not pdf') }, { ...file, size: 21 * 1024 * 1024 }])('rejects missing, invalid or oversized documents', async invalid => {
    const { service, storage } = setup();
    await expect(service.create(dto, invalid as Express.Multer.File, 'admin')).rejects.toThrow('Attach a PDF');
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });
  it('removes the uploaded attachment if metadata saving fails', async () => {
    const { service, model, storage } = setup();
    model.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.create(dto, file, 'admin')).rejects.toThrow('database unavailable');
    expect(storage.deleteFile).toHaveBeenCalledWith('/uploads/bulletin.pdf');
  });
  it('scopes technician lists to manufacturer and published status', async () => {
    const { service, model } = setup();
    await service.list('brand_byd');
    expect(model.find).toHaveBeenCalledWith({ brandId: 'brand_byd', status: 'PUBLISHED' });
    await service.list(undefined, true);
    expect(model.find).toHaveBeenLastCalledWith({});
  });
  it('publishes and withdraws without deleting documents', async () => {
    const { service, model } = setup();
    model.findOneAndUpdate.mockReturnValue(chain({ id: 'b1' }));
    await service.publish('b1', true);
    expect(model.findOneAndUpdate).toHaveBeenLastCalledWith({ id: 'b1' }, { $set: { status: 'PUBLISHED', publishedAt: expect.any(Date) } }, { new: true });
    await service.publish('b1', false);
    expect(model.findOneAndUpdate).toHaveBeenLastCalledWith({ id: 'b1' }, { $set: { status: 'DRAFT', publishedAt: null } }, { new: true });
  });
  it('does not open drafts for technicians and returns a short-lived read URL for published documents', async () => {
    const { service, model, storage } = setup();
    await expect(service.document('b1', false)).rejects.toThrow('Published bulletin not found');
    expect(model.findOne).toHaveBeenCalledWith({ id: 'b1', status: 'PUBLISHED' });
    model.findOne.mockReturnValue(chain({ pdfUrl: '/uploads/bulletin.pdf' }));
    await expect(service.document('b1', false)).resolves.toEqual({ url: 'https://download.test/bulletin.pdf' });
    expect(storage.getReadUrl).toHaveBeenCalledWith('/uploads/bulletin.pdf', 900);
  });
  it('blocks upload, publication and draft listing before service access for non-admins', async () => {
    const auth = { assertAdmin: jest.fn().mockRejectedValue(new Error('Administrator access required')), resolveUserFromAuthorization: jest.fn() };
    const service = { create: jest.fn(), publish: jest.fn(), list: jest.fn() };
    const controller = new BulletinsController(service as never, auth as never);
    await expect(controller.create('tech-token', dto, file)).rejects.toThrow('Administrator');
    await expect(controller.publish('tech-token', 'b1')).rejects.toThrow('Administrator');
    await expect(controller.unpublish('tech-token', 'b1')).rejects.toThrow('Administrator');
    await expect(controller.list('tech-token', undefined, 'true')).rejects.toThrow('Administrator');
    expect(service.create).not.toHaveBeenCalled(); expect(service.publish).not.toHaveBeenCalled(); expect(service.list).not.toHaveBeenCalled();
  });
});
