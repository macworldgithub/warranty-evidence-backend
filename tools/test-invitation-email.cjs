const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

async function main() {
  const settings = { ...dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env'))), ...process.env };
  const recipient = 'abdulahadnauman10@gmail.com';
  if (!settings.SMTP_USER || !settings.SMTP_PASS) throw new Error('SMTP credentials are not configured.');
  const port = Number(settings.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: settings.SMTP_HOST || 'smtp.gmail.com', port,
    secure: settings.SMTP_SECURE === 'true' || port === 465,
    auth: { user: settings.SMTP_USER, pass: settings.SMTP_PASS },
    connectionTimeout: 15000, socketTimeout: 30000,
  });
  try {
    await transport.verify();
    const result = await transport.sendMail({
      from: settings.SMTP_FROM || settings.SMTP_USER,
      to: recipient,
      subject: 'Booran Motors — invitation email delivery test',
      text: 'Hello,\n\nThis is the email-delivery test you requested for the Booran Motors technician invitation feature.\n\nIf you receive this message, the configured SMTP service successfully delivered this test to your mailbox.\n\nThis is a delivery test only. No technician account or invitation has been created, and there is no activation link. A real invitation will contain a secure, single-use link to set your password after the new feature is deployed.\n\nBooran Motors Warranty Portal',
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('The SMTP server rejected the test recipient.');
    console.log(JSON.stringify({ recipient, smtpAccepted: true, messageId: result.messageId }));
  } finally { transport.close(); }
}
main().catch(error => {
  // Do not print credentials, connection strings, or raw SMTP authentication exchanges.
  console.error(JSON.stringify({ sent: false, code: error.code || 'EMAIL_TEST_FAILED', command: error.command || null, responseCode: error.responseCode || null }));
  process.exitCode = 1;
});
