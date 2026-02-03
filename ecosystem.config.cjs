/**
 * PM2 Ecosystem Configuration
 * Task.filewas - Otonom AI Proje Gelistirme Platformu
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart task-filewas-backend
 *   pm2 logs task-filewas-backend
 *   pm2 stop task-filewas-backend
 *   pm2 delete task-filewas-backend
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'task-filewas-backend',

      // Script to run
      script: './dist/index.js',

      // Current working directory (project root)
      cwd: '/var/www/task.filewas/backend',

      // Interpreter
      interpreter: 'node',

      // Instances (1 for production, can be increased with cluster mode)
      instances: 1,

      // Execution mode (fork for single instance, cluster for multiple)
      exec_mode: 'fork',

      // Watch files (disabled in production for performance)
      watch: false,

      // Auto restart on failure
      autorestart: true,

      // Maximum restarts within 1 minute before giving up
      max_restarts: 10,

      // Minimum uptime to consider app as started (1 minute)
      min_uptime: '1m',

      // Restart delay (ms)
      restart_delay: 4000,

      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Use environment based on NODE_ENV
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Log files
      error_file: '/var/www/task.filewas/logs/pm2-error.log',
      out_file: '/var/www/task.filewas/logs/pm2-out.log',
      log_file: '/var/www/task.filewas/logs/pm2-combined.log',

      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Memory limits (restart if exceeds)
      max_memory_restart: '1G',

      // Graceful shutdown timeout
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Source map support for error tracking
      source_map_support: true,

      // Instance variables
      instance_var: 'INSTANCE_ID',

      // DisableInteract (prevent stdin)
      disable_interact: true,
    },
  ],

  // Deploy configuration (optional - for future use)
  // deploy: {
  //   production: {
  //     user: 'node',
  //     host: '31.97.55.184',
  //     ref: 'origin/main',
  //     repo: 'git@github.com:username/task.filewas.git',
  //     path: '/var/www/task.filewas',
  //     'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
  //     'pre-setup': 'apt-get install git',
  //   },
  // },
}
