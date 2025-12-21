module.exports = {
  apps: [
    {
      name: "wedding.example.com",
      script: "./dist/server/entry.mjs",
      instances: 1,
      exec_mode: "fork",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 4321,
      },
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      ignore_watch: [
        "node_modules",
        "wedding.db",
        "wedding.db-journal",
        "logs",
        ".env",
      ],
    },
  ],
};
