import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

@Injectable()
export class VoiceToTechGateway
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(VoiceToTechGateway.name);
  private wss: WebSocketServer | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer();
    if (!server) {
      this.logger.error('HTTP server not available to attach WebSocket server');
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/api/v1/voice-to-tech/live',
    });

    this.wss.on('connection', (clientWs: WebSocket) => {
      this.handleClientConnection(clientWs);
    });

    this.logger.log(
      '🎙️ Voice to Tech live WebSocket streaming gateway listening at /api/v1/voice-to-tech/live',
    );
  }

  private handleClientConnection(clientWs: WebSocket) {
    const apiKey = this.config.get<string>('DEEPGRAM_KEY');
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({ error: 'DEEPGRAM_KEY not configured on server' }),
      );
      clientWs.close(1008, 'DEEPGRAM_KEY missing');
      return;
    }

    this.logger.log('Client connected to live voice stream');

    const queryParams = new URLSearchParams({
      model: 'nova-2',
      language: 'en-AU',
      punctuate: 'true',
      smart_format: 'true',
      interim_results: 'true',
      endpointing: '300',
      diarize: 'true',
      filler_words: 'false',
      channels: '1',
      encoding: 'linear16',
      sample_rate: '16000',
    }).toString();

    let dgWs: WebSocket | null = null;
    let isDgOpen = false;
    const pendingBuffer: Buffer[] = [];
    let keepAliveInterval: any = null;

    const cleanup = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    };

    try {
      dgWs = new WebSocket(`wss://api.deepgram.com/v1/listen?${queryParams}`, {
        headers: { Authorization: `Token ${apiKey}` },
      });

      // Keep connection alive every 8 seconds (matching VMA keepalive)
      keepAliveInterval = setInterval(() => {
        if (dgWs && dgWs.readyState === WebSocket.OPEN) {
          dgWs.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 8000);

      dgWs.on('open', () => {
        isDgOpen = true;
        this.logger.log('Deepgram live connection established (linear16 / 16000Hz)');
        dgWs!.send(JSON.stringify({ type: 'KeepAlive' }));

        clientWs.send(
          JSON.stringify({
            type: 'connected',
            message:
              'Deepgram Nova-2 live stream ready (Linear16 16kHz). Start speaking.',
          }),
        );

        // Flush any buffered chunks
        while (pendingBuffer.length > 0) {
          const chunk = pendingBuffer.shift();
          if (chunk && dgWs && dgWs.readyState === WebSocket.OPEN) {
            dgWs.send(chunk);
          }
        }
      });

    // Client -> Deepgram: forward audio chunks or control messages
    clientWs.on('message', (data: any, isBinary: boolean) => {
      const isBin = isBinary || Buffer.isBuffer(data);

      if (isBin) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        if (isDgOpen && dgWs && dgWs.readyState === WebSocket.OPEN) {
          dgWs.send(buf);
        } else {
          pendingBuffer.push(buf);
        }
      } else {
        try {
          const parsed = JSON.parse(data.toString());
          if (
            parsed.type === 'CloseStream' ||
            parsed.action === 'stop' ||
            parsed.type === 'close'
          ) {
            if (dgWs && dgWs.readyState === WebSocket.OPEN) {
              dgWs.send(JSON.stringify({ type: 'CloseStream' }));
            }
          } else if (parsed.type === 'KeepAlive') {
            if (dgWs && dgWs.readyState === WebSocket.OPEN) {
              dgWs.send(JSON.stringify({ type: 'KeepAlive' }));
            }
          }
        } catch {
          if (dgWs && dgWs.readyState === WebSocket.OPEN) {
            dgWs.send(data);
          }
        }
      }
    });

    // Deepgram -> Client: forward transcription events (matching VMA structure)
    dgWs.on('message', (msg: any) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          const parsed = JSON.parse(msg.toString());
          const alt = parsed?.channel?.alternatives?.[0];
          const transcript: string = alt?.transcript ?? '';
          const isFinal: boolean = parsed?.is_final === true;
          const speaker: number | undefined = alt?.words?.[0]?.speaker;

          // Guard: ignore empty transcripts (matching VMA)
          if (!transcript.trim()) return;

          clientWs.send(
            JSON.stringify({
              type: isFinal ? 'final' : 'interim',
              transcript: transcript.trim(),
              is_final: isFinal,
              speech_final: parsed.speech_final ?? false,
              confidence: Math.round((alt.confidence ?? 0) * 100 * 10) / 10,
              speaker,
              words: alt.words ?? [],
            }),
          );
        } catch {
          clientWs.send(msg.toString());
        }
      }
    });

    clientWs.on('close', (code, reason) => {
      cleanup();
      this.logger.log(`Client disconnected from live stream (code: ${code})`);
      if (dgWs.readyState === WebSocket.OPEN) {
        try {
          dgWs.send(JSON.stringify({ type: 'CloseStream' }));
          dgWs.close();
        } catch {}
      }
    });

    dgWs.on('close', (code, reason) => {
      cleanup();
      this.logger.log(`Deepgram WS closed (code: ${code}, reason: ${reason?.toString()})`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'stream_closed',
            code,
            reason: reason?.toString(),
          }),
        );
        clientWs.close();
      }
    });

    dgWs.on('error', (err) => {
      cleanup();
      this.logger.error(`Deepgram streaming error: ${err.message}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', error: err.message }));
      }
    });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Deepgram WebSocket: ${err.message}`);
      clientWs.send(JSON.stringify({ type: 'error', error: err.message }));
      clientWs.close();
    }
  }

  onApplicationShutdown() {
    if (this.wss) {
      this.wss.close();
    }
  }
}
