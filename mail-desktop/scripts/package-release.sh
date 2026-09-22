#!/usr/bin/env bash
set -euo pipefail

# NotYourAverageMail Companion — Release Packager (Path A: Free / Ad-Hoc Distribution)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
BUILDS_DIR="$REPO_ROOT/builds"

echo "🚀 [1/5] Building NotYourAverageMail in Release configuration..."
cd "$PROJECT_DIR"
xcodebuild -scheme MailBuddy -configuration Release -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build -quiet

BUILT_PRODUCTS_DIR=$(xcodebuild -scheme MailBuddy -configuration Release -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')
SOURCE_APP="$BUILT_PRODUCTS_DIR/NotYourAverageMail.app"

if [ ! -d "$SOURCE_APP" ]; then
  echo "❌ Error: Could not find built app at $SOURCE_APP"
  exit 1
fi

echo "📦 [2/5] Staging NotYourAverageMail.app..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -R "$SOURCE_APP" "$DIST_DIR/NotYourAverageMail.app"

echo "✍️  [3/5] Signing ad-hoc with deep entitlements..."
codesign --force --deep --sign - "$DIST_DIR/NotYourAverageMail.app"

echo "🗜️  [4/5] Creating zip distribution archive..."
ditto -c -k --sequesterRsrc --keepParent "$DIST_DIR/NotYourAverageMail.app" "$DIST_DIR/NotYourAverageMail-macOS.zip"

echo "💿 [5/5] Creating drag-and-drop NotYourAverageMail.dmg..."
DMG_STAGING="$DIST_DIR/dmg_staging"
mkdir -p "$DMG_STAGING"
cp -R "$DIST_DIR/NotYourAverageMail.app" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

hdiutil create \
  -volname "NotYourAverageMail" \
  -srcfolder "$DMG_STAGING" \
  -ov \
  -format UDZO \
  "$DIST_DIR/NotYourAverageMail.dmg" -quiet

rm -rf "$DMG_STAGING"
mkdir -p "$BUILDS_DIR"
cp "$DIST_DIR/NotYourAverageMail-macOS.zip" "$BUILDS_DIR/"
cp "$DIST_DIR/NotYourAverageMail.dmg" "$BUILDS_DIR/"

echo ""
echo "✅ Build & packaging complete!"
echo "--------------------------------------------------------"
echo "Artifacts generated in: $DIST_DIR and $BUILDS_DIR"
ls -lh "$BUILDS_DIR" | grep -E '\.(zip|dmg)$' || true
echo "--------------------------------------------------------"
echo "Instructions for distributing to users (Path A):"
echo "1. Share NotYourAverageMail.dmg or NotYourAverageMail-macOS.zip."
echo "2. After the user copies NotYourAverageMail.app to /Applications, tell them to either:"
echo "   a) Right-click NotYourAverageMail.app -> Open -> Open Anyway"
echo "   b) Or run this command in Terminal:"
echo "      xattr -cr /Applications/NotYourAverageMail.app"
echo "--------------------------------------------------------"
