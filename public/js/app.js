// ==============================================================================
// CloudPulse - Client-Side App Logic & Interactive Guide Engine
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusPill = document.getElementById('server-status-pill');
  const statusText = document.getElementById('status-text');
  const latencyText = document.getElementById('latency-text');
  
  // Metrics elements
  const metricHostname = document.getElementById('metric-hostname');
  const metricPlatform = document.getElementById('metric-platform');
  const metricEnvBadge = document.getElementById('metric-env-badge');
  const metricUptime = document.getElementById('metric-uptime');
  const metricPid = document.getElementById('metric-pid');
  const metricNodeVersion = document.getElementById('metric-node-version');
  const metricMemPercent = document.getElementById('metric-mem-percent');
  const metricMemDetail = document.getElementById('metric-mem-detail');
  const memProgressBar = document.getElementById('mem-progress-bar');
  const metricCpuCores = document.getElementById('metric-cpu-cores');
  const metricCpuLoad = document.getElementById('metric-cpu-load');

  // Proxy / Cloud badges
  const nginxStatusBadge = document.getElementById('nginx-status-badge');
  const cloudStatusBadge = document.getElementById('cloud-status-badge');
  const clientIpText = document.getElementById('client-ip-text');

  // Command Generator Inputs
  const inputEc2Ip = document.getElementById('input-ec2-ip');
  const inputKeyName = document.getElementById('input-key-name');
  const inputDomain = document.getElementById('input-domain');

  // Command Code Blocks
  const cmdSsh = document.getElementById('cmd-ssh');
  const cmdPm2 = document.getElementById('cmd-pm2');
  const cmdNginx = document.getElementById('cmd-nginx');
  const cmdSsl = document.getElementById('cmd-ssl');

  // API Tester elements
  const btnRefreshMetrics = document.getElementById('btn-refresh-metrics');
  const consoleReqPath = document.getElementById('console-req-path');
  const consoleStatusCode = document.getElementById('console-status-code');
  const consoleLatency = document.getElementById('console-latency');
  const consoleResponseBody = document.getElementById('console-response-body');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // ----------------------------------------------------------------------------
  // 1. Fetch & Display Live Server Metrics
  // ----------------------------------------------------------------------------
  async function fetchServerMetrics() {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/system');
      const latency = Math.round(performance.now() - startTime);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Update Navigation Status
      statusText.textContent = 'Server: Online (Healthy)';
      latencyText.textContent = `${latency} ms`;
      statusPill.style.background = 'rgba(16, 185, 129, 0.12)';
      statusPill.style.borderColor = 'rgba(16, 185, 129, 0.35)';

      // Host & Platform
      metricHostname.textContent = data.server.hostname;
      metricPlatform.textContent = `${data.server.platform} (${data.server.release})`;
      metricEnvBadge.textContent = data.server.environment;
      metricEnvBadge.className = data.server.environment === 'production' ? 'badge' : 'badge';

      // Uptime & Node info
      metricUptime.textContent = data.server.uptime;
      metricPid.textContent = data.server.pid;
      metricNodeVersion.textContent = data.server.nodeVersion;

      // RAM Usage
      const memPercent = data.resources.memUsagePercent;
      metricMemPercent.textContent = `${memPercent}%`;
      metricMemDetail.textContent = `${data.resources.usedMemoryMB} / ${data.resources.totalMemoryMB} MB`;
      memProgressBar.style.width = `${memPercent}%`;
      
      if (memPercent > 80) {
        memProgressBar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)';
      } else {
        memProgressBar.style.background = 'linear-gradient(90deg, var(--emerald) 0%, var(--violet) 100%)';
      }

      // CPU Info
      metricCpuCores.textContent = `${data.resources.cpuCores} Core${data.resources.cpuCores > 1 ? 's' : ''}`;
      metricCpuLoad.textContent = `Load Avg: [${data.resources.loadAverage.join(', ')}]`;

      // Reverse Proxy / Nginx Inspection
      if (data.proxy.nginxDetected) {
        nginxStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Reverse Proxy Active (Nginx)';
        nginxStatusBadge.className = 'env-status active';
      } else {
        nginxStatusBadge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Direct Connection (No Nginx proxy)';
        nginxStatusBadge.className = 'env-status warning';
      }

      // Cloud Infrastructure Detection
      if (data.server.isAwsEc2) {
        cloudStatusBadge.innerHTML = '<i class="fa-brands fa-aws"></i> AWS EC2 Ubuntu Detected';
        cloudStatusBadge.className = 'env-status active';
      } else {
        cloudStatusBadge.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Local Dev Machine';
        cloudStatusBadge.className = 'env-status';
      }

      clientIpText.textContent = data.proxy.clientIp || '127.0.0.1';

    } catch (err) {
      console.error('Error fetching metrics:', err);
      statusText.textContent = 'Server: Disconnected';
      latencyText.textContent = 'Offline';
      statusPill.style.background = 'rgba(239, 68, 68, 0.12)';
      statusPill.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    }
  }

  // Initial fetch and auto-refresh every 5 seconds
  fetchServerMetrics();
  setInterval(fetchServerMetrics, 5000);

  if (btnRefreshMetrics) {
    btnRefreshMetrics.addEventListener('click', () => {
      fetchServerMetrics();
      showToast('Telemetry refreshed!');
    });
  }

  // ----------------------------------------------------------------------------
  // 2. Dynamic Command Generator (Auto-updates with user IP, key, domain)
  // ----------------------------------------------------------------------------
  function updateGeneratedCommands() {
    const ip = (inputEc2Ip.value.trim() || '13.233.54.120');
    const key = (inputKeyName.value.trim() || 'my-ec2-key.pem');
    const domain = (inputDomain.value.trim() || 'cloudpulse.example.com');

    // Update displays inside text
    document.querySelectorAll('.key-name-display').forEach(el => el.textContent = key);

    // Step 2: SSH
    cmdSsh.textContent = `# 1. Set strict read-only permissions for your private key
chmod 400 ${key}

# 2. SSH into your Ubuntu instance as the default 'ubuntu' user
ssh -i ${key} ubuntu@${ip}`;

    // Step 5: Nginx
    cmdNginx.textContent = `# Install Nginx
sudo apt install -y nginx

# Copy the pre-configured Nginx file to sites-available
sudo cp /var/www/cloudpulse-app/nginx/cloudpulse.conf /etc/nginx/sites-available/cloudpulse

# Update server_name with your EC2 Public IP or Domain
sudo sed -i 's/YOUR_EC2_PUBLIC_IP_OR_DOMAIN/${domain || ip}/g' /etc/nginx/sites-available/cloudpulse

# Enable the site and remove default site
sudo ln -sf /etc/nginx/sites-available/cloudpulse /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax and reload
sudo nginx -t && sudo systemctl restart nginx

# Verify Nginx status
sudo systemctl status nginx --no-pager`;

    // Step 6: SSL
    cmdSsl.textContent = `# Configure UFW (Uncomplicated Firewall)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

# Optional: Add Free HTTPS / SSL with Certbot (Requires domain pointing to ${ip})
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ${domain}`;
  }

  [inputEc2Ip, inputKeyName, inputDomain].forEach(input => {
    input.addEventListener('input', updateGeneratedCommands);
  });

  // ----------------------------------------------------------------------------
  // 3. Copy-to-Clipboard Functionality
  // ----------------------------------------------------------------------------
  document.querySelectorAll('.btn-copy').forEach(button => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-target');
      const targetCode = document.getElementById(targetId);
      if (!targetCode) return;

      try {
        await navigator.clipboard.writeText(targetCode.textContent.trim());
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        button.classList.add('copied');
        showToast('Command copied to clipboard!');

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  });

  function showToast(msg) {
    if (!toast) return;
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ----------------------------------------------------------------------------
  // 4. Interactive Architecture Diagram Node Inspection
  // ----------------------------------------------------------------------------
  const archNodes = document.querySelectorAll('.arch-node');
  const archTag = document.getElementById('arch-tag');
  const archTitle = document.getElementById('arch-title');
  const archPort = document.getElementById('arch-port');
  const archDesc = document.getElementById('arch-desc');
  const archConfigLabel = document.getElementById('arch-config-label');
  const archCode = document.getElementById('arch-code');

  const archData = {
    client: {
      tag: 'CLIENT LAYER',
      title: 'Public Web Browsers & Mobile Clients',
      port: 'Ports: 80 (HTTP) & 443 (HTTPS)',
      desc: 'Users open your EC2 Public IP or registered domain in any web browser. Inbound requests travel over the public internet, resolving your Elastic/Public IP and reaching the AWS VPC edge.',
      configLabel: 'Internet Inbound URL:',
      code: 'http://<ec2-public-ip>  or  https://yourdomain.com'
    },
    sg: {
      tag: 'FIREWALL LAYER (AWS CLOUD)',
      title: 'AWS EC2 Security Group',
      port: 'Virtual Firewall Inbound Rules',
      desc: 'Security Groups act as virtual firewalls at the hypervisor level before traffic reaches Ubuntu. You must explicitly allow inbound SSH (port 22) for administration, HTTP (port 80) for web visitors, and HTTPS (port 443) for encrypted SSL traffic.',
      configLabel: 'Security Group Inbound Rules Checklist:',
      code: 'Type: SSH   | Port: 22  | Source: My IP (or 0.0.0.0/0)\nType: HTTP  | Port: 80  | Source: 0.0.0.0/0 (Anywhere)\nType: HTTPS | Port: 443 | Source: 0.0.0.0/0 (Anywhere)'
    },
    nginx: {
      tag: 'REVERSE PROXY LAYER (UBUNTU)',
      title: 'Nginx High-Performance Web Server',
      port: 'Listening on: Port 80 / 443 -> Forwarding to: 127.0.0.1:5000',
      desc: 'Nginx intercepts all incoming web traffic. It provides SSL termination, security headers, Gzip compression, and proxies incoming requests internally to your Node.js application running on port 5000. This avoids having to run Node.js as the root user.',
      configLabel: 'Nginx Proxy Configuration (/etc/nginx/sites-available/cloudpulse):',
      code: 'location / {\n    proxy_pass http://127.0.0.1:5000;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n}'
    },
    pm2: {
      tag: 'PROCESS MANAGER LAYER (NODE)',
      title: 'PM2 Production Daemon',
      port: 'CLI Monitoring & Cluster Control',
      desc: 'PM2 keeps your Node.js app alive 24/7. If an unhandled exception or bug crashes the Node process, PM2 restarts it in milliseconds. It also saves your process state so your application automatically starts up when the EC2 instance is rebooted.',
      configLabel: 'PM2 Ecosystem Config (ecosystem.config.cjs):',
      code: 'pm2 start ecosystem.config.cjs --env production\npm2 startup\npm2 save'
    },
    app: {
      tag: 'APPLICATION LAYER (EXPRESS)',
      title: 'CloudPulse Express Application',
      port: 'Internal Bind: 127.0.0.1:5000',
      desc: 'The core backend application listening on local port 5000. It handles business logic, database queries, API routing, and renders static UI assets. It reads real-time server health and logs all access.',
      configLabel: 'Internal Server Initialization (server.js):',
      code: 'const PORT = process.env.PORT || 5000;\napp.listen(PORT, "0.0.0.0", () => {\n  console.log(`CloudPulse listening on port ${PORT}`);\n});'
    }
  };

  archNodes.forEach(node => {
    node.addEventListener('click', () => {
      archNodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const key = node.getAttribute('data-node');
      const item = archData[key];
      if (!item) return;

      archTag.textContent = item.tag;
      archTitle.textContent = item.title;
      archPort.textContent = item.port;
      archDesc.textContent = item.desc;
      archConfigLabel.innerHTML = `<i class="fa-solid fa-file-code"></i> ${item.configLabel}`;
      archCode.querySelector('code').textContent = item.code;
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Live API Endpoint Inspector
  // ----------------------------------------------------------------------------
  const apiTabs = document.querySelectorAll('.btn-api-tab');

  apiTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      apiTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const endpoint = tab.getAttribute('data-endpoint');
      const method = tab.getAttribute('data-method');

      consoleReqPath.textContent = `${method} ${endpoint}`;
      consoleResponseBody.textContent = 'Executing request...';
      consoleStatusCode.textContent = 'Status: Pending';
      consoleLatency.textContent = 'Latency: -- ms';

      const startTime = performance.now();
      try {
        let response;
        if (method === 'GET') {
          response = await fetch(endpoint);
        } else {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              test: 'Hello AWS EC2!',
              clientTime: new Date().toISOString(),
              target: 'CloudPulse'
            })
          });
        }

        const duration = Math.round(performance.now() - startTime);
        const data = await response.json();

        consoleStatusCode.textContent = `Status: ${response.status} ${response.statusText || 'OK'}`;
        consoleStatusCode.style.color = response.ok ? 'var(--emerald)' : 'var(--rose)';
        consoleLatency.textContent = `Latency: ${duration} ms`;
        consoleResponseBody.textContent = JSON.stringify(data, null, 2);

      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        consoleStatusCode.textContent = `Status: Failed (${err.message})`;
        consoleStatusCode.style.color = 'var(--rose)';
        consoleLatency.textContent = `Latency: ${duration} ms`;
        consoleResponseBody.textContent = JSON.stringify({ error: err.message }, null, 2);
      }
    });
  });

  // Run first API test on load
  const initialApiBtn = document.getElementById('btn-api-health');
  if (initialApiBtn) {
    initialApiBtn.click();
  }
});
