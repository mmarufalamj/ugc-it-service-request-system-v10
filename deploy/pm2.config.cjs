module.exports = {
  apps: [
    {
      name: "ugc-it-service",
      script: "scripts/start-production.mjs",
      cwd: __dirname + "/..",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "768M",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      time: true,
    },
  ],
};
