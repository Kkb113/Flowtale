#!/usr/bin/env bash

set -euo pipefail

HOST="${HOST:-http://localhost:8081}"

require_auth_token() {
  if [[ -z "${AUTH_TOKEN:-}" ]]; then
    echo "Set AUTH_TOKEN before calling an authenticated endpoint." >&2
    return 1
  fi
}

auth_test() {
  require_auth_token
  curl \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    "${HOST}/v1/f/hello"
}

llm_ops_test() {
  require_auth_token
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "v": 1,
      "type": "create_demo",
      "model": "default",
      "system_payload": {
        "subtype": "create_new",
        "usecase": "marketing"
      },
      "user_payload": {
        "product_details": "A smart home automation system",
        "demo_objective": "Showcase the ease of use and energy-saving features",
        "refsForMMV": ["https://example.com/smart-home-demo"]
      }
    }' \
    "${HOST}/v1/f/llmops"
}

llm_ops_test_from_args() {
  require_auth_token
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "$1" \
    "${HOST}/v1/f/llmops"
}
