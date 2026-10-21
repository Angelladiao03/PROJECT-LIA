<?php
// 1. Copy this file and name the copy: config.local.php (same folder).
// 2. Fill in the values below.
// 3. Never commit config.local.php - it's already in .gitignore.

return [
    // Neon -> Branches -> dev -> Connect. Looks like:
    // postgresql://USER:PASSWORD@ep-something.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
    'DATABASE_URL' => 'postgresql://USER:PASSWORD@HOST/neondb?sslmode=require',

    // "development" on your computer: if no email service is set up, the
    // verification code is shown on screen so you can still test sign-up.
    'APP_ENV' => 'development',

    // Optional on your computer. Needed on Render so real emails are sent.
    // See README.md -> "Sending emails (Brevo)".
    'BREVO_API_KEY' => '',
    'MAIL_FROM_EMAIL' => '',
    'MAIL_FROM_NAME' => 'LagroInAction',
];
