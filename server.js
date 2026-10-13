const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust reverse proxy (e.g., Nginx) headers
app.set('trust proxy', true);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms (IP: ${clientIp})`);
  });
  next();
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to format uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    pm2: Boolean(process.env.pm_id !== undefined || process.env.PM2_HOME),
    pmId: process.env.pm_id || null,
    nodeVersion: process.version
  });
});

app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
  const loadAvg = os.loadavg();

  // Inspect proxy headers from Nginx
  const forwardedFor = req.headers['x-forwarded-for'] || null;
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol;
  const hostHeader = req.headers['host'] || null;
  const nginxDetected = Boolean(req.headers['x-forwarded-for'] || req.headers['x-real-ip']);

  // Detect cloud environment
  const hostname = os.hostname();
  const isAwsEc2 = hostname.startsWith('ip-') || hostname.startsWith('ec2-') || Boolean(process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV);

  res.json({
    server: {
      hostname: hostname,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
      isAwsEc2: isAwsEc2
    },
    resources: {
      totalMemoryMB: Math.round(totalMem / (1024 * 1024)),
      freeMemoryMB: Math.round(freeMem / (1024 * 1024)),
      usedMemoryMB: Math.round(usedMem / (1024 * 1024)),
      memUsagePercent: parseFloat(memUsagePercent),
      cpuCores: cpus.length,
      cpuModel: cpuModel,
      loadAverage: loadAvg.map(val => parseFloat(val.toFixed(2)))
    },
    proxy: {
      nginxDetected: nginxDetected,
      clientIp: forwardedFor || req.socket.remoteAddress,
      forwardedProto: forwardedProto,
      hostHeader: hostHeader
    }
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    message: 'Echo response received successfully',
    payload: req.body,
    receivedAt: new Date().toISOString()
  });
});

// Root fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const server = app.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CloudPulse App running at http://${HOST}:${PORT}`);
  console.log(`📦 Process ID (PID): ${process.pid}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ PM2 Managed: ${Boolean(process.env.pm_id !== undefined)}`);
  console.log(`======================================================\n`);
});

// Graceful Shutdown for PM2 & systemd
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('✅ HTTP server closed gracefully. Exiting process.');
    process.exit(0);
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error('⚠️ Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
