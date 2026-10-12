// Developer docs: the API list that used to live at the bottom of /.
// Linked from footers only.
const STYLE = `body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.6;color:#0e1b3d;background:#eef6ff}
a{color:#1247b8}
code{background:#f2f2f2;padding:0.1rem 0.35rem;border-radius:4px}
ul.api{padding-left:1.25rem}
ul.api li{margin:0.35rem 0}`;

export function developersPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Developers · Nicelingo</title>
<meta name="theme-color" content="#1a5feb">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/logo/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/logo/apple-touch-icon.png">
<style>${STYLE}</style>
</head>
<body>
<h1>Developers</h1>
<ul class="api">
<li><code>GET /api/lessons/:lang/:lesson</code> — lesson manifest</li>
<li><code>POST /api/score</code> — pronunciation scoring</li>
<li><code>GET /api/progress</code> — your progress (sign in first)</li>
<li><code>POST /api/auth/sign-in/anonymous</code> — try without an account</li>
<li><code>GET /health</code> — service status</li>
</ul>
<p><a href="/">← Back to Nicelingo</a></p>
</body>
</html>`;
}
