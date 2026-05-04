module.exports = {
  apps: [{
    name: 'ugc-it-service',
    script: './server.ts',
    interpreter: 'node',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/ugc-it-service/logs/error.log',
    out_file: '/var/www/ugc-it-service/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
