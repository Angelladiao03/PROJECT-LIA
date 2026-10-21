<?php
// 1. Copy this file and name the copy: config.local.php (same folder).
// 2. Paste your Neon DEV branch connection string below.
//    Neon -> Branches -> dev -> Connect. It looks like:
//    postgresql://USER:PASSWORD@ep-something.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
// 3. Never commit config.local.php - it's already in .gitignore.

return [
    'database_url' => 'postgresql://USER:PASSWORD@HOST/neondb?sslmode=require',
];
