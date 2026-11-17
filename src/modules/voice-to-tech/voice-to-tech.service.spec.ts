import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { VoiceToTechService } from './voice-to-tech.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));

const send = jest.mocked(axios.post);
const config = (key: string) => ({ get: () => key }) as unknown as ConfigService;
afterEach(() => jest.resetAllMocks());

it('distinguishes an unconfigured provider from a recording with no speech', async () => {
  const audio = Buffer.from('test audio');
  const unconfigured = new VoiceToTechService(config(''));
  send.mockResolvedValue({ data: { results: { channels: [] } } });
  await expect(unconfigured.transcribeBuffer(audio, 'audio/webm')).resolves.toMatchObject({
    requiresManualEntry: true,
    failureReason: 'not_configured',
  });
  expect(send).not.toHaveBeenCalled();

  const configured = new VoiceToTechService(config('test-key'));
  await expect(configured.transcribeBuffer(audio, 'audio/webm')).resolves.toMatchObject({
    requiresManualEntry: true,
    failureReason: 'no_speech',
  });
});

it('reports a provider failure without returning provider error details', async () => {
  const service = new VoiceToTechService(config('test-key'));
  send.mockRejectedValue(new Error('Provider request failed'));
  await expect(service.transcribeBuffer(Buffer.from('test audio'), 'audio/mp4')).resolves.toMatchObject({
    transcript: '',
    requiresManualEntry: true,
    failureReason: 'provider_error',
  });
});
