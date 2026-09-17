import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectAudioMimeType(buffer: Buffer, fallbackMime?: string): string {
  if (buffer && buffer.length >= 12) {
    // WAV: 'RIFF' ... 'WAVE'
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
      return 'audio/wav';
    }
    // OGG: 'OggS'
    if (buffer.toString('ascii', 0, 4) === 'OggS') {
      return 'audio/ogg';
    }
    // FLAC: 'fLaC'
    if (buffer.toString('ascii', 0, 4) === 'fLaC') {
      return 'audio/flac';
    }
    // MP3 ID3: 'ID3'
    if (buffer.toString('ascii', 0, 3) === 'ID3') {
      return 'audio/mpeg';
    }
    // MP4 / M4A: '....ftyp'
    if (buffer.toString('ascii', 4, 8) === 'ftyp') {
      return 'audio/mp4';
    }
    // WebM / EBML: 0x1A 0x45 0xDF 0xA3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return 'audio/webm';
    }
    // MP3 sync word: 0xFF followed by 0xFB, 0xF3, 0xF2, 0xE0..
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
      return 'audio/mpeg';
    }
  }

  if (
    fallbackMime &&
    fallbackMime !== 'application/octet-stream' &&
    fallbackMime !== 'audio/*' &&
    fallbackMime.includes('/')
  ) {
    return fallbackMime;
  }
  return 'audio/m4a';
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class TranscribeAudioDto {
  @ApiPropertyOptional({
    example: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    description: 'Publicly accessible audio URL (mp3, mp4, wav, webm, m4a, ogg)',
  })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({
    example: 'data:audio/webm;base64,GkXfo59...',
    description: 'Base64-encoded audio with or without data URI prefix',
  })
  @IsOptional()
  @IsString()
  audioBase64?: string;

  @ApiPropertyOptional({ example: 'Jake Smith' })
  @IsOptional()
  @IsString()
  technicianName?: string;
}

export class TranscriptionResponseDto {
  @ApiProperty({
    example: 'Inspected underbody battery casing. Zero physical impact damage. Traced coolant leak to inlet hose barb clamp.',
  })
  transcript: string;

  @ApiProperty({ example: 97.8, description: 'Confidence score 0–100' })
  confidence: number;

  @ApiProperty({ example: 15.4 })
  durationSeconds: number;

  @ApiProperty({ example: 'nova-2' })
  model: string;

  @ApiProperty({ example: 'Deepgram Nova-2' })
  engine: string;

  @ApiPropertyOptional({
    example: false,
    description: 'True when transcription failed — mobile app should show keyboard fallback',
  })
  requiresManualEntry?: boolean;
}

// ─── Deepgram REST response shape ─────────────────────────────────────────────

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: Array<{ end?: number }>;
      }>;
    }>;
  };
  metadata?: {
    duration?: number;
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VoiceToTechService {
  private readonly logger = new Logger(VoiceToTechService.name);
  private readonly DEEPGRAM_API = 'https://api.deepgram.com/v1/listen';

  // Deepgram query params — nova-2 is best for accuracy + noisy environments
  private readonly QUERY_PARAMS = new URLSearchParams({
    model: 'nova-2',
    language: 'en-AU',
    smart_format: 'true',
    punctuate: 'true',
    filler_words: 'false',  // remove "um", "uh" — cleaner workshop notes
    diarize: 'false',
  }).toString();

  constructor(private readonly config: ConfigService) {}

  async transcribe(dto: TranscribeAudioDto): Promise<TranscriptionResponseDto> {
    const apiKey = this.config.get<string>('DEEPGRAM_KEY');

    if (!apiKey) {
      this.logger.warn('DEEPGRAM_KEY not set — returning manual entry fallback');
      return this.manualFallback('DEEPGRAM_KEY not configured');
    }

    const headers = {
      Authorization: `Token ${apiKey}`,
    };

    try {
      // ── Option A: transcribe from URL ──────────────────────────────────────
      if (dto.audioUrl) {
        let isLocal = false;
        let localFilePath: string | null = null;

        // Check if URL points to local uploads or localhost
        if (dto.audioUrl.startsWith('/uploads/') || dto.audioUrl.startsWith('uploads/')) {
          isLocal = true;
          localFilePath = path.join(process.cwd(), dto.audioUrl.startsWith('/') ? dto.audioUrl.slice(1) : dto.audioUrl);
        } else if (dto.audioUrl.startsWith('file://')) {
          isLocal = true;
          localFilePath = dto.audioUrl.replace(/^file:\/\//, '');
        } else if (
          dto.audioUrl.includes('localhost') ||
          dto.audioUrl.includes('127.0.0.1') ||
          dto.audioUrl.includes('10.0.2.2') ||
          dto.audioUrl.includes('192.168.')
        ) {
          const uploadsIndex = dto.audioUrl.indexOf('/uploads/');
          if (uploadsIndex !== -1) {
            isLocal = true;
            localFilePath = path.join(process.cwd(), dto.audioUrl.slice(uploadsIndex + 1));
          }
        }

        if (isLocal && localFilePath && fs.existsSync(localFilePath)) {
          this.logger.log(`Transcribing local audio file from disk: ${localFilePath}`);
          const buffer = fs.readFileSync(localFilePath);
          const mimeType = detectAudioMimeType(buffer, 'audio/m4a');
          return this.transcribeBuffer(buffer, mimeType);
        }

        this.logger.log(`Transcribing audio URL via Deepgram: ${dto.audioUrl}`);

        try {
          const { data } = await axios.post<DeepgramResponse>(
            `${this.DEEPGRAM_API}?${this.QUERY_PARAMS}`,
            { url: dto.audioUrl },
            {
              headers: { ...headers, 'Content-Type': 'application/json' },
              timeout: 120000,
            },
          );
          return this.buildResponse(data);
        } catch (urlErr: any) {
          // If Deepgram cloud failed to fetch the URL, try downloading it locally and streaming the buffer
          this.logger.warn(`Deepgram URL fetch failed (${urlErr.message}), falling back to direct buffer download...`);
          const dlRes = await axios.get(dto.audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
          const buffer = Buffer.from(dlRes.data);
          const headerContentType = dlRes.headers['content-type'];
          const mimeType = detectAudioMimeType(
            buffer,
            typeof headerContentType === 'string' ? headerContentType : undefined,
          );
          return this.transcribeBuffer(buffer, mimeType);
        }
      }

      // ── Option B: transcribe from base64 ──────────────────────────────────
      else if (dto.audioBase64) {
        this.logger.log('Transcribing audio from base64 payload via Deepgram');

        let rawMime = '';
        if (dto.audioBase64.startsWith('data:')) {
          const match = dto.audioBase64.match(/data:([^;]+);/);
          if (match) rawMime = match[1];
        }

        const base64Data = dto.audioBase64.includes(',')
          ? dto.audioBase64.split(',')[1]
          : dto.audioBase64;

        const audioBuffer = Buffer.from(base64Data, 'base64');
        const mimeType = detectAudioMimeType(audioBuffer, rawMime);

        return this.transcribeBuffer(audioBuffer, mimeType);
      }

      // ── Neither provided ───────────────────────────────────────────────────
      else {
        return this.manualFallback('No audio source provided — send audioUrl or audioBase64');
      }

    } catch (err: any) {
      const msg = err?.response?.data?.err_msg ?? err?.message ?? 'Unknown error';
      this.logger.error(`Deepgram transcription failed: ${msg}`);
      return this.manualFallback(msg);
    }
  }

  // ─── Transcribe from raw buffer (used by multipart upload endpoint) ────────
  async transcribeBuffer(
    buffer: Buffer,
    mimeType: string,
  ): Promise<TranscriptionResponseDto> {
    const apiKey = this.config.get<string>('DEEPGRAM_KEY');

    if (!apiKey) {
      this.logger.warn('DEEPGRAM_KEY not set — returning manual entry fallback');
      return this.manualFallback('DEEPGRAM_KEY not configured');
    }

    const effectiveMime = detectAudioMimeType(buffer, mimeType);

    try {
      this.logger.log(`Transcribing ${buffer.length} byte audio buffer (${effectiveMime}) via Deepgram`);

      const { data } = await axios.post<DeepgramResponse>(
        `${this.DEEPGRAM_API}?${this.QUERY_PARAMS}`,
        buffer,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': effectiveMime,
          },
          timeout: 120000,
        },
      );

      return this.buildResponse(data);

    } catch (err: any) {
      const msg = err?.response?.data?.err_msg ?? err?.message ?? 'Unknown error';
      this.logger.error(`Deepgram buffer transcription failed: ${msg}`);
      return this.manualFallback(msg);
    }
  }

  getApiKey(): string | undefined {
    return this.config.get<string>('DEEPGRAM_KEY');
  }

  // ─── Stream audio URL directly to Deepgram WebSocket for real-time SSE ────
  async streamAudioUrl(
    audioUrl: string,
    onChunk: (chunk: { transcript: string; is_final: boolean; confidence: number; words?: any[] }) => void,
  ): Promise<void> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('DEEPGRAM_KEY not configured');
    }

    const wsUrl = `wss://api.deepgram.com/v1/listen?${this.QUERY_PARAMS}&interim_results=true`;
    // dynamically require ws
    const WebSocket = require('ws');

    return new Promise(async (resolve, reject) => {
      let isResolved = false;
      const safeResolve = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      try {
        const ws = new WebSocket(wsUrl, {
          headers: { Authorization: `Token ${apiKey}` },
        });

        ws.on('open', async () => {
          this.logger.log(`Live streaming audio URL to Deepgram: ${audioUrl}`);
          try {
            const response = await axios({
              method: 'get',
              url: audioUrl,
              responseType: 'stream',
              timeout: 60000,
            });

            response.data.on('data', (chunk: Buffer) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunk);
              }
            });

            response.data.on('end', () => {
              this.logger.log('Finished streaming audio file to Deepgram, sending CloseStream');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'CloseStream' }));
              }
            });

            response.data.on('error', (err: any) => {
              this.logger.error(`Audio download error: ${err.message}`);
              if (ws.readyState === WebSocket.OPEN) ws.close();
              if (!isResolved) {
                isResolved = true;
                reject(err);
              }
            });
          } catch (fetchErr) {
            if (ws.readyState === WebSocket.OPEN) ws.close();
            if (!isResolved) {
              isResolved = true;
              reject(fetchErr);
            }
          }
        });

        ws.on('message', (msg: any) => {
          try {
            const data = JSON.parse(msg.toString());
            const alt = data?.channel?.alternatives?.[0];
            if (alt && (alt.transcript || data.is_final)) {
              onChunk({
                transcript: alt.transcript ?? '',
                is_final: data.is_final ?? false,
                confidence: Math.round((alt.confidence ?? 0) * 100 * 10) / 10,
                words: alt.words,
              });
            }
          } catch (e) {
            // non-json or metadata message
          }
        });

        ws.on('close', () => {
          this.logger.log('Deepgram live stream closed successfully');
          safeResolve();
        });

        ws.on('error', (err: any) => {
          this.logger.error(`Deepgram WebSocket error: ${err.message}`);
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        });

      } catch (err) {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      }
    });
  }

  // ─── Build standardised response from Deepgram REST response ──────────────
  private buildResponse(data: DeepgramResponse): TranscriptionResponseDto {
    const alternative = data?.results?.channels?.[0]?.alternatives?.[0];

    if (!alternative?.transcript) {
      this.logger.warn('Deepgram returned empty transcript');
      return this.manualFallback('Empty transcript returned');
    }

    const transcript = alternative.transcript.trim();
    const confidence = Math.round((alternative.confidence ?? 0) * 100 * 10) / 10;
    const words = alternative.words ?? [];
    const durationSeconds =
      data?.metadata?.duration ??
      (words.length > 0 ? words[words.length - 1]?.end ?? 0 : 0);

    this.logger.log(
      `Transcription complete — "${transcript.substring(0, 60)}..." | ${confidence}% confidence | ${durationSeconds}s`,
    );

    return {
      transcript,
      confidence,
      durationSeconds: Math.round((durationSeconds as number) * 10) / 10,
      model: 'nova-2',
      engine: 'Deepgram Nova-2',
      requiresManualEntry: false,
    };
  }

  // ─── Graceful fallback — capture is never blocked by voice service ─────────
  private manualFallback(reason: string): TranscriptionResponseDto {
    this.logger.warn(`Voice to Tech fallback triggered: ${reason}`);
    return {
      transcript: '',
      confidence: 0,
      durationSeconds: 0,
      model: 'nova-2',
      engine: 'Deepgram Nova-2',
      requiresManualEntry: true,
    };
  }
}
