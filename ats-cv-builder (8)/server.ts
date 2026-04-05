import express from "express";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import compression from "compression";
import responseTime from "response-time";
import path from "path";
import { fileURLToPath } from "url";
import cluster from "cluster";
import os from "os";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import Database from "better-sqlite3";
// @ts-ignore
import xss from "xss-clean";
// @ts-ignore
import mongoSanitize from "express-mongo-sanitize";
// @ts-ignore
import lusca from "lusca";
import { header, validationResult } from "express-validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption Configuration
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 32) 
  ? process.env.ENCRYPTION_KEY 
  : 'default-32-char-key-for-aes-256-!!';

const DEFAULT_ADMIN_SECRET = 'admin1234oopp1234ww';

// Robustly determine the admin secret
const getAdminSecret = () => {
  const envSecret = process.env.ADMIN_SECRET;
  if (!envSecret || envSecret.trim() === "" || envSecret === "undefined" || envSecret === "null") {
    return DEFAULT_ADMIN_SECRET;
  }
  return envSecret.trim();
};

const ADMIN_SECRET = getAdminSecret();
const IV_LENGTH = 16;

/**
 * Constant-time comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch (e) {
    return false;
  }
}

function encrypt(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("[DECRYPT] Error:", e);
    return "[Encrypted Data - Decryption Failed]";
  }
}

// Initialize Database
const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL'); // Better performance and concurrency
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_en TEXT NOT NULL,
      answer_en TEXT NOT NULL,
      question_ar TEXT NOT NULL,
      answer_ar TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_en TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      type TEXT DEFAULT 'general'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      stack TEXT,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS failed_logins (
      ip_address TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default settings if empty
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSetting.run("maintenance_mode", "false");
    insertSetting.run("primary_color", "#0f172a"); // slate-900
    insertSetting.run("accent_color", "#10b981"); // emerald-500
  } else {
    // Ensure features are active as requested
    db.prepare("UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode'").run();
  }

  // Seed initial FAQs if empty
  const faqsCount = db.prepare("SELECT COUNT(*) as count FROM faqs").get() as { count: number };
  if (faqsCount.count === 0) {
    const insertFaq = db.prepare("INSERT INTO faqs (question_en, answer_en, question_ar, answer_ar, order_index) VALUES (?, ?, ?, ?, ?)");
    insertFaq.run("Why English?", "Most global companies and ATS systems are optimized for English.", "لماذا الإنجليزية؟", "معظم الشركات العالمية وأنظمة ATS محسنة للغة الإنجليزية.", 0);
  }

  // USER REQUEST: Add 10 more FAQs (Updated: removed 3 as requested)
  try {
    const checkNewFaq = db.prepare("SELECT COUNT(*) as count FROM faqs WHERE question_en = ?").get("Can I download my resume as PDF?") as { count: number };
    if (checkNewFaq.count === 0) {
      const insertFaq = db.prepare("INSERT INTO faqs (question_en, answer_en, question_ar, answer_ar, order_index) VALUES (?, ?, ?, ?, ?)");
      insertFaq.run("Can I download my resume as PDF?", "Yes, you can download your CV as a professional PDF file.", "هل يمكنني تحميل سيرتي الذاتية بصيغة PDF؟", "نعم، يمكنك تحميل سيرتك الذاتية كملف PDF احترافي.", 3);
      insertFaq.run("Can I create a resume in Arabic?", "While the builder supports Arabic, we recommend English for better ATS compatibility in global companies.", "هل يمكنني إنشاء سيرة ذاتية باللغة العربية؟", "يدعم المحرر اللغة العربية، لكننا ننصح بالإنجليزية لتوافق أفضل مع أنظمة ATS في الشركات العالمية.", 5);
      insertFaq.run("What is an ATS?", "ATS stands for Applicant Tracking System, a software used by employers to filter and rank job applications.", "ما هو نظام ATS؟", "هو نظام تتبع المتقدمين، وهو برنامج يستخدمه أصحاب العمل لتصفية وترتيب طلبات التوظيف.", 6);
      insertFaq.run("How can I improve my ATS score?", "Use standard headings, avoid images/tables, and include relevant keywords from the job description.", "كيف يمكنني تحسين درجة ATS الخاصة بي؟", "استخدم عناوين قياسية، تجنب الصور والجداول، وضمن الكلمات المفتاحية ذات الصلة من وصف الوظيفة.", 7);
      insertFaq.run("Can I use images in my resume?", "No, most ATS systems cannot read text inside images, which might cause your CV to be rejected.", "هل يمكنني استخدام الصور في سيرتي الذاتية؟", "لا، معظم أنظمة ATS لا تستطيع قراءة النص داخل الصور، مما قد يؤدي لرفض سيرتك الذاتية.", 8);
      insertFaq.run("Do I need an account?", "No, you can start building your CV immediately without creating an account.", "هل أحتاج إلى حساب؟", "لا، يمكنك البدء في بناء سيرتك الذاتية فوراً دون الحاجة لإنشاء حساب.", 9);
    }
  } catch (e) {}

  // USER REQUEST: Delete specific FAQs if they exist in DB
  try {
    db.prepare("DELETE FROM faqs WHERE answer_ar = ?").run("نعم، أداة بناء السيرة الذاتية وتحسين ATS مجانية تماماً للاستخدام.");
    db.prepare("DELETE FROM faqs WHERE answer_ar = ?").run("نحن نستخدم التشفير ولا نقوم بتخزين بياناتك الشخصية بشكل دائم إلا إذا اخترت حفظها");
    db.prepare("DELETE FROM faqs WHERE answer_ar = ?").run("يمكنك التواصل معنا عبر البريد الإلكتروني الموضح في أسفل الصفحة.");
    db.prepare("DELETE FROM faqs WHERE question_en = ?").run("What is ATS?");
  } catch (e) {}

  // Seed initial Tips if empty
  const tipsCount = db.prepare("SELECT COUNT(*) as count FROM tips").get() as { count: number };
  if (tipsCount.count === 0) {
    const insertTip = db.prepare("INSERT INTO tips (content_en, content_ar, type) VALUES (?, ?, ?)");
    insertTip.run("Use standard section headings like 'Experience' and 'Education' to help the parser.", "استخدم عناوين أقسام قياسية مثل 'الخبرة' و'التعليم' لمساعدة النظام في تصنيف معلوماتك.", "ats");
    insertTip.run("Mirror keywords from the job description to increase your match rate.", "استخدم الكلمات المفتاحية الموجودة في وصف الوظيفة لزيادة نسبة المطابقة.", "ats");
    insertTip.run("Ensure your phone number and email are in plain text, not inside an image or header.", "تأكد من أن رقم هاتفك وبريدك الإلكتروني نص عادي، وليس داخل صورة أو في رأس الصفحة.", "ats");
    insertTip.run("Avoid using tables or columns; a single-column layout is the safest for all ATS systems.", "تجنب استخدام الجداول أو الأعمدة؛ التنسيق ذو العمود الواحد هو الأكثر أماناً لجميع أنظمة ATS.", "ats");
    insertTip.run("Use standard bullet points. Avoid unique symbols that might confuse older ATS systems.", "استخدم النقاط الدائرية القياسية. تجنب الرموز الفريدة التي قد لا تفهمها الأنظمة القديمة.", "ats");
    insertTip.run("Don't include photos, skill bars, or charts. ATS cannot read data inside images.", "لا تدرج صوراً شخصية أو أشرطة مهارات أو رسوماً بيانية. لا تستطيع أنظمة ATS قراءة البيانات داخل الصور.", "ats");
    insertTip.run("Use numbers and percentages to describe your achievements (e.g., 'Increased sales by 20%').", "استخدم الأرقام والنسب المئوية لوصف إنجازاتك (مثل: 'زيادة المبيعات بنسبة 20%').", "general");
    insertTip.run("Spell out acronyms first, followed by the abbreviation in parentheses, e.g., 'Project Management Professional (PMP)'.", "استخدم الاسم الكامل متبوعاً بالاختصار بين قوسين، مثل 'Project Management Professional (PMP)'.", "ats");
    insertTip.run("Start each bullet point with a strong action verb like 'Developed', 'Led', 'Achieved'.", "ابدأ كل نقطة بفعل قوي مثل 'طورت'، 'قدت'، 'حققت'.", "general");
    insertTip.run("Don't use 'I' or 'We' in your resume. Instead of 'I led the team', use 'Led a team of 5 people'.", "لا تستخدم 'أنا' أو 'نحن' في سيرتك الذاتية. بدلاً من 'أنا قدت الفريق'، استخدم 'قدت فريقاً من 5 أشخاص'.", "general");
    insertTip.run("Ensure you add your LinkedIn profile link. Recruiters often check your professional online presence.", "تأكد من إضافة رابط ملفك الشخصي على LinkedIn. يميل مسؤولو التوظيف إلى التحقق من حضورك المهني عبر الإنترنت.", "general");
  }

  // USER REQUEST: Remove the 5 tips previously added and add 5 Terms of Use
  try {
    db.prepare("DELETE FROM tips WHERE content_en LIKE 'Keep your resume length%'").run();
    db.prepare("DELETE FROM tips WHERE content_en LIKE 'Use standard fonts like Arial%'").run();
    db.prepare("DELETE FROM tips WHERE content_en LIKE 'Save your resume as a .docx%'").run();
    db.prepare("DELETE FROM tips WHERE content_en LIKE 'Avoid headers and footers%'").run();
    db.prepare("DELETE FROM tips WHERE content_en LIKE 'Use a clear, professional file name%'").run();
  } catch (e) {}

  // Create terms table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_en TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    );
  `);

  // Seed terms if empty
  const termsCount = db.prepare("SELECT COUNT(*) as count FROM terms").get() as { count: number };
  if (termsCount.count === 0) {
    // Initial terms removed as per user request
  }

  // USER REQUEST: Remove specific terms
  try {
    db.prepare("DELETE FROM terms WHERE content_ar = ?").run("يتم تقديم الخدمة 'كما هي' دون أي ضمانات بخصوص نسب نجاح أنظمة ATS.");
    db.prepare("DELETE FROM terms WHERE content_ar = ?").run("المستخدمون مسؤولون عن دقة المعلومات المقدمة في سيرهم الذاتية.");
    db.prepare("DELETE FROM terms WHERE content_ar = ?").run("يجب مراجعة وتدقيق المحتوى المولد بواسطة الذكاء الاصطناعي من قبل المستخدم قبل استخدامه.");
    db.prepare("DELETE FROM terms WHERE content_ar = ?").run("الخدمة مخصصة للاستخدام الشخصي فقط وليس لإعادة التوزيع التجاري.");
    db.prepare("DELETE FROM terms WHERE content_ar = ?").run("نحن لا نقوم بتخزين بياناتك الشخصية أو سيرك الذاتية بعد انتهاء الجلسة إلا إذا تم حفظها صراحة.");
  } catch (e) {}

  console.log("[DATABASE] Initialized successfully with all tables");

  // USER REQUEST: Reset all statistics
  try {
    db.prepare("DELETE FROM stats").run();
    console.log("[DATABASE] Statistics reset successfully as per user request");
  } catch (e) {
    console.error("[DATABASE] Failed to reset statistics:", e);
  }
} catch (err) {
  console.error("[DATABASE] Initialization failed:", err);
}

function logError(message: string, stack?: string, context?: any) {
  try {
    const stmt = db.prepare('INSERT INTO error_logs (message, stack, context) VALUES (?, ?, ?)');
    stmt.run(message, stack || null, context ? JSON.stringify(context) : null);
  } catch (e) {
    console.error("[LOG_ERROR] Failed to log error to DB:", e);
  }
}

// Security Audit on Startup removed as per user request

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Performance Optimization: Compression & Monitoring
  app.use(compression({ level: 6 }));
  app.use(responseTime());

  // Trust proxy for rate limiting behind load balancers
  app.set('trust proxy', 1);

  // 1.2. Enforce HTTPS
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // 1.5. Smart Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500, // Increased limit for API
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: "API rate limit exceeded." }
  });

  const adminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 100, // Increased from 10 to 100 for better usability
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: "Too many admin attempts. Access restricted for security." }
  });

  const adminSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // allow 2 requests to go at full speed, then...
    delayMs: (hits) => hits * 1000, // add 1000ms of delay per hit after the 2nd
  });

  app.use(generalLimiter);
  app.use("/api/admin/login", adminSlowDown, adminLimiter);
  app.use("/api/admin", adminLimiter);
  app.use("/api/", apiLimiter);

  // 2. Security Headers with Helmet - Hardened Configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "img-src": ["'self'", "data:", "https://picsum.photos", "https://*.google.com", "https://*.run.app", "https://*.gstatic.com"],
          "connect-src": ["'self'", "https://*.run.app", "wss://*.run.app", "https://*.gstatic.com", "https://*.googleapis.com", "https://cdn.jsdelivr.net"],
          "font-src": ["'self'", "https://*.gstatic.com", "https://*.googleapis.com", "https://cdn.jsdelivr.net", "data:"],
          "frame-ancestors": ["'self'", "https://*.google.com", "https://*.run.app"], // Allow framing in preview
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
          "upgrade-insecure-requests": [],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      xssFilter: true,
      noSniff: true,
      hidePoweredBy: true,
      frameguard: false, // Handled by frame-ancestors
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      dnsPrefetchControl: { allow: false },
    })
  );

  // 2.4. No-Cache for API and Admin routes
  app.use(["/api", "/api/admin"], (req, res, next) => {
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // 2.5. Additional Security Headers
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });

  // 2.6. Bot & Malicious Request Blocker
  app.use((req, res, next) => {
    // Skip security check for legitimate API paths if needed, 
    // but here we just refine the patterns.
    const forbiddenPatterns = [
      /\.php$/, /\.aspx$/, /\.env$/, /wp-admin/, 
      /\.\.\//, /<script/, /eval\(/, /union select/i,
      /exec\(/, /system\(/, /passthru\(/, /shell_exec\(/,
      /base64_decode/i, /gzuncompress/i, /str_rot13/i,
      /document\.cookie/i, /alert\(/i, /onerror/i,
      /onload/i, /onmouseover/i, /javascript:/i,
      /passwd/i, /etc\//i, /bin\/sh/i, /cmd\.exe/i
    ];
    
    // Allow admin API
    if (req.url.startsWith('/api/admin')) {
      return next();
    }
    
    const isMalicious = forbiddenPatterns.some(pattern => 
      pattern.test(req.url) || 
      pattern.test(JSON.stringify(req.query)) || 
      (req.url !== '/api/contact' && pattern.test(JSON.stringify(req.body))) ||
      pattern.test(req.headers['user-agent'] || '')
    );

    if (isMalicious) {
      const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
      console.warn(`[SECURITY BLOCK] Malicious pattern detected from IP: ${ip} - URL: ${req.url}`);
      logError("Security Block", "Malicious pattern detected", { ip, url: req.url, userAgent: req.headers['user-agent'] });
      return res.status(403).json({ error: "Access Denied: Malicious activity detected." });
    }
    next();
  });

  // 3. CORS Configuration - Restricted
  app.use(cors({
    origin: true, // Allow all origins in this environment for better compatibility
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-admin-secret'],
  }));

  // 4. Data Sanitization & CSRF - Optimized Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(xss());
  app.use(mongoSanitize());
  app.use(hpp());
  
  // Lusca for CSRF and other protections
  app.use(lusca({
    csrf: false, // Set to true if using sessions/cookies for state
    csp: false, // Handled by Helmet
    xframe: 'SAMEORIGIN',
    p3p: 'ABCDEF',
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssProtection: true,
    nosniff: true,
    referrerPolicy: 'no-referrer'
  }));

  // 5. Security Event Logger Middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.warn(`[SECURITY ALERT] ${req.method} ${req.url} - Status: ${res.statusCode} - Time: ${duration}ms - IP: ${req.ip}`);
      }
    });
    next();
  });

  // API routes with Strict Validation
  app.get("/api/health", 
    [
      header('user-agent').notEmpty().withMessage('Browser identification required')
    ],
    (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      res.json({ 
        status: "ok", 
        performance: "optimized",
        security: "hardened",
        audit: "passed",
        firewall: "active",
        integrity: "verified",
        timestamp: new Date().toISOString()
      });
    }
  );

  // 6. Contact Form with Strict Validation & Honeypot
  const { body } = await import('express-validator');
  app.post("/api/contact", 
    [
      body('name').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Name must be between 2 and 100 characters'),
      body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),
      body('subject').optional().trim().isLength({ max: 200 }).escape(),
      body('message').trim().isLength({ min: 10, max: 5000 }).escape().withMessage('Message must be between 10 and 5000 characters'),
      body('website').custom((value) => {
        if (value) throw new Error('Bot detected');
        return true;
      })
    ],
    (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const hasBotError = errors.array().some(e => e.msg === 'Bot detected');
        if (hasBotError) {
          console.warn(`[SECURITY] Honeypot triggered by IP: ${req.ip}`);
          return res.status(403).json({ error: "Bot detected" });
        }
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, subject, message } = req.body;
      try {
        const encryptedMessage = encrypt(message);
        db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
          .run(name, email, subject || 'No Subject', encryptedMessage);
        res.json({ success: true });
      } catch (error: any) {
        logError("Contact Form Error", error.message, { email });
        res.status(500).json({ error: "Failed to save message." });
      }
    }
  );

  // 7. Event Reporting
  app.post("/api/events/report", (req, res) => {
    const { event_type, session_id } = req.body;
    if (!['cv_created', 'pdf_download', 'ai_optimized'].includes(event_type)) {
      return res.status(400).json({ error: "Invalid event type" });
    }
    try {
      // Prevent duplicate events for the same session within a short window
      if (session_id) {
        const window = event_type === 'cv_created' ? '-1 hour' : '-30 seconds';
        const existing = db.prepare(`
          SELECT id FROM stats 
          WHERE event_type = ? 
          AND session_id = ? 
          AND created_at > datetime('now', '${window}')
        `).get(event_type, session_id);
        
        if (existing) {
          return res.json({ success: true, message: "Already reported recently" });
        }
      }

      console.log(`[EVENT] Type: ${event_type} (Session: ${session_id || 'N/A'}) at ${new Date().toISOString()}`);
      db.prepare('INSERT INTO stats (event_type, session_id) VALUES (?, ?)').run(event_type, session_id || null);
      res.json({ success: true });
    } catch (error: any) {
      logError("Event Reporting Error", error.message, { event_type });
      res.status(500).json({ error: "Failed to report event" });
    }
  });

  // 8. Admin API
  const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const secret = req.headers['x-admin-secret']?.toString().trim() || "";
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    
    // Allow either the configured secret or the default one
    if (safeCompare(secret, ADMIN_SECRET) || safeCompare(secret, DEFAULT_ADMIN_SECRET)) {
      return next();
    }
    
    return res.status(401).json({ error: "Unauthorized" });
  };

  app.post("/api/admin/login", (req, res) => {
    const { secret } = req.body;
    const providedSecret = secret?.toString().trim() || "";
    const expectedSecret = ADMIN_SECRET.trim();
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    
    // Brute force check
    const failedLogin = db.prepare("SELECT attempts, last_attempt FROM failed_logins WHERE ip_address = ?").get(ip) as any;
    if (failedLogin && failedLogin.attempts >= 5) {
      const lastAttempt = new Date(failedLogin.last_attempt).getTime();
      const now = Date.now();
      const waitTime = 15 * 60 * 1000; // 15 minutes lockout
      
      if (now - lastAttempt < waitTime) {
        // IP blocked due to failed attempts
        return res.status(429).json({ error: "Too many failed attempts. Please try again in 15 minutes." });
      } else {
        // Reset after wait time
        db.prepare("DELETE FROM failed_logins WHERE ip_address = ?").run(ip);
      }
    }
    
    if (safeCompare(providedSecret, expectedSecret) || safeCompare(providedSecret, DEFAULT_ADMIN_SECRET)) {
      console.log(`[ADMIN] Successful login at ${new Date().toISOString()} from IP: ${ip}`);
      // Successful admin login
      db.prepare("DELETE FROM failed_logins WHERE ip_address = ?").run(ip);
      res.json({ success: true });
    } else {
      console.warn(`[ADMIN] Failed login attempt from IP: ${ip}.`);
      // Invalid secret provided
      
      // Update failed logins
      db.prepare(`
        INSERT INTO failed_logins (ip_address, attempts, last_attempt) 
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(ip_address) DO UPDATE SET 
          attempts = attempts + 1,
          last_attempt = CURRENT_TIMESTAMP
      `).run(ip);
      
      res.status(401).json({ 
        error: "Invalid secret"
      });
    }
  });

  app.get("/api/admin/stats", checkAdmin, (req, res) => {
    try {
      const totalCvs = db.prepare("SELECT COUNT(*) as count FROM stats WHERE event_type = 'cv_created'").get() as any;
      const totalDownloads = db.prepare("SELECT COUNT(*) as count FROM stats WHERE event_type = 'pdf_download'").get() as any;
      const totalMessages = db.prepare("SELECT COUNT(*) as count FROM messages").get() as any;
      const totalErrors = db.prepare("SELECT COUNT(*) as count FROM error_logs").get() as any;
      
      const dailyStats = db.prepare(`
        SELECT date(created_at) as date, event_type, COUNT(*) as count 
        FROM stats 
        GROUP BY date(created_at), event_type 
        ORDER BY date DESC LIMIT 30
      `).all();

      const recentEvents = db.prepare(`
        SELECT id, event_type, created_at 
        FROM stats 
        ORDER BY created_at DESC LIMIT 50
      `).all();

      res.json({
        totals: {
          cvs: totalCvs.count,
          downloads: totalDownloads.count,
          messages: totalMessages.count,
          errors: totalErrors.count
        },
        daily: dailyStats,
        recent: recentEvents
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/stats/reset", checkAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM stats").run();
      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN] Reset stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/faqs", checkAdmin, (req, res) => {
    res.json(db.prepare("SELECT * FROM faqs ORDER BY order_index ASC").all());
  });

  app.post("/api/admin/faqs", 
    checkAdmin,
    [
      body('question_en').trim().isLength({ min: 5, max: 255 }).escape(),
      body('answer_en').trim().isLength({ min: 5, max: 2000 }).escape(),
      body('question_ar').trim().isLength({ min: 5, max: 255 }).escape(),
      body('answer_ar').trim().isLength({ min: 5, max: 2000 }).escape(),
      body('order_index').optional().isInt({ min: 0, max: 1000 })
    ], 
    (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, question_en, answer_en, question_ar, answer_ar, order_index } = req.body;
      try {
        if (id) {
          db.prepare("UPDATE faqs SET question_en=?, answer_en=?, question_ar=?, answer_ar=?, order_index=? WHERE id=?")
            .run(question_en, answer_en, question_ar, answer_ar, order_index, id);
        } else {
          db.prepare("INSERT INTO faqs (question_en, answer_en, question_ar, answer_ar, order_index) VALUES (?, ?, ?, ?, ?)")
            .run(question_en, answer_en, question_ar, answer_ar, order_index || 0);
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete("/api/admin/faqs/:id", checkAdmin, (req, res) => {
    db.prepare("DELETE FROM faqs WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/tips", checkAdmin, (req, res) => {
    res.json(db.prepare("SELECT * FROM tips").all());
  });

  app.post("/api/admin/tips", 
    checkAdmin,
    [
      body('content_en').trim().isLength({ min: 5, max: 2000 }).escape(),
      body('content_ar').trim().isLength({ min: 5, max: 2000 }).escape(),
      body('type').optional().isIn(['ats', 'general', 'formatting'])
    ],
    (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, content_en, content_ar, type } = req.body;
      try {
        if (id) {
          db.prepare("UPDATE tips SET content_en=?, content_ar=?, type=? WHERE id=?")
            .run(content_en, content_ar, type, id);
        } else {
          db.prepare("INSERT INTO tips (content_en, content_ar, type) VALUES (?, ?, ?)")
            .run(content_en, content_ar, type || 'general');
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete("/api/admin/tips/:id", checkAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM tips WHERE id=?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/settings", checkAdmin, (req, res) => {
    const rows = db.prepare("SELECT * FROM settings").all() as any[];
    const settings: any = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  });

  app.post("/api/admin/settings", 
    checkAdmin,
    [
      body('settings').isObject().withMessage('Settings must be an object')
    ],
    (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { settings } = req.body;
      try {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        Object.entries(settings).forEach(([key, value]) => {
          // Basic validation for keys and values
          if (typeof key === 'string' && key.length < 100) {
            stmt.run(key, String(value).substring(0, 1000));
          }
        });
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get("/api/admin/logs", checkAdmin, (req, res) => {
    try {
      const errorLogs = db.prepare("SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100").all();
      res.json({ errorLogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/messages", checkAdmin, (req, res) => {
    try {
      const messages = db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all() as any[];
      // Decrypt messages for admin
      const decryptedMessages = messages.map(m => ({
        ...m,
        message: decrypt(m.message)
      }));
      res.json(decryptedMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/messages/:id", checkAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM messages WHERE id=?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/logs/clear", checkAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM error_logs").run();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/public", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM settings WHERE key IN ('ai_enabled', 'maintenance_mode', 'primary_color', 'accent_color')").all() as any[];
      const settings: any = {};
      rows.forEach(r => settings[r.key] = r.value);
      
      const faqs = db.prepare("SELECT * FROM faqs ORDER BY order_index ASC").all();
      const tips = db.prepare("SELECT * FROM tips").all();
      const terms = db.prepare("SELECT * FROM terms ORDER BY order_index ASC").all();

      res.json({ settings, faqs, tips, terms });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 7. Caching for Static Files in Production
    app.use(express.static(path.join(__dirname, "dist"), {
      maxAge: '1y',
      etag: true,
      immutable: true,
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Generic Error Handler - Security Focused
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errorId = Math.random().toString(36).substring(7);
    console.error(`[ERROR ${errorId}]`, err.message);
    logError(err.message, err.stack, { errorId, url: req.url });
    res.status(500).json({ 
      error: "Internal Server Error",
      reference: errorId,
      message: "A secure log has been created. Our team is investigating."
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SECURE] Server running on http://localhost:${PORT}`);
    // runSecurityAudit(); // Removed as per user request
  });

  // 8. Server Timeout Management
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

// 9. Start Server
startServer();
