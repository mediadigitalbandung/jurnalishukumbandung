module.exports = {
  apps: [
    {
      name: "jhb",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/jhb",
      instances: "max", // Use all 4 CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Graceful restart
      listen_timeout: 10000,
      kill_timeout: 5000,
      // Auto-restart on memory leak
      max_memory_restart: "512M",
      // Logging
      error_file: "/var/www/jhb/logs/pm2-error.log",
      out_file: "/var/www/jhb/logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
