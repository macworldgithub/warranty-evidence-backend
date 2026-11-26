<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

Set `AUTH_TOKEN_SECRET` to a long, random value in every deployed environment. It is used to sign portal and technician sessions and must remain the same across restarts and server instances.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## InfoAgent NEVDIS vehicle lookup

The Warranty client follows `booran-sales-floor-backend/lib/infoagent.js`. Configure these values on the backend (see `.env.example`):

```dotenv
INFOAGENT_CLIENT_ID=your-client-id
INFOAGENT_CLIENT_SECRET=your-client-secret
INFOAGENT_BASE_URL=https://api.dev.infoagent.com.au
INFOAGENT_AUTH_URL=https://api.dev.infoagent.com.au/auth/v1/token/oauth
INFOAGENT_TIMEOUT_MS=10000
```

OAuth uses Basic authentication with the client ID/secret and form body `grant_type=client_credentials`. The shared client accepts `access_token` or `token`, defaults a missing `expires_in` to 3600 seconds, and renews cached tokens 60 seconds before expiry. Concurrent authentication requests share one token request; an upstream 401 triggers one token renewal and retry. Tokens and credentials are never returned to the PWA or logged in provider errors.

Both lookups use `POST /nevdis/v1/vehicle-report`, a bearer token, and products `VEHICLE_AGE`, `EXTENDED_DATA`, `HIGH_PERFORMANCE_INFO`, `REGISTRATION`, `STOLEN_INFO`, `WRITTEN_OFF_INFO`. Rego sends `{ plate, state, products }`; VIN sends `{ vin, products }`. Only `result.responseCode === "SUCCESS"` is normalized, using `result.vehicles[0]`. Identification, extended data, manufacture year/compliance plate, registration, incidents, risk flags and warning messages follow the Sales Floor contract. Unknown values retain the reference empty/null defaults.

Warranty exposes authenticated `POST /api/v1/vehicle/decode-rego` with `{ "rego": "ABC123", "state": "VIC" }` and `POST /api/v1/vehicle/decode-vin` with `{ "vin": "1HGCM82633A004352" }`. Responses retain Warranty's direct JSON shape, adding its `provider`, `requiresManualConfirm` and VIN check-digit metadata to normalized InfoAgent fields. Missing powertrain information is omitted. VIN falls back to the existing decoder if InfoAgent is unconfigured, unavailable, or returns no matching vehicle. Rego returns 404 for no result and maps provider failures to sanitized 400/502/503 responses; the PWA supports manual capture and retry.

Deploy the backend with the PWA Rego changes. Select the corresponding auth and report hosts together when changing environments. The Sales Floor source and deployment are unchanged.

After deploying, rebuilding and restarting the backend process, run `node tools/check-rego-route.cjs https://warranty-evidence.omnisuiteai.com`. A registered route returns HTTP 401 without a user session; `Cannot POST /api/v1/vehicle/decode-rego` means the running API does not contain this change. Updating the PWA or refreshing its cache does not register a backend route. The probe sends no user token and does not invoke InfoAgent on the updated backend.

Verification: development API Rego and VIN lookups succeeded with the configured client; both shared one token. The normalized live Rego response matched Sales Floor's normalizer field for field. Automated tests cover the request/auth contract, token reuse and renewal, no-result behavior, provider failures, normalization, risk warnings and Warranty's adapters/fallback.

## Chery evidence flow

Chery uses the 20 rules in `tools/templates/chery_evidence_rules_template.csv` rather than the common brand pack. Backend startup installs the published Chery pack on existing databases as well as fresh ones, when there is no published Chery pack and the built-in template has not already been installed or archived. Existing administrator packs are preserved. To replace a custom pack, create a Chery draft using **Chery evidence checklist (20 requirements)** in the portal, review it, and publish it.

The supplied CSV marks every row Tier 1, mandatory, with Trigger=None, including the barcode and video rows. Those flags are preserved. The app's offline rules match the backend rules. Documents accept PDF or TXT; stored filenames follow the template with the uploaded file's actual extension. Workshop and OEM submission require all Chery evidence plus the existing walkaround photos. VIN and odometer presentation photos fulfil their walkaround categories too, giving 25 required items in total.

Deploy/restart the backend and deploy both the portal and PWA for the full change. The portal lists the stored Chery pack under Brand Packs and offers the template and CSV download when creating a Chery draft.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
