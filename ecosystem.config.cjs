module.exports = {
  apps: [
    {
      name: 'cloudpulse-app',
      script: './server.js',
      instances: 1, // On AWS EC2 t2.micro (1 vCPU, 1GB RAM), 1 instance is ideal
      exec_mode: 'fork', // or 'cluster' for multi-core instances (t3.medium, c5, etc.)
      autorestart: true,
      watch: false,
      max_memory_restart: '350M', // Prevents memory leaks from crashing the 1GB RAM EC2 instance
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true
    }
  ]
};
