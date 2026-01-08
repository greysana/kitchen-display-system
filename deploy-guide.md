# Deploy on server command

docker-compose --env-file .env.production up -d

# Deploy on dev command

docker-compose -f docker-compose.dev.yml up -d
