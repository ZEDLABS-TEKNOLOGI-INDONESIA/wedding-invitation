module.exports = {
  apps: [
    {
      name: "wedding.zedlabs.id",
      script: "./dist/server/entry.mjs",
      instances: 1,
      exec_mode: "fork",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 5432,
      },
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      ignore_watch: [
        "node_modules",
        "database",
        "wedding.db*",
        "logs",
        ".env",
      ],
    },
  ],
};
