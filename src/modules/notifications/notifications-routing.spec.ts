jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => {}, Prop: () => () => {}, Schema: () => () => {}, SchemaFactory: { createForClass: () => ({}) } }));
jest.mock('nodemailer', () => ({}));
jest.mock('firebase-admin/app', () => ({ getApps: () => [], initializeApp: jest.fn(), cert: jest.fn() }));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationsService } from './notifications.service';

describe('Firebase project routing', () => {
  const oldProject = 'booranwarranty-b8a0a';
  const newProject = 'booranwarranty-41945';
  const message = { title: 'Test', body: 'Test' };
  function setup(devices: any[] = []) {
    process.env.FIREBASE_PROJECT_ID = oldProject;
    process.env.FIREBASE_IOS_PROJECT_ID = newProject;
    const model: any = { find: jest.fn(() => ({ lean: async () => devices.length ? [{ id: 'user', fcmTokens: devices }] : [] })), updateMany: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) };
    const service = new NotificationsService(model);
    const android = { name: 'android' };
    const ios = { name: 'ios' };
    (service as any).firebaseApp = android;
    (service as any).iosFirebaseApp = ios;
    const send = jest.spyOn(service as any, 'sendProjectPush').mockResolvedValue({ success: true });
    return { service, model, send, android, ios };
  }
  it('splits Android and new iOS tokens between projects', async () => {
    const { service, send, android, ios } = setup([{ token: 'a', platform: 'android' }, { token: 'i', platform: 'ios', firebaseProjectId: newProject }]);
    expect((await service.sendPushNotification({ ...message, tokens: ['a', 'i'] })).success).toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ tokens: ['a'] }), android);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ tokens: ['i'] }), ios);
  });
  it('preserves old iOS registrations on the original project', async () => {
    const { service, send, android } = setup([{ token: 'legacy', platform: 'ios' }]);
    await service.sendPushNotification({ ...message, tokens: ['legacy'] });
    expect(send).toHaveBeenCalledWith(expect.anything(), android);
  });
  it('allows iOS testing without registration and propagates dry run', async () => {
    const { service, send, ios } = setup();
    await service.sendTestPushNotification({ ...message, token: 'test', platform: 'ios', dryRun: true });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ tokens: ['test'], dryRun: true }), ios);
  });
  it('sends topic messages through both projects', async () => {
    const { service, send } = setup();
    await service.sendPushNotification({ ...message, topic: 'broadcast' });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('does not fall back to Android when iOS is unavailable', async () => {
    const { service, send } = setup();
    (service as any).iosFirebaseApp = null;
    expect((await service.sendPushNotification({ ...message, tokens: ['i'], platform: 'ios' })).success).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('records project metadata on new iOS registrations', async () => {
    const { service, model } = setup();
    await service.registerDeviceToken('user', 'i', 'ios');
    expect(model.updateOne).toHaveBeenCalledWith({ id: 'user' }, expect.objectContaining({ $push: { fcmTokens: expect.objectContaining({ firebaseProjectId: newProject }) } }));
  });
  it('removes only the logged-out token and unsubscribes in its project', async () => {
    const { service, model, ios } = setup([{ token: 'i', platform: 'ios', firebaseProjectId: newProject }]);
    const unsubscribeFromTopic = jest.fn(async () => ({}));
    (getMessaging as jest.Mock).mockReturnValue({ unsubscribeFromTopic });
    await service.unregisterDeviceToken('i', 'user');
    expect(getMessaging).toHaveBeenCalledWith(ios);
    expect(unsubscribeFromTopic).toHaveBeenCalledWith(['i'], 'tech-user');
    expect(model.updateMany).toHaveBeenCalledWith({ id: 'user' }, { $pull: { fcmTokens: { token: 'i' } } });
  });
  it('does not send case updates to a fallback topic after logout', async () => {
    const { service, send } = setup();
    await service.sendCaseAcceptedPushToTechnician({ id: 'c', roNumber: 'r', claimNumber: 'x' }, 'user');
    expect(send).not.toHaveBeenCalled();
  });
});
