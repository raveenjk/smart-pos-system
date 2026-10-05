import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { BrowserWindow } from 'electron';
import { getDb, DB_PATH } from '../database/schema';
import {
  getMachineId,
  getLicenseStatus,
  activateLicense,
  generateLicenseKey,
  startTrial,
  extendTrial,
  endTrial,
  deactivateLicense,
} from '../license/licenseManager';

let server: http.Server | null = null;
let currentPort = 4800;

// In-memory active session tokens (token -> { email, expires })
const activeSessions = new Map<string, { email: string; expires: number }>();

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        req.destroy();
        resolve({});
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function getStoredSetting(key: string, defaultVal: string = ''): string {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value ?? defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStoredSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function ensureDeveloperCredentials() {
  const email = getStoredSetting('dev_email', '');
  if (!email || email === 'raveenmadhawa48@gmail.com') {
    setStoredSetting('dev_email', 'developer@gmail.com');
  }

  let salt = getStoredSetting('dev_password_salt', '');
  let hash = getStoredSetting('dev_password_hash', '');

  // Reset to default admin@2026 if empty or if set to raveen password
  if (!salt || !hash || hash === hashPassword('admin@20262000414', salt)) {
    salt = crypto.randomBytes(16).toString('hex');
    hash = hashPassword('admin@2026', salt);
    setStoredSetting('dev_password_salt', salt);
    setStoredSetting('dev_password_hash', hash);
  }
}

function authenticateRequest(req: http.IncomingMessage): boolean {
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.headers['cookie']) {
    const match = req.headers['cookie'].match(/pos_dev_session=([a-f0-9]+)/);
    if (match) token = match[1];
  }

  if (!token) return false;

  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

export function startDeveloperServer(preferredPort: number = 4800): Promise<number> {
  return new Promise((resolve) => {
    ensureDeveloperCredentials();

    server = http.createServer(async (req, res) => {
      // CORS Preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        });
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url || '/', true);
      const pathname = parsedUrl.pathname || '/';

      // 1. Serve HTML Single Page App on root and /developer
      if (pathname === '/' || pathname === '/developer' || pathname === '/admin') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDeveloperPortalHTML(currentPort));
        return;
      }

      // 2. Authentication: POST /api/login
      if (pathname === '/api/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const inputEmail = String(body.email || '').trim().toLowerCase();
        const inputPassword = String(body.password || '');

        const devEmail = getStoredSetting('dev_email', 'developer@gmail.com').toLowerCase();
        const salt = getStoredSetting('dev_password_salt', '');
        const storedHash = getStoredSetting('dev_password_hash', '');

        const computedHash = hashPassword(inputPassword, salt);

        if (inputEmail === devEmail && computedHash === storedHash) {
          const token = crypto.randomBytes(32).toString('hex');
          // 24 hour session
          activeSessions.set(token, { email: inputEmail, expires: Date.now() + 24 * 3600 * 1000 });

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': `pos_dev_session=${token}; Path=/; HttpOnly; Max-Age=86400`,
          });
          res.end(JSON.stringify({ success: true, token, email: devEmail }));
        } else {
          sendJson(res, 401, { success: false, message: 'Invalid developer email or password' });
        }
        return;
      }

      // 3. POST /api/logout
      if (pathname === '/api/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          activeSessions.delete(authHeader.substring(7).trim());
        }
        sendJson(res, 200, { success: true });
        return;
      }

      // Require authentication for all subsequent /api/* routes
      if (!authenticateRequest(req)) {
        sendJson(res, 401, { success: false, message: 'Unauthorized. Developer session required.' });
        return;
      }

      // 4. GET /api/status - Master System Status
      if (pathname === '/api/status' && req.method === 'GET') {
        const db = getDb();
        const machineId = getMachineId();
        const license = getLicenseStatus();
        const supabaseUrl = getStoredSetting('supabase_url', '');
        const supabaseKey = getStoredSetting('supabase_key', '');
        const maintenanceMode = getStoredSetting('maintenance_mode', 'false') === 'true';
        const maintenanceMsg = getStoredSetting('maintenance_message', 'System maintenance in progress. Please contact your software vendor.');

        let productCount = 0;
        let salesCount = 0;
        let dbSizeMB = 0;

        try {
          productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any)?.c || 0;
          salesCount = (db.prepare('SELECT COUNT(*) as c FROM sales').get() as any)?.c || 0;
          if (fs.existsSync(DB_PATH)) {
            const stats = fs.statSync(DB_PATH);
            dbSizeMB = Number((stats.size / (1024 * 1024)).toFixed(2));
          }
        } catch {}

        sendJson(res, 200, {
          success: true,
          machineId,
          license,
          supabase: {
            url: supabaseUrl,
            hasKey: Boolean(supabaseKey && supabaseKey.length > 5),
          },
          stats: {
            productCount,
            salesCount,
            dbSizeMB,
          },
          maintenance: {
            active: maintenanceMode,
            message: maintenanceMsg,
          },
          system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptimeHours: Number((os.uptime() / 3600).toFixed(1)),
            nodeVersion: process.version,
            port: currentPort,
          },
          devEmail: getStoredSetting('dev_email', 'developer@gmail.com'),
          branding: {
            enabled: getStoredSetting('receipt_branding_enabled', 'true') !== 'false',
            text: getStoredSetting('receipt_branding_text', 'System by JK Soft - 070 522 4007'),
          },
        });
        return;
      }

      // 5. POST /api/license/instant-activate (Feature 1: 1-Click Instant Activation)
      if (pathname === '/api/license/instant-activate' && req.method === 'POST') {
        const body = await parseBody(req);
        const tier = (body.tier === 'ANNUAL' ? 'ANNUAL' : 'LIFETIME') as 'LIFETIME' | 'ANNUAL';
        const machineId = getMachineId();
        const generatedKey = generateLicenseKey(machineId, tier);
        const result = activateLicense(generatedKey);

        sendJson(res, result.success ? 200 : 400, {
          ...result,
          licenseKey: generatedKey,
          tier,
        });
        return;
      }

      // 5.5 POST /api/license/trial/start
      if (pathname === '/api/license/trial/start' && req.method === 'POST') {
        const body = await parseBody(req);
        const days = parseInt(body.days, 10) || 7;
        const result = startTrial(days);
        sendJson(res, 200, result);
        return;
      }

      // 5.6 POST /api/license/trial/extend
      if (pathname === '/api/license/trial/extend' && req.method === 'POST') {
        const body = await parseBody(req);
        const days = parseInt(body.days, 10) || 3;
        const result = extendTrial(days);
        sendJson(res, 200, result);
        return;
      }

      // 5.7 POST /api/license/trial/end
      if (pathname === '/api/license/trial/end' && req.method === 'POST') {
        const result = endTrial();
        sendJson(res, 200, result);
        return;
      }

      // 6. POST /api/license/activate (Feature 2: Manual Key Input)
      if (pathname === '/api/license/activate' && req.method === 'POST') {
        const body = await parseBody(req);
        const licenseKey = String(body.licenseKey || '').trim();
        const result = activateLicense(licenseKey);
        sendJson(res, result.success ? 200 : 400, result);
        return;
      }

      // 6. POST /api/license/deactivate
      if (pathname === '/api/license/deactivate' && req.method === 'POST') {
        const result = deactivateLicense();
        sendJson(res, 200, result);
        return;
      }

      // 7. POST /api/supabase/update
      if (pathname === '/api/supabase/update' && req.method === 'POST') {
        const body = await parseBody(req);
        const urlVal = String(body.supabase_url || '').trim();
        const keyVal = String(body.supabase_key || '').trim();

        if (urlVal) setStoredSetting('supabase_url', urlVal);
        if (keyVal) setStoredSetting('supabase_key', keyVal);

        sendJson(res, 200, { success: true, message: 'Supabase credentials saved successfully' });
        return;
      }

      // 8. GET /api/db/backup (Direct .sqlite download)
      if (pathname === '/api/db/backup' && req.method === 'GET') {
        if (!fs.existsSync(DB_PATH)) {
          sendJson(res, 404, { success: false, message: 'Database file not found' });
          return;
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `POS_DATABASE_BACKUP_${dateStr}.db`;

        res.writeHead(200, {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fs.statSync(DB_PATH).size,
        });

        const stream = fs.createReadStream(DB_PATH);
        stream.pipe(res);
        return;
      }

      // 9. POST /api/system/maintenance
      if (pathname === '/api/system/maintenance' && req.method === 'POST') {
        const body = await parseBody(req);
        const active = Boolean(body.active);
        const message = String(body.message || 'System maintenance in progress. Please contact your software vendor.');

        setStoredSetting('maintenance_mode', active ? 'true' : 'false');
        setStoredSetting('maintenance_message', message);

        // Notify all Electron browser windows
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('system:maintenanceUpdate', { active, message });
        });

        sendJson(res, 200, { success: true, active, message });
        return;
      }

      // 9.5 POST /api/settings/branding
      if (pathname === '/api/settings/branding' && req.method === 'POST') {
        const body = await parseBody(req);
        const enabled = body.enabled === true || body.enabled === 'true';
        const text = String(body.text || 'System by JK Soft - 070 522 4007').trim();

        setStoredSetting('receipt_branding_enabled', enabled ? 'true' : 'false');
        setStoredSetting('receipt_branding_text', text);

        sendJson(res, 200, {
          success: true,
          message: 'Receipt branding watermark updated successfully!',
          enabled,
          text,
        });
        return;
      }

      // 10. POST /api/security/update
      if (pathname === '/api/security/update' && req.method === 'POST') {
        const body = await parseBody(req);
        const currentPassword = String(body.currentPassword || '');
        const newEmail = String(body.newEmail || '').trim().toLowerCase();
        const newPassword = String(body.newPassword || '');

        const salt = getStoredSetting('dev_password_salt', '');
        const storedHash = getStoredSetting('dev_password_hash', '');

        if (hashPassword(currentPassword, salt) !== storedHash) {
          sendJson(res, 400, { success: false, message: 'Current password verification failed' });
          return;
        }

        if (newEmail) {
          setStoredSetting('dev_email', newEmail);
        }

        if (newPassword && newPassword.length >= 6) {
          const newSalt = crypto.randomBytes(16).toString('hex');
          const newHash = hashPassword(newPassword, newSalt);
          setStoredSetting('dev_password_salt', newSalt);
          setStoredSetting('dev_password_hash', newHash);
        }

        sendJson(res, 200, { success: true, message: 'Developer security credentials updated successfully' });
        return;
      }

      sendJson(res, 404, { success: false, message: 'Endpoint not found' });
    });

    const listenOnPort = (port: number) => {
      server?.listen(port, '0.0.0.0', () => {
        currentPort = port;
        console.log(`🚀 [Developer Portal] Live at http://localhost:${port}/developer`);
        resolve(port);
      });

      server?.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying ${port + 1}...`);
          listenOnPort(port + 1);
        } else {
          console.error('Developer server error:', err);
        }
      });
    };

    listenOnPort(preferredPort);
  });
}

export function getDeveloperServerPort(): number {
  return currentPort;
}

// Complete embedded SPA HTML template for Developer Super Admin
function renderDeveloperPortalHTML(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart POS — Super Admin Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --card-hover: #1f2937;
      --border: #1f293d;
      --border-accent: #374151;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #06b6d4;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    /* Layout */
    .container { max-width: 1100px; margin: 0 auto; width: 100%; padding: 24px 20px; }
    .glass-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    
    /* Header */
    header { border-bottom: 1px solid var(--border); background: rgba(17, 24, 39, 0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
    .header-content { display: flex; align-items: center; justify-content: space-between; height: 68px; }
    .logo-badge { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 15px rgba(37,99,235,0.4); }
    .badge-dev { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Navigation Tabs */
    .nav-tabs { display: flex; gap: 6px; background: rgba(9, 13, 22, 0.6); padding: 4px; border-radius: 14px; border: 1px solid var(--border); margin: 24px 0; overflow-x: auto; }
    .nav-tab { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text-muted); background: transparent; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
    .nav-tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .nav-tab.active { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }

    /* Forms & Inputs */
    .input-group { margin-bottom: 18px; }
    .input-label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .input-field { width: 100%; background: #0c1220; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 14px; transition: border-color 0.2s; }
    .input-field:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
    
    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
    .btn:active { transform: scale(0.97); }
    .btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
    .btn-primary:hover { opacity: 0.95; }
    .btn-accent { background: linear-gradient(135deg, #0891b2, #06b6d4); color: #fff; }
    .btn-emerald { background: linear-gradient(135deg, #059669, #10b981); color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.3); }
    .btn-rose { background: linear-gradient(135deg, #e11d48, #f43f5e); color: #fff; }
    .btn-secondary { background: #1f293d; color: #e5e7eb; border: 1px solid var(--border-accent); }
    .btn-secondary:hover { background: #2d3748; }

    /* Grid & Cards */
    .grid-cols-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .grid-cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .stat-card { background: #0c1220; border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
    .stat-val { font-size: 24px; font-weight: 800; color: #fff; margin-top: 4px; }
    .stat-lbl { font-size: 12px; font-weight: 600; color: var(--text-muted); }

    /* Status Pill */
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .pill-green { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .pill-amber { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
    .pill-rose { background: rgba(244,63,94,0.15); color: #fb7185; border: 1px solid rgba(244,63,94,0.3); }

    /* Toast */
    #toast { position: fixed; bottom: 24px; right: 24px; background: #1e293b; border: 1px solid var(--border); padding: 14px 20px; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: none; align-items: center; gap: 10px; z-index: 100; font-size: 13px; font-weight: 600; }
    
    @media (max-width: 768px) {
      .grid-cols-2, .grid-cols-3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Toast Notification -->
  <div id="toast"></div>

  <!-- Header -->
  <header>
    <div class="container header-content">
      <div class="logo-badge">
        <div class="logo-icon">⚡</div>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h1 style="font-size:17px; font-weight:800; letter-spacing:-0.3px;">Smart POS Developer Portal</h1>
            <span class="badge-dev">Super Admin</span>
          </div>
          <p style="font-size:11px; color:var(--text-muted);">Hardware Licensing & Cloud Sync Master Console</p>
        </div>
      </div>
      <div id="headerAuth" style="display:flex; align-items:center; gap:12px;">
        <span id="userEmailSpan" style="font-size:12px; color:var(--text-muted);"></span>
        <button id="logoutBtn" class="btn btn-secondary" style="padding:7px 14px; font-size:12px; display:none;" onclick="logout()">Logout</button>
      </div>
    </div>
  </header>

  <!-- Login Modal / View -->
  <div id="loginView" class="container" style="max-width:440px; margin-top:80px;">
    <div class="glass-card" style="padding:36px 32px;">
      <div style="text-align:center; margin-bottom:28px;">
        <div style="width:54px; height:54px; border-radius:16px; background:linear-gradient(135deg,#3b82f6,#06b6d4); margin:0 auto 14px; display:flex; align-items:center; justify-content:center; font-size:26px;">🔐</div>
        <h2 style="font-size:22px; font-weight:800;">Developer Authorization</h2>
        <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Enter master credentials to access system console</p>
      </div>
      <form onsubmit="handleLogin(event)">
        <div class="input-group">
          <label class="input-label">Developer Email (Gmail)</label>
          <input type="email" id="loginEmail" class="input-field" placeholder="developer@gmail.com" required autofocus>
        </div>
        <div class="input-group" style="margin-bottom:24px;">
          <label class="input-label">Master Password</label>
          <input type="password" id="loginPassword" class="input-field" placeholder="••••••••••••" required>
        </div>
        <button type="submit" id="loginBtn" class="btn btn-primary" style="width:100%; padding:13px;">Authorize & Connect</button>
      </form>
    </div>
  </div>

  <!-- Authenticated Portal View -->
  <div id="portalView" class="container" style="display:none;">
    
    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('tab-overview', this)">📊 System Overview</button>
      <button class="nav-tab" onclick="switchTab('tab-license', this)">🔑 Hardware License</button>
      <button class="nav-tab" onclick="switchTab('tab-supabase', this)">☁️ Supabase Cloud Sync</button>
      <button class="nav-tab" onclick="switchTab('tab-database', this)">💾 Database & Maintenance</button>
      <button class="nav-tab" onclick="switchTab('tab-security', this)">🛡️ Developer Security</button>
    </div>

    <!-- 1. System Overview Tab -->
    <div id="tab-overview" class="tab-pane">
      <div class="grid-cols-3" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-lbl">CLIENT MACHINE ID</div>
          <div id="statMachineId" class="stat-val font-mono" style="font-size:18px;">—</div>
          <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px; margin-top:8px;" onclick="copyMachineId()">📋 Copy ID</button>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">LICENSE STATUS</div>
          <div id="statLicenseTier" class="stat-val" style="font-size:18px; color:#34d399;">—</div>
          <div id="statLicensePill" style="margin-top:8px;"></div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">DATABASE RECORDS</div>
          <div id="statDbRecords" class="stat-val" style="font-size:18px;">—</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;" id="statDbSize">File: 0 MB</div>
        </div>
      </div>

      <div class="glass-card" style="padding:24px; margin-bottom:24px;">
        <h3 style="font-size:16px; font-weight:700; margin-bottom:14px;">🖥️ Runtime Node & Host Environment</h3>
        <div class="grid-cols-2" style="font-size:13px; color:var(--text-muted);">
          <div>
            <p><strong>Host Platform:</strong> <span id="envPlatform" class="font-mono text-white">—</span></p>
            <p style="margin-top:6px;"><strong>CPU Architecture:</strong> <span id="envArch" class="font-mono text-white">—</span></p>
            <p style="margin-top:6px;"><strong>Computer Hostname:</strong> <span id="envHost" class="font-mono text-white">—</span></p>
          </div>
          <div>
            <p><strong>Local HTTP Server:</strong> <span class="font-mono text-white">http://localhost:${port}</span></p>
            <p style="margin-top:6px;"><strong>System Uptime:</strong> <span id="envUptime" class="font-mono text-white">—</span></p>
            <p style="margin-top:6px;"><strong>Node Runtime:</strong> <span id="envNode" class="font-mono text-white">—</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Hardware License Tab -->
    <div id="tab-license" class="tab-pane" style="display:none;">
      <div class="glass-card" style="padding:28px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
          <div>
            <h3 style="font-size:18px; font-weight:800;">🔑 Cryptographic Machine Licensing</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Manage hardware-bound HMAC-SHA256 client licenses</p>
          </div>
          <div id="licenseBadgeContainer"></div>
        </div>

        <!-- Machine ID Display -->
        <div style="background:#0c1220; border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:22px;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Permanent Hardware Machine ID</div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
            <span id="licenseMachineIdSpan" class="font-mono" style="font-size:18px; font-weight:700; color:#38bdf8;">—</span>
            <button class="btn btn-secondary" onclick="copyMachineId()">📋 Copy Machine ID</button>
          </div>
          <p style="font-size:11px; color:#6b7280; margin-top:6px;">Derived from physical NIC MAC address and CPU model. Immune to Windows reinstallation.</p>
        </div>

        <!-- Feature 1: Test Run & Free Trial Provisioning (Auto-Locking) -->
        <div style="background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08)); border:1px solid rgba(245,158,11,0.35); border-radius:18px; padding:22px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">⏳</span>
                <h4 style="font-size:15px; font-weight:800; color:#fbbf24;">Feature 1: Test Run & Free Trial Provisioning</h4>
                <span id="trialStatusPill" class="pill pill-amber" style="font-size:10px;">Not Started</span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:6px; line-height:1.4;">
                Start an evaluation trial for this client shop. When the trial expires, the POS locks out automatically until a full license is activated.
              </p>
            </div>
            <div id="trialInfoBox" style="text-align:right; font-size:12px; color:#e5e7eb; font-family:monospace;">
              <!-- Dynamic status -->
            </div>
          </div>

          <!-- Trial Action Controls -->
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; padding-top:14px; border-top:1px solid rgba(245,158,11,0.2);">
            <span style="font-size:12px; font-weight:700; color:#d1d5db;">Start Trial:</span>
            <button class="btn btn-secondary" style="padding:7px 14px; font-size:12px;" onclick="handleStartTrial(7)">🚀 7 Days</button>
            <button class="btn btn-secondary" style="padding:7px 14px; font-size:12px;" onclick="handleStartTrial(14)">🚀 14 Days</button>
            <button class="btn btn-secondary" style="padding:7px 14px; font-size:12px;" onclick="handleStartTrial(30)">🚀 30 Days</button>
            
            <div style="display:flex; align-items:center; gap:6px; margin-left:4px;">
              <input type="number" id="customTrialDaysInput" class="input-field" placeholder="Days" style="width:70px; padding:6px 10px; font-size:12px; height:34px;" min="1" max="180">
              <button class="btn btn-secondary" style="padding:7px 12px; font-size:12px;" onclick="handleStartCustomTrial()">Start Custom</button>
            </div>

            <div style="margin-left:auto; display:flex; gap:8px;">
              <button class="btn btn-secondary" style="padding:7px 14px; font-size:12px; border-color:#f59e0b; color:#fbbf24;" onclick="handleExtendTrial(3)">➕ Extend +3 Days</button>
              <button class="btn btn-secondary" style="padding:7px 14px; font-size:12px; border-color:#f59e0b; color:#fbbf24;" onclick="handleExtendTrial(7)">➕ Extend +7 Days</button>
              <button class="btn btn-rose" style="padding:7px 12px; font-size:12px;" onclick="handleEndTrial()">🔒 Force Lock (End Trial)</button>
            </div>
          </div>
        </div>

        <!-- Feature 2: 1-Click Instant Activate (On-site Install / Full Payment) -->
        <div style="background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08)); border:1px solid rgba(16,185,129,0.35); border-radius:18px; padding:22px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
            <div style="max-width:520px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">⚡</span>
                <h4 style="font-size:15px; font-weight:800; color:#34d399;">Feature 2: Instant Lifetime Activation (Full Payment)</h4>
                <span class="pill pill-green" style="font-size:10px;">Developer 1-Click</span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:6px; line-height:1.4;">
                Client paid in full? Computes cryptographic HMAC signature and instantly activates lifetime license. Never locks out.
              </p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-emerald" style="padding:11px 20px; font-size:13px;" onclick="handleInstantActivate('LIFETIME')">
                ⚡ Activate Lifetime (Full)
              </button>
              <button class="btn btn-secondary" style="padding:11px 16px; font-size:12px;" onclick="handleInstantActivate('ANNUAL')">
                📅 Activate 1-Year (Annual)
              </button>
            </div>
          </div>
        </div>

        <!-- Feature 3: Manual Key Input (Remote / WhatsApp) -->
        <div style="background:#0c1220; border:1px solid var(--border); border-radius:18px; padding:22px; margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:18px;">🔑</span>
            <h4 style="font-size:15px; font-weight:800; color:#f3f4f6;">Feature 3: Manual Key Input</h4>
            <span class="pill pill-amber" style="font-size:10px;">Remote / WhatsApp Key</span>
          </div>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
            Paste an encrypted license key generated from your CLI script or mobile tool (e.g. for remote shop clients who send you their Machine ID).
          </p>
          <div class="input-group" style="margin-bottom:0;">
            <div style="display:flex; gap:10px;">
              <input type="text" id="licenseKeyInput" class="input-field font-mono" placeholder="POS-LIFE-XXXXXX-XXXXXXXX" style="text-transform:uppercase;">
              <button class="btn btn-primary" onclick="handleActivateLicense()">Verify & Activate Key</button>
            </div>
          </div>
        </div>

        <!-- Revoke / Deactivate -->
        <div style="padding-top:20px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <p style="font-size:13px; font-weight:700; color:#f87171;">Revoke / Deactivate License</p>
            <p style="font-size:11px; color:var(--text-muted);">Reset client software to Trial/Unregistered mode for testing</p>
          </div>
          <button class="btn btn-rose" onclick="handleDeactivateLicense()">Revoke License</button>
        </div>
      </div>
    </div>

    <!-- 3. Supabase Cloud Sync Tab -->
    <div id="tab-supabase" class="tab-pane" style="display:none;">
      <div class="glass-card" style="padding:28px;">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:6px;">☁️ Supabase Cloud Synchronization</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:24px;">Manage remote PostgreSQL database credentials for multi-store synchronization</p>

        <form onsubmit="handleSaveSupabase(event)">
          <div class="input-group">
            <label class="input-label">Supabase Project URL</label>
            <input type="url" id="supabaseUrlInput" class="input-field font-mono" placeholder="https://your-project.supabase.co" required>
          </div>
          <div class="input-group">
            <label class="input-label">Supabase Anon / Service Key</label>
            <input type="password" id="supabaseKeyInput" class="input-field font-mono" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
            <span style="font-size:11px; color:#6b7280; margin-top:4px; display:block;">Leave blank if keeping existing key</span>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:8px;">Save Supabase Credentials</button>
        </form>
      </div>
    </div>

    <!-- 4. Database & Maintenance Tab -->
    <div id="tab-database" class="tab-pane" style="display:none;">
      <div class="glass-card" style="padding:28px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:18px; font-weight:800;">📥 One-Click SQLite Database Backup</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Download the raw SQLite .db file directly to your developer device</p>
          </div>
          <button class="btn btn-emerald" onclick="downloadBackup()">Download .DB Backup</button>
        </div>
      </div>

      <div class="glass-card" style="padding:28px; border-color:rgba(244,63,94,0.3);">
        <h3 style="font-size:18px; font-weight:800; color:#fb7185; margin-bottom:6px;">⚠️ Shop Maintenance / Lockout Mode</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">
          Lock the client desktop POS screen (e.g. for pending annual subscription payments or scheduled technical service).
        </p>
        
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <input type="checkbox" id="maintenanceCheckbox" style="width:20px; height:20px; cursor:pointer;" onchange="toggleMaintenance()">
          <label for="maintenanceCheckbox" style="font-weight:700; font-size:14px; cursor:pointer;">
            Enable Lockout on Client POS
          </label>
        </div>

        <div class="input-group">
          <label class="input-label">Lockout Display Notice (Shown to Shop Owner & Cashiers)</label>
          <input type="text" id="maintenanceNoticeInput" class="input-field" placeholder="System maintenance in progress. Please contact your vendor.">
        </div>
        <button class="btn btn-secondary" onclick="updateMaintenanceNotice()">Update Notice</button>
      </div>

      <!-- Receipt Vendor Branding Card -->
      <div class="glass-card" style="padding:28px; margin-top:24px; border-color:rgba(59,130,246,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h3 style="font-size:18px; font-weight:800; color:#60a5fa; margin-bottom:4px;">🧾 Receipt Vendor Branding Watermark</h3>
            <p style="font-size:13px; color:var(--text-muted);">
              Controls the footer branding line printed at the very bottom of every customer bill.
            </p>
          </div>
          <span id="brandingPill" class="pill pill-green" style="font-size:11px;">Active on Bills</span>
        </div>

        <div style="background:#0c1220; border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <input type="checkbox" id="receiptBrandingCheckbox" style="width:18px; height:18px; cursor:pointer;" onchange="handleSaveBranding()">
            <label for="receiptBrandingCheckbox" style="font-weight:700; font-size:13px; cursor:pointer;">
              Print Vendor Watermark at bottom of receipts (Default: ON)
            </label>
          </div>
          <p style="font-size:11px; color:#9ca3af; line-height:1.4;">
            By default, <code>System by JK Soft - 070 522 4007</code> prints at the bottom of every bill. If a shop owner objects or requests to hide it, uncheck this box to remove it completely. Shop owners cannot change this from their POS interface.
          </p>
        </div>

        <div class="input-group" style="margin-bottom:16px;">
          <label class="input-label">Vendor Watermark Text</label>
          <input type="text" id="receiptBrandingTextInput" class="input-field font-mono" placeholder="System by JK Soft - 070 522 4007" value="System by JK Soft - 070 522 4007">
        </div>

        <button class="btn btn-primary" onclick="handleSaveBranding()">Save Receipt Branding</button>
      </div>
    </div>

    <!-- 5. Developer Security Tab -->
    <div id="tab-security" class="tab-pane" style="display:none;">
      <div class="glass-card" style="padding:28px; max-width:540px;">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:6px;">🛡️ Update Developer Credentials</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Change developer email or master password</p>

        <form onsubmit="handleUpdateSecurity(event)">
          <div class="input-group">
            <label class="input-label">Current Master Password *</label>
            <input type="password" id="secCurrentPassword" class="input-field" placeholder="Current password" required>
          </div>
          <div class="input-group">
            <label class="input-label">New Developer Email</label>
            <input type="email" id="secNewEmail" class="input-field" placeholder="developer@gmail.com">
          </div>
          <div class="input-group">
            <label class="input-label">New Master Password (min 6 characters)</label>
            <input type="password" id="secNewPassword" class="input-field" placeholder="New strong password">
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:10px;">Update Master Credentials</button>
        </form>
      </div>
    </div>

  </div>

  <script>
    let token = localStorage.getItem('pos_dev_token') || '';
    let currentStatus = null;

    function showToast(msg, isError = false) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.display = 'flex';
      t.style.borderColor = isError ? '#f43f5e' : '#10b981';
      t.style.color = isError ? '#fda4af' : '#6ee7b7';
      setTimeout(() => { t.style.display = 'none'; }, 3500);
    }

    async function apiFetch(endpoint, options = {}) {
      options.headers = options.headers || {};
      if (token) options.headers['Authorization'] = 'Bearer ' + token;
      options.headers['Content-Type'] = 'application/json';
      
      const res = await fetch(endpoint, options);
      if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }
      return res.json();
    }

    async function checkAuthAndLoad() {
      if (!token) {
        document.getElementById('loginView').style.display = 'block';
        document.getElementById('portalView').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('userEmailSpan').textContent = '';
        return;
      }

      try {
        const data = await apiFetch('/api/status');
        if (data.success) {
          currentStatus = data;
          document.getElementById('loginView').style.display = 'none';
          document.getElementById('portalView').style.display = 'block';
          document.getElementById('logoutBtn').style.display = 'block';
          document.getElementById('userEmailSpan').textContent = data.devEmail || 'Developer';
          populateData(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    function populateData(data) {
      // Overview stats
      document.getElementById('statMachineId').textContent = data.machineId || '—';
      document.getElementById('statLicenseTier').textContent = data.license?.tier || 'Unregistered';
      document.getElementById('statLicensePill').innerHTML = data.license?.isActivated
        ? '<span class="pill pill-green">✓ Activated</span>'
        : '<span class="pill pill-amber">⚠️ Unregistered</span>';
      
      document.getElementById('statDbRecords').textContent = (data.stats?.productCount || 0) + ' Prods / ' + (data.stats?.salesCount || 0) + ' Sales';
      document.getElementById('statDbSize').textContent = 'File Size: ' + (data.stats?.dbSizeMB || 0) + ' MB';

      // Host environment
      document.getElementById('envPlatform').textContent = data.system?.platform || '—';
      document.getElementById('envArch').textContent = data.system?.arch || '—';
      document.getElementById('envHost').textContent = data.system?.hostname || '—';
      document.getElementById('envUptime').textContent = (data.system?.uptimeHours || 0) + ' hours';
      document.getElementById('envNode').textContent = data.system?.nodeVersion || '—';

      // License Tab
      document.getElementById('licenseMachineIdSpan').textContent = data.machineId || '—';
      document.getElementById('licenseKeyInput').value = data.license?.licenseKey || '';

      const lic = data.license || {};
      const badgeContainer = document.getElementById('licenseBadgeContainer');
      const trialPill = document.getElementById('trialStatusPill');
      const trialBox = document.getElementById('trialInfoBox');

      if (lic.status === 'ACTIVE') {
        badgeContainer.innerHTML = '<span class="pill pill-green" style="font-size:13px; padding:6px 14px;">🛡️ ' + lic.tier + ' Active</span>';
        if (trialPill) { trialPill.className = 'pill pill-green'; trialPill.textContent = 'Full License Active'; }
        if (trialBox) { trialBox.innerHTML = '<span style="color:#34d399; font-weight:700;">✓ Lifetime Unlocked</span>'; }
      } else if (lic.status === 'TRIAL_ACTIVE') {
        badgeContainer.innerHTML = '<span class="pill pill-amber" style="font-size:13px; padding:6px 14px;">⏳ Trial (' + lic.daysLeft + ' Days Left)</span>';
        if (trialPill) { trialPill.className = 'pill pill-amber'; trialPill.textContent = 'Trial Active'; }
        if (trialBox) { trialBox.innerHTML = '<span style="color:#fbbf24; font-weight:700;">⏳ ' + lic.daysLeft + ' Days Left</span><br><span style="color:#9ca3af; font-size:11px;">Expires: ' + (lic.trialEnd ? new Date(lic.trialEnd).toLocaleDateString() : '—') + '</span>'; }
      } else if (lic.status === 'TRIAL_EXPIRED') {
        badgeContainer.innerHTML = '<span class="pill pill-rose" style="font-size:13px; padding:6px 14px;">🔴 Trial Expired (Locked)</span>';
        if (trialPill) { trialPill.className = 'pill pill-rose'; trialPill.textContent = 'Trial Expired (Locked)'; }
        if (trialBox) { trialBox.innerHTML = '<span style="color:#f87171; font-weight:700;">🔴 Expired (Locked)</span><br><span style="color:#9ca3af; font-size:11px;">POS lockout active</span>'; }
      } else if (lic.status === 'TAMPERED') {
        badgeContainer.innerHTML = '<span class="pill pill-rose" style="font-size:13px; padding:6px 14px;">⚠️ Security Violation</span>';
        if (trialPill) { trialPill.className = 'pill pill-rose'; trialPill.textContent = 'Clock Tampering Detected'; }
        if (trialBox) { trialBox.innerHTML = '<span style="color:#f87171; font-weight:700;">Tamper Lockout</span>'; }
      } else {
        badgeContainer.innerHTML = '<span class="pill pill-amber" style="font-size:13px; padding:6px 14px;">⚠️ Setup Required</span>';
        if (trialPill) { trialPill.className = 'pill pill-amber'; trialPill.textContent = 'Unconfigured'; }
        if (trialBox) { trialBox.innerHTML = '<span style="color:#9ca3af;">Awaiting Trial or Key</span>'; }
      }

      // Supabase Tab
      document.getElementById('supabaseUrlInput').value = data.supabase?.url || '';

      // Maintenance Tab
      document.getElementById('maintenanceCheckbox').checked = Boolean(data.maintenance?.active);
      document.getElementById('maintenanceNoticeInput').value = data.maintenance?.message || '';

      // Receipt Vendor Watermark & Branding
      const branding = data.branding || {};
      const brandingChk = document.getElementById('receiptBrandingCheckbox');
      const brandingInput = document.getElementById('receiptBrandingTextInput');
      const brandingPill = document.getElementById('brandingPill');
      if (brandingChk) brandingChk.checked = branding.enabled !== false;
      if (brandingInput) brandingInput.value = branding.text || 'System by JK Soft - 070 522 4007';
      if (brandingPill) {
        brandingPill.className = branding.enabled !== false ? 'pill pill-green' : 'pill pill-rose';
        brandingPill.textContent = branding.enabled !== false ? 'Active on Bills' : 'Hidden on Bills';
      }

      // Security Tab
      document.getElementById('secNewEmail').value = data.devEmail || '';
    }

    async function handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const btn = document.getElementById('loginBtn');
      btn.textContent = 'Verifying...';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success && data.token) {
          token = data.token;
          localStorage.setItem('pos_dev_token', token);
          showToast('✓ Authorized successfully');
          checkAuthAndLoad();
        } else {
          showToast(data.message || 'Login failed', true);
        }
      } catch (err) {
        showToast('Connection error', true);
      } finally {
        btn.textContent = 'Authorize & Connect';
      }
    }

    function logout() {
      if (token) {
        fetch('/api/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
      }
      token = '';
      localStorage.removeItem('pos_dev_token');
      checkAuthAndLoad();
    }

    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).style.display = 'block';
      btn.classList.add('active');
    }

    function copyMachineId() {
      if (currentStatus?.machineId) {
        navigator.clipboard.writeText(currentStatus.machineId);
        showToast('✓ Machine ID copied to clipboard');
      }
    }

    async function handleStartTrial(days) {
      try {
        const res = await apiFetch('/api/license/trial/start', {
          method: 'POST',
          body: JSON.stringify({ days }),
        });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Failed to start trial', true);
      }
    }

    async function handleStartCustomTrial() {
      const days = parseInt(document.getElementById('customTrialDaysInput').value, 10);
      if (!days || days < 1) return showToast('Please enter a valid number of days', true);
      await handleStartTrial(days);
    }

    async function handleExtendTrial(days) {
      try {
        const res = await apiFetch('/api/license/trial/extend', {
          method: 'POST',
          body: JSON.stringify({ days }),
        });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Failed to extend trial', true);
      }
    }

    async function handleEndTrial() {
      if (!confirm('Are you sure you want to end the trial and lock out the POS app now?')) return;
      try {
        const res = await apiFetch('/api/license/trial/end', { method: 'POST' });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Failed to end trial', true);
      }
    }

    async function handleInstantActivate(tier = 'LIFETIME') {
      try {
        const res = await apiFetch('/api/license/instant-activate', {
          method: 'POST',
          body: JSON.stringify({ tier }),
        });
        if (res.success) {
          showToast('⚡ ' + res.message + ' (' + res.licenseKey + ')');
          checkAuthAndLoad();
        } else {
          showToast(res.message || 'Instant activation failed', true);
        }
      } catch (err) {
        showToast('Error during instant activation', true);
      }
    }

    async function handleActivateLicense() {
      const key = document.getElementById('licenseKeyInput').value.trim();
      if (!key) return showToast('Please enter a license key', true);
      try {
        const res = await apiFetch('/api/license/activate', {
          method: 'POST',
          body: JSON.stringify({ licenseKey: key }),
        });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Activation failed', true);
      }
    }

    async function handleDeactivateLicense() {
      if (!confirm('Are you sure you want to deactivate the license on this machine?')) return;
      try {
        const res = await apiFetch('/api/license/deactivate', { method: 'POST' });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Revocation failed', true);
      }
    }

    async function handleSaveSupabase(e) {
      e.preventDefault();
      const url = document.getElementById('supabaseUrlInput').value.trim();
      const key = document.getElementById('supabaseKeyInput').value.trim();
      try {
        const res = await apiFetch('/api/supabase/update', {
          method: 'POST',
          body: JSON.stringify({ supabase_url: url, supabase_key: key }),
        });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Save failed', true);
      }
    }

    function downloadBackup() {
      window.location.href = '/api/db/backup';
      showToast('📥 Downloading database backup file...');
    }

    async function toggleMaintenance() {
      const active = document.getElementById('maintenanceCheckbox').checked;
      const message = document.getElementById('maintenanceNoticeInput').value;
      try {
        await apiFetch('/api/system/maintenance', {
          method: 'POST',
          body: JSON.stringify({ active, message }),
        });
        showToast(active ? '⚠️ Maintenance Lockout Enabled on POS' : '✓ Maintenance Mode Disabled');
      } catch (err) {
        showToast('Failed to toggle maintenance', true);
      }
    }

    async function updateMaintenanceNotice() {
      const active = document.getElementById('maintenanceCheckbox').checked;
      const message = document.getElementById('maintenanceNoticeInput').value;
      try {
        await apiFetch('/api/system/maintenance', {
          method: 'POST',
          body: JSON.stringify({ active, message }),
        });
        showToast('✓ Lockout Notice Updated');
      } catch (err) {
        showToast('Failed to update notice', true);
      }
    }

    async function handleSaveBranding() {
      const enabled = document.getElementById('receiptBrandingCheckbox').checked;
      const text = document.getElementById('receiptBrandingTextInput').value.trim() || 'System by JK Soft - 070 522 4007';
      try {
        const res = await apiFetch('/api/settings/branding', {
          method: 'POST',
          body: JSON.stringify({ enabled, text }),
        });
        showToast(res.message);
        checkAuthAndLoad();
      } catch (err) {
        showToast('Failed to save receipt branding', true);
      }
    }

    async function handleUpdateSecurity(e) {
      e.preventDefault();
      const currentPassword = document.getElementById('secCurrentPassword').value;
      const newEmail = document.getElementById('secNewEmail').value.trim();
      const newPassword = document.getElementById('secNewPassword').value;

      try {
        const res = await apiFetch('/api/security/update', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newEmail, newPassword }),
        });
        if (res.success) {
          showToast('✓ Credentials updated successfully');
          document.getElementById('secCurrentPassword').value = '';
          document.getElementById('secNewPassword').value = '';
          checkAuthAndLoad();
        } else {
          showToast(res.message, true);
        }
      } catch (err) {
        showToast('Failed to update credentials', true);
      }
    }

    // Auto-load on page start
    checkAuthAndLoad();
  </script>
</body>
</html>`;
}
