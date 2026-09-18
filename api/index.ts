import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';

const server: Express = express();
let isReady = false;
let appInstance: any = null;

async function bootstrap(): Promise<void> {
  if (isReady) return;

  // Support base64 image and payload data
  server.use(express.json({ limit: '25mb' }));
  server.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Root health check & API info
  server.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'online',
      service: 'Booran Warranty Evidence & Review API',
      version: '1.0.0',
      apiDocs: '/api/docs',
      apiPrefix: '/api/v1',
      timestamp: new Date().toISOString(),
    });
  });

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Booran Warranty Evidence Capture & Review API')
    .setDescription(
      `Workshop-First Multi-Brand Warranty Evidence & Review Portal API
Classification: Booran Motor Group · OmniSuiteAI Internal`,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Booran Warranty API Docs · OmniSuiteAI',
    customCss: `
      .swagger-ui .topbar { background-color: #081225; border-bottom: 2px solid #1a56db; }
      .swagger-ui .info .title { color: #1a56db; }
    `,
  });

  await app.init();
  appInstance = app;
  isReady = true;
}

export default async function handler(req: Request, res: Response) {
  try {
    await bootstrap();
    server(req, res);
  } catch (err: any) {
    console.error('NestJS Vercel Serverless Bootstrap Error:', err);
    res.status(500).json({
      statusCode: 500,
      error: 'Vercel Function Error',
      message: err?.message || 'Failed to initialize NestJS application on Vercel',
      hint: !process.env.MONGODB_URI
        ? 'MONGODB_URI is missing in Vercel Environment Variables. Please add it in your Vercel Project Settings.'
        : undefined,
    });
  }
}
