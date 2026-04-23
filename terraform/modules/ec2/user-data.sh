#!/bin/bash
set -euxo pipefail

yum update -y
yum install -y docker awscli
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create docker-compose.yml
cat > /home/ec2-user/docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    image: ${ecr_repository_url}:${backend_image_tag}
    restart: unless-stopped
    env_file:
      - /home/ec2-user/backend.env
    depends_on:
      redis:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  redis-data:
EOF

# Create backend.env
FCM_SERVER_KEY_COMPACT="$(echo '${fcm_server_key_b64}' | base64 -d | tr -d '\n')"

cat > /home/ec2-user/backend.env << EOF
MONGO_URI=${mongo_uri}
FCM_SERVER_KEY=${FCM_SERVER_KEY_COMPACT}
REDIS_HOST=redis
NODE_ENV=production
PORT=3000
COGNITO_USER_POOL_ID=${cognito_user_pool_id}
COGNITO_CLIENT_ID=${cognito_client_id}
EOF

chown ec2-user:ec2-user /home/ec2-user/docker-compose.yml /home/ec2-user/backend.env

# ECR login and start
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $(echo ${ecr_repository_url} | cut -d/ -f1)

# Pull and start
docker-compose -f /home/ec2-user/docker-compose.yml pull
docker-compose -f /home/ec2-user/docker-compose.yml up -d
