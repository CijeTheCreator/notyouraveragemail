#!/usr/bin/env bash
set -euo pipefail

# Modern Mail Companion — Release Packager (Path A: Free / Ad-Hoc Distribution)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"

echo "🚀 [1/5] Building Modern Mail in Release configuration..."
cd "$PROJECT_DIR"
xcodebuild -scheme leanring-buddy -configuration Release -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build -quiet

BUILT_PRODUCTS_DIR=$(xcodebuild -scheme leanring-buddy -configuration Release -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')
SOURCE_APP="$BUILT_PRODUCTS_DIR/Clicky.app"

if [ ! -d "$SOURCE_APP" ]; then
  echo "❌ Error: Could not find built app at $SOURCE_APP"
  exit 1
fi

echo "📦 [2/5] Staging ModernMail.app..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -R "$SOURCE_APP" "$DIST_DIR/ModernMail.app"

echo "✍️  [3/5] Signing ad-hoc with deep entitlements..."
codesign --force --deep --sign - "$DIST_DIR/ModernMail.app"

echo "🗜️  [4/5] Creating zip distribution archive..."
ditto -c -k --sequesterRsrc --keepParent "$DIST_DIR/ModernMail.app" "$DIST_DIR/ModernMail-macOS.zip"

echo "💿 [5/5] Creating drag-and-drop ModernMail.dmg..."
DMG_STAGING="$DIST_DIR/dmg_staging"
mkdir -p "$DMG_STAGING"
cp -R "$DIST_DIR/ModernMail.app" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

hdiutil create \
  -volname "Modern Mail" \
  -srcfolder "$DMG_STAGING" \
  -ov \
  -format UDZO \
  "$DIST_DIR/ModernMail.dmg" -quiet

rm -rf "$DMG_STAGING"

echo ""
echo "✅ Build & packaging complete!"
echo "--------------------------------------------------------"
echo "Artifacts generated in: $DIST_DIR"
ls -lh "$DIST_DIR" | grep -E '\.(zip|dmg|app)$' || true
echo "--------------------------------------------------------"
echo "Instructions for distributing to users (Path A):"
echo "1. Share ModernMail.dmg or ModernMail-macOS.zip."
echo "2. After the user copies ModernMail.app to /Applications, tell them to either:"
echo "   a) Right-click ModernMail.app -> Open -> Open Anyway"
echo "   b) Or run this command in Terminal:"
echo "      xattr -cr /Applications/ModernMail.app"
echo "--------------------------------------------------------"
