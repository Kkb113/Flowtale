#!/bin/sh

cat ../service.json
#jq -R -s 'split("\n") | map(select(length > 0)) | map(select(startswith("#") | not)) | map(split("=")) | map({(.[0]): .[1:] | join("=")}) | add' ../env.idea
