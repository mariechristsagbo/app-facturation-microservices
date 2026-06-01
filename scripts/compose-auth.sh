#!/bin/sh
set -eu

docker compose \
  --env-file .env.auth \
  -f docker-compose.yml \
  -f docker-compose.auth.yml \
  -f docker-compose.frontend.yml \
  -f docker-compose.microservices.yml \
  "$@"
