#!/bin/bash

: ${ENV_FILE:=".env"}

set -a
[[ -a "${ENV_FILE}" ]] && source "${ENV_FILE}"

exec "$@"
