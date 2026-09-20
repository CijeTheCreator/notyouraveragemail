#!/usr/bin/env bash
set -euo pipefail

# Modern Mail Companion — One-line Terminal Installer
echo "📦 Installing Modern Mail Companion..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
PROJECT_DIR="${SCRIPT_DIR}/../.."

if [ -d "$PROJECT_DIR/mail-desktop" ]; then
  echo "🔨 Building and installing from local repository..."
  cd "$PROJECT_DIR/mail-desktop"
  xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build -quiet
  P=$(xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')/Clicky.app
  pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
  rm -rf /Applications/ModernMail.app && cp -R "$P" /Applications/ModernMail.app
  codesign --force --deep --sign - /Applications/ModernMail.app
else
  echo "⬇️ Downloading latest ModernMail release..."
  RELEASE_URL="https://github.com/CijeTheCreator/modern-mail/releases/latest/download/ModernMail-macOS.zip"
  TMP_ZIP="/tmp/ModernMail-macOS.zip"
  curl -fsSL "$RELEASE_URL" -o "$TMP_ZIP"
  pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
  rm -rf /Applications/ModernMail.app
  unzip -q "$TMP_ZIP" -d /Applications
  rm -f "$TMP_ZIP"
fi

echo "🛡️ Clearing Gatekeeper quarantine attribute..."
xattr -cr /Applications/ModernMail.app || true

echo "🚀 Launching Modern Mail Companion..."
open /Applications/ModernMail.app

echo "✅ Modern Mail Companion installed successfully!"
