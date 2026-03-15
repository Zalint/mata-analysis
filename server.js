const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE';
const AUTH_USER = process.env.USER || 'mata';
const AUTH_PASS = process.env.PASSWORD || 'mata2026';

/* Session tokens (simple in-memory) */
const sessions = new Set();
function genToken(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function parseCookies(str){ var c={}; (str||'').split(';').forEach(function(p){ var kv=p.trim().split('='); if(kv[0])c[kv[0]]=kv[1]||''; }); return c; }

const LOGIN_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mata · Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0b1120;color:#e2e8f0;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;width:320px;text-align:center}
.logo{font-size:22px;font-weight:800;margin-bottom:4px}
.logo span{color:#22c55e}
.sub{font-size:11px;color:#64748b;margin-bottom:24px}
input{width:100%;padding:10px 12px;margin-bottom:12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:12px;outline:none}
input:focus{border-color:#7c3aed}
button{width:100%;padding:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}
button:hover{opacity:.9}
.err{color:#ef4444;font-size:10px;margin-bottom:10px;display:none}
</style></head><body>
<div class="card">
  <div class="logo">Mata·<span>Analysis</span></div>
  <div class="sub">Connexion requise</div>
  <div class="err" id="err">Identifiants incorrects</div>
  <input id="u" type="text" placeholder="Utilisateur" autofocus>
  <input id="p" type="password" placeholder="Mot de passe" onkeydown="if(event.key==='Enter')login()">
  <button onclick="login()">Se connecter</button>
</div>
<script>
function login(){
  var u=document.getElementById('u').value,p=document.getElementById('p').value;
  fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u,pass:p})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.ok){document.cookie='session='+d.token+';path=/;max-age=86400';location.href='/';}
    else{document.getElementById('err').style.display='block';}
  });
}
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  /* Login endpoint */
  if (req.method === 'POST' && req.url === '/auth/login') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { user, pass } = JSON.parse(body);
        if (user === AUTH_USER && pass === AUTH_PASS) {
          const token = genToken();
          sessions.add(token);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, token }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  /* Logout */
  if (req.url === '/auth/logout') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.session) sessions.delete(cookies.session);
    res.writeHead(302, { 'Location': '/login', 'Set-Cookie': 'session=;path=/;max-age=0' });
    res.end();
    return;
  }

  /* Login page */
  if (req.url === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(LOGIN_HTML);
    return;
  }

  /* Auth check for all other routes */
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.session || !sessions.has(cookies.session)) {
    res.writeHead(302, { 'Location': '/login' });
    res.end();
    return;
  }

  /* Serve HTML */
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  /* Serve static files */
  if (req.method === 'GET') {
    const filePath = path.join(__dirname, 'public', req.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  /* Proxy API calls to Anthropic */
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: parsed.model || 'claude-sonnet-4-20250514',
            max_tokens: parsed.max_tokens || 1000,
            messages: parsed.messages || []
          })
        });
        const data = await apiRes.json();
        res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  /* Proxy external API calls — adds API key server-side */
  if (req.method === 'GET' && req.url.startsWith('/api/external/')) {
    try {
      const MATA_EXT_KEY = process.env.MATA_EXT_KEY;
      if (!MATA_EXT_KEY) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: 'MATA_EXT_KEY not configured' })); return; }
      const targetUrl = 'https://mata-lgzy.onrender.com' + req.url;
      const extRes = await fetch(targetUrl, { headers: { 'x-api-key': MATA_EXT_KEY } });
      const body = await extRes.text();
      res.writeHead(extRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Mata Analysis server running at http://localhost:${PORT}`);
  console.log(`   Auth: ${AUTH_USER} / ${'*'.repeat(AUTH_PASS.length)}`);
});
