#!/bin/bash

HOST="http://localhost:8080"

event_with_device_geo_info__should_register() {
  curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "cloudfront-is-mobile-viewer: false" \
  -H "cloudfront-is-tablet-viewer: false" \
  -H "cloudfront-is-smarttv-viewer: false" \
  -H "cloudfront-is-desktop-viewer: true" \
  -H "cloudfront-is-ios-viewer: false" \
  -H "cloudfront-is-android-viewer: false" \
  -H "cloudfront-viewer-country: US" \
  -H "cloudfront-viewer-country-name: United States" \
  -H "cloudfront-viewer-country-region: CA" \
  -H "cloudfront-viewer-country-region-name: California" \
  -H "cloudfront-viewer-city: San Francisco" \
  -H "cloudfront-viewer-postal-code: 94107" \
  -H "cloudfront-viewer-time-zone: PST" \
  -H "cloudfront-viewer-latitude: 37.7749" \
  -H "cloudfront-viewer-longitude: -122.4194" \
  -H "cloudfront-viewer-address: 123 Main St" \
  -d '{
    "logs": [{
      "aid": "aid1",
      "sid": "sid1",
      "evtt": 1722277800,
      "tz": "IST",
      "eni": 2,
      "ent": 0,
      "enc": "ac",
      "offset": 0,
      "event": "demo_opened",
      "payload": { }
    }]
  }' $HOST/v1/la
}

event_with_device_geo_info__should_not_register() {
  curl -X POST \
  -H "Content-Type: application/json" \
  -H "cloudfront-is-mobile-viewer: false" \
  -H "cloudfront-is-tablet-viewer: false" \
  -H "cloudfront-is-smarttv-viewer: false" \
  -H "cloudfront-is-desktop-viewer: true" \
  -H "cloudfront-is-ios-viewer: false" \
  -H "cloudfront-is-android-viewer: false" \
  -H "cloudfront-viewer-country: US" \
  -H "cloudfront-viewer-country-name: United States" \
  -H "cloudfront-viewer-country-region: CA" \
  -H "cloudfront-viewer-country-region-name: California" \
  -H "cloudfront-viewer-city: San Francisco" \
  -H "cloudfront-viewer-postal-code: 94107" \
  -H "cloudfront-viewer-time-zone: PST" \
  -H "cloudfront-viewer-latitude: 37.7749" \
  -H "cloudfront-viewer-longitude: -122.4194" \
  -H "cloudfront-viewer-address: 123 Main St" \
  -d '{
    "logs": [{
      "aid": "aid2",
      "sid": "sid2",
      "evtt": 1722277800,
      "tz": "IST",
      "eni": 2,
      "ent": 0,
      "enc": "ac",
      "target": "t",
      "offset": 0,
      "event": "cta_clicked",
      "payload": {
        "source": "module_cta",
        "btnTxt": "Book a demo",
        "url": "https://hello.sharefable.com"
      }
    }]
  }' $HOST/v1/la
}

event_with_device_geo_info__should_register
event_with_device_geo_info__should_not_register
