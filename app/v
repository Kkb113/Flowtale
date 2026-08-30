#!/bin/bash

# Usage
# ./v -l 1      to list all the versions from package.json
# ./v -u *.*.*  to upgrade to a version 

echo "Checking if required toolchain is installed"
if ! [ -x "$(command -v jq)" ]; then
  echo 'Error: jq is not installed.' >&2
  exit 1
fi

while getopts "l:u:" flag
do
  case "${flag}" in
    u) VERSION=${OPTARG};;
    l) CURRENT=1;;
  esac
done

client_package_json="workspace/packages/client/package.json" 
ext_package_json="workspace/packages/ext-tour/package.json" 
ext_manifest_json="workspace/packages/ext-tour/public/manifest.json" 
project_package_json="workspace/package.json" 

if [[ $CURRENT -eq 1 ]]; then
  echo "Current client version: $( jq -r '.version' < $client_package_json )"
  echo "Current extension version: $( jq -r '.version' < $ext_package_json  )"
  echo "Current extension manifest version: $( jq -r '.version' < $ext_manifest_json )"
  echo "Current project version: $( jq -r '.version' < $project_package_json )"
  exit;
fi

if [[ -n "$VERSION" ]]; then
  echo "Starting..."
  jq ".version |= \"${VERSION}\"" $client_package_json > .tmp && mv .tmp $client_package_json
  jq ".version |= \"${VERSION}\"" $ext_package_json > .tmp && mv .tmp $ext_package_json
  jq ".version |= \"${VERSION}\"" $ext_manifest_json > .tmp && mv .tmp $ext_manifest_json
  jq ".version |= \"${VERSION}\"" $project_package_json > .tmp && mv .tmp $project_package_json
  echo "Upgraded to version: $VERSION";
  echo "Run git status to verify";
  exit
fi
