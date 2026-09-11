import {
  Controller,
  Post,
  Get,
  Query,
  Res,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  VoiceToTechService,
  TranscribeAudioDto,
  TranscriptionResponseDto,
} from './voice-to-tech.service';

@ApiTags('Voice to Tech (Technician Dictation)')
@Controller('voice-to-tech')
export class VoiceToTechController {
  constructor(private readonly voiceService: VoiceToTechService) {}

  // ─── Status & Config ─────────────────────────────────────────────────────
  @Get('status')
  @ApiOperation({ summary: 'Check Deepgram service configuration & status' })
  getStatus() {
    const hasKey = !!this.voiceService.getApiKey();
    return {
      status: hasKey ? 'ready' : 'missing_api_key',
      engine: 'Deepgram Nova-2',
      language: 'en-AU',
      endpoints: {
        restJson: 'POST /api/v1/voice-to-tech/transcribe',
        restUpload: 'POST /api/v1/voice-to-tech/transcribe/upload',
        sseStream: 'GET /api/v1/voice-to-tech/stream?audioUrl=...',
        liveWebSocket: 'ws://localhost:4000/api/v1/voice-to-tech/live',
        interactiveDemo: 'GET /api/v1/voice-to-tech/demo',
        token: 'GET /api/v1/voice-to-tech/token',
      },
    };
  }

  @Get('token')
  @ApiOperation({ summary: 'Get Deepgram streaming configuration & token for direct client connection' })
  getToken() {
    const key = this.voiceService.getApiKey();
    return {
      configured: !!key,
      key,
      url: 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-AU&smart_format=true&punctuate=true&interim_results=true',
    };
  }

  // ─── Option C: Real-Time SSE Stream for Audio URL ─────────────────────────
  @Get('stream')
  @ApiOperation({
    summary: 'Stream transcription for an audio URL in real-time via Server-Sent Events (SSE)',
    description: `Connect via EventSource or curl -N to stream transcript chunks in real time without timeouts.
Returns SSE events:
- \`data: {"transcript": "...", "is_final": false, "confidence": 98}\`
- \`data: {"type": "done", "transcript": "..."}\``,
  })
  @ApiQuery({
    name: 'audioUrl',
    required: true,
    example: 'https://static.deepgram.com/examples/interview_speech-analytics.wav',
  })
  async streamAudioUrl(
    @Query('audioUrl') audioUrl: string,
    @Res() res: Response,
  ) {
    if (!audioUrl) {
      throw new BadRequestException('audioUrl query parameter is required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const fullWords: string[] = [];

    try {
      res.write(`data: ${JSON.stringify({ type: 'start', message: 'Connecting to Deepgram stream...' })}\n\n`);

      await this.voiceService.streamAudioUrl(audioUrl, (chunk) => {
        if (chunk.is_final && chunk.transcript) {
          fullWords.push(chunk.transcript);
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          fullTranscript: fullWords.join(' ').trim(),
        })}\n\n`,
      );
      res.end();
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: err.message ?? 'Streaming error',
        })}\n\n`,
      );
      res.end();
    }
  }

  // ─── Interactive Demo HTML Page ───────────────────────────────────────────
  @Get('demo')
  @ApiOperation({ summary: 'Interactive Deepgram Live & URL Streaming Test UI' })
  getDemo(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(DEMO_HTML);
  }

  // ─── Option A: JSON body — audioUrl or audioBase64 ───────────────────────
  @Post('transcribe')
  @ApiOperation({
    summary: 'Transcribe workshop audio via Deepgram Nova-2 (JSON — audioUrl or audioBase64)',
    description: `Send either:
- \`audioUrl\` — a publicly accessible audio file URL
- \`audioBase64\` — base64-encoded audio with or without data URI prefix

Returns transcript, confidence score, and duration.
If Deepgram is unreachable, returns \`requiresManualEntry: true\` so the mobile app shows a keyboard — capture is never blocked.`,
  })
  @ApiResponse({ status: 201, type: TranscriptionResponseDto })
  async transcribe(@Body() dto: TranscribeAudioDto): Promise<TranscriptionResponseDto> {
    return this.voiceService.transcribe(dto);
  }

  // ─── Option B: multipart/form-data — raw audio file from mobile browser ──
  @Post('transcribe/upload')
  @ApiOperation({
    summary: 'Transcribe workshop audio via Deepgram Nova-2 (multipart — direct file upload)',
    description: `Upload a raw audio file directly as \`multipart/form-data\`.
Accepts: webm, mp4, mp3, wav, m4a, ogg.
This is the preferred method from the mobile PWA — the browser records audio as a Blob and sends it directly without base64 encoding overhead.`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (webm, mp4, mp3, wav, m4a, ogg) — max 25 MB',
        },
        technicianName: {
          type: 'string',
          example: 'Jake Smith',
          description: 'Technician name to tag the note (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: TranscriptionResponseDto })
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'audio/webm',
          'audio/mp4',
          'video/mp4',   // some browsers label audio recordings as video/mp4
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/m4a',
          'audio/x-m4a',
          'audio/ogg',
          'application/ogg',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Audio type "${file.mimetype}" not supported. Send webm, mp4, mp3, wav, m4a, or ogg.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async transcribeUpload(
    @UploadedFile() audio: Express.Multer.File,
    @Body('technicianName') technicianName?: string,
  ): Promise<TranscriptionResponseDto> {
    if (!audio) {
      throw new BadRequestException(
        'No audio file received. Send the file as multipart/form-data field named "audio".',
      );
    }

    // Pass buffer directly to service — no base64 conversion needed
    return this.voiceService.transcribeBuffer(audio.buffer, audio.mimetype);
  }
}

const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booran Voice-to-Tech · Real-Time Deepgram Streaming Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090e17;
      --card: #111a2e;
      --card-border: #1e2c4d;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #06b6d4;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      padding: 32px 16px;
      display: flex;
      justify-content: center;
    }
    .container { max-width: 1020px; width: 100%; }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 12px;
    }
    .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    p.subtitle { color: var(--text-muted); font-size: 14px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media (min-width: 860px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .card h2 { font-size: 18px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .card p.desc { color: var(--text-muted); font-size: 13px; margin-bottom: 18px; line-height: 1.4; }
    label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
    input[type="text"] {
      width: 100%;
      background: #0d1527;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 12px;
      color: #fff;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 12px;
    }
    .presets { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .btn-chip {
      background: #18233c;
      border: 1px solid var(--card-border);
      color: var(--accent);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-chip:hover { background: #223254; border-color: var(--accent); }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 18px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s, transform 0.05s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn:hover { background: var(--primary-hover); }
    .btn:active { transform: scale(0.98); }
    .btn-stop { background: var(--danger) !important; }
    .btn-stop:hover { background: #dc2626 !important; }
    .meter-container {
      background: #080d19;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      height: 12px;
      overflow: hidden;
      margin: 14px 0 10px 0;
      position: relative;
    }
    .meter-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 70%, #f59e0b 100%);
      transition: width 0.08s ease-out;
    }
    .transcript-box {
      background: #080d19;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px;
      min-height: 130px;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 14px;
      font-size: 14px;
      line-height: 1.6;
    }
    .transcript-final { color: #f8fafc; font-weight: 500; }
    .transcript-interim { color: #38bdf8; font-style: italic; margin-left: 4px; }
    .transcript-placeholder { color: #475569; font-style: italic; }
    .log-strip {
      margin-top: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--accent);
      display: flex;
      justify-content: space-between;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
      margin-right: 6px;
    }
    .status-active { background: var(--success); box-shadow: 0 0 10px var(--success); }
    .status-recording { background: var(--danger); animation: pulse 0.8s infinite; }
    .debug-box {
      background: #070b14;
      border: 1px solid #182238;
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #94a3b8;
      max-height: 90px;
      overflow-y: auto;
    }
    .debug-line { margin-bottom: 2px; }
    .debug-line.err { color: #f87171; }
    .debug-line.ok { color: #34d399; }
    .endpoints-footer {
      margin-top: 28px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px 24px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .endpoints-footer code {
      font-family: 'JetBrains Mono', monospace;
      color: #38bdf8;
      background: #090e17;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">
        <span class="badge-dot"></span>
        Deepgram Nova-2 Engine · Australian English (en-AU)
      </div>
      <h1>Booran Voice-to-Tech Streaming Test</h1>
      <p class="subtitle">Live microphone dictation via WebSocket and Audio URL streaming via SSE</p>
    </div>

    <div class="grid">
      <!-- Card 1: URL Stream (SSE) -->
      <div class="card">
        <h2>🌊 Audio URL Stream (SSE)</h2>
        <p class="desc">Streams transcript chunks live via Server-Sent Events without waiting for the full file download or hitting timeouts.</p>

        <label for="audioUrlInput">Audio URL</label>
        <input type="text" id="audioUrlInput" value="https://static.deepgram.com/examples/interview_speech-analytics.wav" />

        <div class="presets">
          <span style="font-size: 11px; color: var(--text-muted); align-self: center;">Presets:</span>
          <button class="btn-chip" onclick="setPreset('https://static.deepgram.com/examples/interview_speech-analytics.wav')">96s Interview</button>
          <button class="btn-chip" onclick="setPreset('https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav')">17s Clip</button>
        </div>

        <button id="sseBtn" class="btn" onclick="toggleSSEStream()">
          <span>▶️ Start Streaming Audio</span>
        </button>

        <div class="transcript-box" id="sseTranscriptBox">
          <span class="transcript-placeholder">Click "Start Streaming Audio" to watch words stream in real-time...</span>
        </div>

        <div class="log-strip">
          <span id="sseStatus"><span class="status-dot" id="sseDot"></span>Idle</span>
          <span id="sseStats">0 chunks</span>
        </div>
      </div>

      <!-- Card 2: Live Mic Stream (WebSocket) -->
      <div class="card">
        <h2>🎙️ Live Microphone Dictation (WebSocket)</h2>
        <p class="desc">Connects to <code>/api/v1/voice-to-tech/live</code>. Streams your voice with instant interim words.</p>

        <!-- Visual Audio Level Meter -->
        <label>Microphone Input Level</label>
        <div class="meter-container">
          <div class="meter-bar" id="micMeterBar"></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; color: var(--text-muted);">
          <span id="micDeviceLabel">Device: Click Start to detect</span>
          <span id="micVolPercent">0%</span>
        </div>

        <button id="micBtn" class="btn" onclick="toggleMicStream()">
          <span>🎤 Start Dictation (Live WS)</span>
        </button>

        <div class="transcript-box" id="micTranscriptBox">
          <span class="transcript-placeholder">Click "Start Dictation", allow microphone access, and speak...</span>
        </div>

        <div class="log-strip">
          <span id="micStatus"><span class="status-dot" id="micDot"></span>Ready to start</span>
          <span id="micStats">0 words</span>
        </div>

        <!-- Debug diagnostics log -->
        <div class="debug-box" id="micDebugBox">
          <div class="debug-line">System ready. Click "Start Dictation" above.</div>
        </div>
      </div>
    </div>

    <div class="endpoints-footer">
      <strong>Available Streaming Endpoints:</strong>
      <ul style="margin-top: 8px; margin-left: 20px; line-height: 1.8;">
        <li>WebSocket (Live Dictation): <code>ws://localhost:4000/api/v1/voice-to-tech/live</code></li>
        <li>Server-Sent Events (URL Stream): <code>GET /api/v1/voice-to-tech/stream?audioUrl=...</code></li>
        <li>REST (JSON Payload): <code>POST /api/v1/voice-to-tech/transcribe</code> (timeout: 120s)</li>
      </ul>
    </div>
  </div>

  <script>
    function logDebug(msg, type) {
      const box = document.getElementById('micDebugBox');
      const time = new Date().toTimeString().split(' ')[0];
      const div = document.createElement('div');
      div.className = 'debug-line ' + (type || '');
      div.innerText = '[' + time + '] ' + msg;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }

    // ── Preset Selector ──────────────────────────────────
    function setPreset(url) {
      document.getElementById('audioUrlInput').value = url;
    }

    // ── Option 1: Server-Sent Events (SSE) Stream ────────
    let sseSource = null;
    function toggleSSEStream() {
      const btn = document.getElementById('sseBtn');
      const box = document.getElementById('sseTranscriptBox');
      const status = document.getElementById('sseStatus');
      const dot = document.getElementById('sseDot');
      const stats = document.getElementById('sseStats');
      const urlInput = document.getElementById('audioUrlInput').value.trim();

      if (sseSource) {
        sseSource.close();
        sseSource = null;
        btn.innerHTML = '<span>▶️ Start Streaming Audio</span>';
        btn.classList.remove('btn-stop');
        dot.className = 'status-dot';
        status.innerText = 'Stopped';
        return;
      }

      if (!urlInput) {
        alert('Please enter an audio URL');
        return;
      }

      box.innerHTML = '';
      btn.innerHTML = '<span>⏹️ Stop Streaming</span>';
      btn.classList.add('btn-stop');
      dot.className = 'status-dot status-active';
      status.innerText = 'Connecting...';

      let chunkCount = 0;
      let finalContent = '';

      const sseUrl = '/api/v1/voice-to-tech/stream?audioUrl=' + encodeURIComponent(urlInput);
      sseSource = new EventSource(sseUrl);

      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'start') {
            status.innerText = 'Streaming audio...';
            return;
          }
          if (data.type === 'done') {
            status.innerText = 'Complete ✅';
            dot.className = 'status-dot';
            btn.innerHTML = '<span>▶️ Start Streaming Audio</span>';
            btn.classList.remove('btn-stop');
            sseSource.close();
            sseSource = null;
            return;
          }
          if (data.type === 'error') {
            box.innerHTML += '<div style="color:#ef4444; margin-top:8px;">Error: ' + data.error + '</div>';
            sseSource.close();
            sseSource = null;
            btn.innerHTML = '<span>▶️ Start Streaming Audio</span>';
            btn.classList.remove('btn-stop');
            return;
          }

          if (data.transcript) {
            chunkCount++;
            stats.innerText = chunkCount + ' chunks';
            if (data.is_final) {
              finalContent += (finalContent ? ' ' : '') + data.transcript;
              box.innerHTML = '<span class="transcript-final">' + finalContent + '</span>';
            } else {
              box.innerHTML = '<span class="transcript-final">' + finalContent + '</span>' +
                              '<span class="transcript-interim"> ' + data.transcript + '</span>';
            }
            box.scrollTop = box.scrollHeight;
          }
        } catch (e) {
          console.error(e);
        }
      };

      sseSource.onerror = () => {
        status.innerText = 'Finished / Disconnected';
        dot.className = 'status-dot';
        btn.innerHTML = '<span>▶️ Start Streaming Audio</span>';
        btn.classList.remove('btn-stop');
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }
      };
    }

    // ── Option 2: Live WebSocket Mic Stream ──────────────
    let micWs = null;
    let mediaRecorder = null;
    let audioStream = null;
    let audioContext = null;
    let analyserNode = null;
    let animFrame = null;
    let clientKeepAlive = null;

    async function toggleMicStream() {
      const btn = document.getElementById('micBtn');

      if (micWs || mediaRecorder) {
        stopMicStream();
        return;
      }

      const box = document.getElementById('micTranscriptBox');
      const status = document.getElementById('micStatus');
      const dot = document.getElementById('micDot');
      const stats = document.getElementById('micStats');

      logDebug('Requesting microphone access...');
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        const track = audioStream.getAudioTracks()[0];
        document.getElementById('micDeviceLabel').innerText = 'Mic: ' + (track.label || 'Default Microphone');
        logDebug('Microphone access granted: ' + (track.label || 'Active'), 'ok');
      } catch (err) {
        logDebug('Microphone error: ' + err.message, 'err');
        alert('Microphone access error: ' + err.message + '\\nPlease ensure microphone permissions are allowed in your browser.');
        return;
      }

      // Setup audio level meter
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(audioStream);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);

        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        const updateMeter = () => {
          if (!analyserNode) return;
          analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          document.getElementById('micMeterBar').style.width = pct + '%';
          document.getElementById('micVolPercent').innerText = pct + '%';
          animFrame = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (e) {
        logDebug('Volume meter init warning: ' + e.message);
      }

      box.innerHTML = '';
      btn.innerHTML = '<span>⏹️ Stop Dictation</span>';
      btn.classList.add('btn-stop');
      dot.className = 'status-dot status-recording';
      status.innerText = 'Connecting to Deepgram stream...';

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = proto + '//' + location.host + '/api/v1/voice-to-tech/live';
      logDebug('Connecting to live WebSocket gateway: ' + wsUrl, 'ok');

      micWs = new WebSocket(wsUrl);

      let fullFinal = '';
      let totalWords = 0;
      let chunksSent = 0;

      micWs.onopen = () => {
        logDebug('Live stream connected! Starting audio recorder...', 'ok');
        status.innerText = 'Listening live 🎙️ (Speak now)';

        // Periodic KeepAlive every 3 seconds to prevent timeout
        clientKeepAlive = setInterval(() => {
          if (micWs && micWs.readyState === WebSocket.OPEN) {
            micWs.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 3000);

        // Determine best supported mimeType
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
        logDebug('Audio encoding: ' + (mimeType || 'default'));

        try {
          mediaRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);

          mediaRecorder.ondataavailable = async (e) => {
            if (e.data && e.data.size > 0 && micWs && micWs.readyState === WebSocket.OPEN) {
              const arrayBuffer = await e.data.arrayBuffer();
              micWs.send(arrayBuffer);
              chunksSent++;
              if (chunksSent === 1) {
                logDebug('First audio chunk transmitted (' + arrayBuffer.byteLength + ' bytes)', 'ok');
              }
            }
          };

          mediaRecorder.onerror = (recErr) => {
            logDebug('MediaRecorder error: ' + recErr.error?.message, 'err');
          };

          // Capture 250ms audio slices for low latency
          mediaRecorder.start(250);
          logDebug('Streaming microphone chunks (250ms slices)...', 'ok');

        } catch (recInitErr) {
          logDebug('Failed to start MediaRecorder: ' + recInitErr.message, 'err');
        }
      };

      micWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          let text = '';
          let isFinal = false;
          let confidence = 98;

          if (data.channel?.alternatives?.[0]) {
            text = (data.channel.alternatives[0].transcript || '').trim();
            isFinal = data.is_final ?? false;
            confidence = Math.round((data.channel.alternatives[0].confidence ?? 0) * 100);
          } else if (data.type === 'transcript') {
            text = (data.transcript || '').trim();
            isFinal = data.is_final ?? false;
            confidence = data.confidence ?? 98;
          } else if (data.type === 'connected') {
            logDebug('Deepgram session confirmed: ' + data.message, 'ok');
            return;
          }

          if (text) {
            if (isFinal) {
              fullFinal += (fullFinal ? ' ' : '') + text;
              totalWords = fullFinal.split(/\\s+/).filter(Boolean).length;
              stats.innerText = totalWords + ' words (' + confidence + '% conf)';
              box.innerHTML = '<span class="transcript-final">' + fullFinal + '</span>';
              logDebug('Transcribed: "' + text + '" (' + confidence + '%)', 'ok');
            } else {
              box.innerHTML = '<span class="transcript-final">' + fullFinal + '</span>' +
                              '<span class="transcript-interim"> ' + text + '</span>';
            }
            box.scrollTop = box.scrollHeight;
          } else if (data.error) {
            logDebug('Server error: ' + data.error, 'err');
          }
        } catch (e) {
          console.error(e);
        }
      };

      micWs.onerror = (e) => {
        logDebug('WebSocket encountered an error', 'err');
        status.innerText = 'WS Error';
        dot.className = 'status-dot';
      };

      micWs.onclose = (e) => {
        logDebug('WebSocket closed (code: ' + e.code + ', reason: ' + (e.reason || 'normal') + ')');
        status.innerText = 'Disconnected';
        dot.className = 'status-dot';
        btn.innerHTML = '<span>🎤 Start Dictation (Live WS)</span>';
        btn.classList.remove('btn-stop');
        cleanupAudio();
      };
    }

    function cleanupAudio() {
      if (clientKeepAlive) {
        clearInterval(clientKeepAlive);
        clientKeepAlive = null;
      }
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
      }
      analyserNode = null;
      document.getElementById('micMeterBar').style.width = '0%';
      document.getElementById('micVolPercent').innerText = '0%';
    }

    function stopMicStream() {
      const btn = document.getElementById('micBtn');
      logDebug('Stopping dictation...');

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch (e) {}
        mediaRecorder = null;
      }
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
      }
      if (micWs && micWs.readyState === WebSocket.OPEN) {
        micWs.send(JSON.stringify({ type: 'CloseStream' }));
        setTimeout(() => {
          if (micWs) micWs.close();
          micWs = null;
        }, 600);
      } else {
        micWs = null;
      }

      cleanupAudio();
      btn.innerHTML = '<span>🎤 Start Dictation (Live WS)</span>';
      btn.classList.remove('btn-stop');
      document.getElementById('micStatus').innerText = 'Stopped';
      document.getElementById('micDot').className = 'status-dot';
    }
  </script>
</body>
</html>
`;


