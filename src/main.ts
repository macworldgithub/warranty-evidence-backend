import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve Champions League CRM Frontend UI if present
  const frontendPath = path.resolve(__dirname, '../../frontend');
  app.use(express.static(frontendPath));
  app.use('/portal', express.static(frontendPath));

  // Enable CORS for frontend and mobile PWA
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Support base64 image and camera photo uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Global prefix for API endpoints
  app.setGlobalPrefix('api/v1');

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Booran Warranty Evidence Capture & Review API')
    .setDescription(
      `
## GOOD SHOWROOM · AFTERSALES MODULE
### Workshop-First Multi-Brand Warranty Evidence & Review Portal API

This API powers:
1. **Technician Mobile PWA**: Guided evidence capture, VIN/Odometer OCR verification, Voice to Tech dictation, and mandatory gate enforcement.
2. **Warranty Review Portal**: Clerk inbox, checklist verification, inline media player, flagging with structured reason codes, and OEM-named submission ZIP/PDF exports.
3. **Group Admin & Management**: Dynamic Brand Pack rules engine (seeded with BYD Attachment A), rooftop scoping, and failure analytics.

**Classification:** Booran Motor Group · OmniSuiteAI Internal
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication & Role Access', 'User roles (Group Admin, Warranty Clerk, Service Manager, Tech)')
    .addTag('Sites & Rooftops', 'Dealership rooftop scoping (Cranbourne, Dandenong, Cheltenham, Berwick)')
    .addTag('Brands & OEM Rosters', 'Brand management (BYD, Hyundai, Kia, MG, Chery, Toyota, Ford)')
    .addTag('Brand Packs & Rules Engine', 'BYD Attachment A rules, fault categories, and dynamic evidence gates')
    .addTag('Warranty Cases (CRM & Review Portal)', 'Case lifecycle (Draft -> Awaiting Review -> Flagged -> Submitted)')
    .addTag('Vehicle Identification & RedBooks VIN', 'VIN decoding and vehicle identity fast path')
    .addTag('Voice to Tech (Technician Dictation)', 'Speech-to-text integration with Australian workshop model')
    .addTag('Submission Pack & OEM Export', 'Standardized OEM-named ZIP bundle & One-Page Case Summary PDF')
    .addTag('Manager & Group Analytics', 'Real-time KPIs, flag rankings, and training gap feed')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Booran Warranty API Docs · OmniSuiteAI',
    customCss: `
      .swagger-ui .topbar { background-color: #081225; border-bottom: 2px solid #1a56db; }
      .swagger-ui .info .title { color: #1a56db; }
    `,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Booran Warranty API running at: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger OpenAPI docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
