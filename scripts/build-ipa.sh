#!/usr/bin/env bash
# Builds an unsigned IPA from the prebuilt ios/ project (run after `expo prebuild`).
# Output: dist/LifeCentralized.ipa, for installing in LiveContainer.
set -euo pipefail
WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
rm -rf Payload dist && mkdir -p Payload dist
cp -R "build/Build/Products/Release-iphoneos/$SCHEME.app" Payload/
zip -qry dist/LifeCentralized.ipa Payload
echo "Built dist/LifeCentralized.ipa from scheme $SCHEME"
