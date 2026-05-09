module.exports = {
  apps: [{
    name: '3agamemaster',
    script: 'server.js',
    cwd: '/opt/3agamemaster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/3agamemaster-error.log',
    out_file: '/var/log/3agamemaster-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
}
