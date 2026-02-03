# Task.filewas Deployment Guide

> **Version:** 0.1.0
> **Platform:** Ubuntu 24.04 LTS
> **Node.js:** 22+

## Sistem Gereksinimleri

### Minimum
| Kaynak | Değer |
|--------|-------|
| CPU | 2 Core |
| RAM | 4 GB |
| Disk | 50 GB NVMe/SSD |

### Önerilen
| Kaynak | Değer |
|--------|-------|
| CPU | 4+ Core |
| RAM | 8+ GB |
| Disk | 100+ GB NVMe |

---

## Kurulum Adımları

### 1. Sistem Hazırlığı

```bash
# Sistem güncelleme
sudo apt update && sudo apt upgrade -y

# Gerekli paketler
sudo apt install -y curl git nginx sqlite3

# Node.js 22 kurulumu (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Yüklemeleri kontrol et
node --version  # v22.x.x
npm --version   # 10.x.x
```

### 2. Kullanıcı ve Dizin Oluşturma

```bash
# Kullanıcı oluştur (opsiyonel)
sudo useradd -m -s /bin/bash taskfilewas
sudo usermod -aG sudo taskfilewas

# Kullanıcıya geç
su - taskfilewas

# Proje dizini oluştur
mkdir -p /var/www/task.filewas
cd /var/www/task.filewas
```

### 3. Repo Klonlama ve Bağımlılıklar

```bash
# Repo klonla
git clone https://github.com/your-org/task.filewas.git .
# veya: git clone git@github.com:your-org/task.filewas.git .

# Bağımlılıkları yükle
npm install

# .env oluştur
cp .env.example .env
nano .env
```

### 4. Environment Değişkenleri

```bash
# .env dosyası içeriği
NODE_ENV=production
PORT=3001

# Auth
API_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key-min-32-chars

# Paths
DATA_PATH=/var/www/task.filewas/data
PROJECTS_PATH=/var/www/task.filewas/projects
LOGS_PATH=/var/www/task.filewas/data/logs

# Claude CLI (optional)
CLAUDE_CLI_PATH=claude
```

**Önemli:** `API_PASSWORD` ve `JWT_SECRET` için güçlü değerler kullanın.

```bash
# Rastgele JWT secret oluştur
openssl rand -base64 32
```

### 5. Build

```bash
# Tüm workspace'leri build et
npm run build

# Kontrol
ls -la backend/dist
ls -la frontend/dist
```

---

## Production Kurulumu

### PM2 ile Backend

```bash
# PM2 kurulumu
npm install -g pm2

# PM2 config oluştur
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'task-filewas-backend',
      script: './backend/dist/index.js',
      cwd: '/var/www/task.filewas',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/www/task.filewas/logs/error.log',
      out_file: '/var/www/task.filewas/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
EOF

# Logs dizini oluştur
mkdir -p /var/www/task.filewas/logs

# PM2 başlat
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | sudo bash  # Auto-start on reboot
```

### Frontend (Nginx)

```bash
# Frontend build kontrolü
ls -la frontend/dist

# Nginx config oluştur
sudo nano /etc/nginx/sites-available/task.filewas
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name task.filewas.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name task.filewas.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/task.filewas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/task.filewas.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';

    # Frontend static files
    root /var/www/task.filewas/frontend/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Site enable et
sudo ln -s /etc/nginx/sites-available/task.filewas /etc/nginx/sites-enabled/

# Config test
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
```

### SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install -y certbot python3-certbot-nginx

# Sertifika al (otomatik nginx config günceller)
sudo certbot --nginx -d task.filewas.com

# Auto-renew kurulumu
sudo certbot renew --dry-run
```

---

## Docker Deployment (Alternatif)

### Dockerfile

**backend/Dockerfile:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm ci
RUN npm run build:shared
RUN npm run build:backend

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN npm ci
RUN npm run build:shared
RUN npm run build:frontend

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - API_PASSWORD=${API_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
      - ./projects:/app/projects
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  data:
  projects:
  logs:
```

```bash
# Docker deployment
docker-compose up -d --build
```

---

## İşletim ve Bakım

### Uygulama Yönetimi

```bash
# Durum kontrol
pm2 status
pm2 logs task-filewas-backend --lines 50

# Restart
pm2 restart task-filewas-backend

# Reload (zero downtime)
pm2 reload task-filewas-backend

# Stop
pm2 stop task-filewas-backend

# Loglar
pm2 logs --lines 100
pm2 flush  # Logları temizle
```

### Güncelleme

```bash
cd /var/www/task.filewas

# Yeni kodu çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# Build
npm run build

# Restart
pm2 restart task-filewas-backend
```

### Backup

```bash
# Backup script oluştur
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/task.filewas"
mkdir -p $BACKUP_DIR

# Data backup
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /var/www/task.filewas/data

# Projects backup
tar -czf $BACKUP_DIR/projects_$DATE.tar.gz /var/www/task.filewas/projects

# 7 günden eski backup'ları sil
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Cron job (her gün saat 03:00)
crontab -e
# 0 3 * * * /var/www/task.filewas/backup.sh
```

### Monitor

```bash
# PM2 monitor
pm2 monit

# Sistem kaynakları
htop
df -h
free -h

# Nginx erişim logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Backend Başlamıyor

```bash
# Config kontrol
cat ecosystem.config.cjs

# Manuel başlatma (hata gör)
cd /var/www/task.filewas
NODE_ENV=production PORT=3001 node backend/dist/index.js

# Log kontrol
pm2 logs task-filewas-backend --lines 100
```

### Nginx 502 Bad Gateway

```bash
# Backend çalışıyor mu?
curl http://127.0.0.1:3001/api/health

# Nginx config kontrol
sudo nginx -t

# Firewall kontrol
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### WebSocket Çalışmıyor

```bash
# Nginx config'de WebSocket ayarları kontrol et
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "Upgrade";

# Backend WebSocket port kontrolü
netstat -tulpn | grep 3001
```

### Disk Dolu

```bash
# Disk kullanımı
df -h

# Logları temizle
pm2 flush
sudo truncate -s 0 /var/www/task.filewas/logs/*.log

# Nginx log rotasyon
sudo logrotate /etc/logrotate.d/nginx
```

---

## Güvenlik

### Güvenlik Kontrol Listesi

- [ ] Güçlü `API_PASSWORD` ve `JWT_SECRET`
- [ ] HTTPS zorunlu (HTTP → HTTPS redirect)
- [ ] Firewall yapılandırılmış
- [ ] SSH key-based authentication
- [ ] Root login disabled
- [ ] Otomatik güncellemeler yapılandırılmış
- [ ] Backup stratijisi var
- [ ] Rate limiting (gelecek versiyon)
- [ ] Input validation (Zod schemas)
- [ ] SQL injection korunması (file-based storage)

### Firewall (UFW)

```bash
# UFW kurulumu
sudo apt install -y ufw

# Kurallar
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Aktif et
sudo ufw enable
sudo ufw status
```

### SSH Güvenliği

```bash
# SSH config
sudo nano /etc/ssh/sshd_config

# Ayarlar
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart
sudo systemctl restart sshd
```

---

## Performans Optimizasyonu

### Nginx

```nginx
# Worker processes
worker_processes auto;

# Worker connections
events {
    worker_connections 1024;
}

# Buffer sizes
client_body_buffer_size 128k;
client_max_body_size 10M;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
```

### PM2

```javascript
// ecosystem.config.cjs
instances: 'max', // Tüm CPU çekirdekleri
max_memory_restart: '500M',
exec_mode: 'cluster'
```

### Node.js

```bash
# Node flags
NODE_OPTIONS="--max-old-space-size=4096"
```

---

## Health Check

```bash
# Basit health check
curl https://task.filewas.com/api/health

# Detaylı health check
curl https://task.filewas.com/api/health/detailed

# Monitoring script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
STATUS=$(curl -s https://task.filewas.com/api/health | jq -r '.status')
if [ "$STATUS" != "healthy" ]; then
    echo "UNHEALTHY: $STATUS"
    pm2 restart task-filewas-backend
fi
EOF
```

---

## Support

- Issues: https://github.com/your-org/task.filewas/issues
- Email: support@task.filewas.com
- Documentation: https://docs.task.filewas.com
