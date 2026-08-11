#!/bin/sh
set -eu

env_file="${1:-.env}"

if [ ! -f "$env_file" ]; then
  echo "Missing environment file: $env_file" >&2
  exit 1
fi

required_variables="
EVOLUTION_DOMAIN
MIDDLEWARE_DOMAIN
ACME_EMAIL
EVOLUTION_API_KEY
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
REDIS_PASSWORD
"

for variable in $required_variables; do
  value=$(sed -n "s/^${variable}=//p" "$env_file" | tail -n 1)
  if [ -z "$value" ]; then
    echo "Missing required variable in $env_file: $variable" >&2
    exit 1
  fi
  case "$value" in
    *CHANGE_ME*|*.example.com)
      echo "Placeholder value is not allowed for $variable" >&2
      exit 1
      ;;
  esac
done

for variable in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD REDIS_PASSWORD; do
  value=$(sed -n "s/^${variable}=//p" "$env_file" | tail -n 1)
  case "$value" in
    *[!A-Za-z0-9_-]*)
      echo "$variable must contain only letters, numbers, underscore or hyphen" >&2
      exit 1
      ;;
  esac
done

for variable in EVOLUTION_DOMAIN MIDDLEWARE_DOMAIN; do
  value=$(sed -n "s/^${variable}=//p" "$env_file" | tail -n 1)
  case "$value" in
    *[!A-Za-z0-9.-]*|.*|*.)
      echo "$variable must be a hostname without protocol or path" >&2
      exit 1
      ;;
  esac
done

api_key=$(sed -n 's/^EVOLUTION_API_KEY=//p' "$env_file" | tail -n 1)
case "$api_key" in
  *[!A-Fa-f0-9]*|???????????????????????????????????????????????????????????????|?????????????????????????????????????????????????????????????????*)
    echo "EVOLUTION_API_KEY must contain exactly 64 hexadecimal characters" >&2
    exit 1
    ;;
esac
if [ "${#api_key}" -ne 64 ]; then
  echo "EVOLUTION_API_KEY must contain exactly 64 hexadecimal characters" >&2
  exit 1
fi

echo "Homologation environment is valid."
