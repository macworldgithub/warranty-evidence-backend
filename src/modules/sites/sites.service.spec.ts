jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined, Prop: () => () => undefined, Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));
import { SitesService } from './sites.service';

describe('Dandenong GWM brand authorization', () => {
  it('adds GWM to the affected rooftop without replacing existing brand authorizations', async () => {
    const model = { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    await new SitesService(model as never).ensureGwmBrandForDandenong();
    expect(model.updateMany).toHaveBeenCalledWith(
      { id: { $in: ['site_dandenong_2027', 'site_dandenong_gwm'] } },
      { $addToSet: { authorizedBrandIds: 'brand_gwm' } },
    );
  });
});
