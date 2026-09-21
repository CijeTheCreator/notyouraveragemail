#!/usr/bin/env bash
set -euo pipefail

# NotYourAverageMail Companion — One-line Terminal Installer
echo "📦 Installing NotYourAverageMail Companion..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
PROJECT_DIR="${SCRIPT_DIR}/../.."

if [ -d "$PROJECT_DIR/mail-desktop" ]; then
  echo "🔨 Building and installing from local repository..."
  cd "$PROJECT_DIR/mail-desktop"
  xcodebuild -scheme MailBuddy -configuration Debug -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build -quiet
  P=$(xcodebuild -scheme MailBuddy -configuration Debug -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')/NotYourAverageMail.app
  pkill -f "NotYourAverageMail" || pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
  rm -rf /Applications/NotYourAverageMail.app && cp -R "$P" /Applications/NotYourAverageMail.app
  codesign --force --deep --sign - /Applications/NotYourAverageMail.app
else
  echo "⬇️ Downloading latest NotYourAverageMail release..."
  RELEASE_URL="https://github.com/CijeTheCreator/modern-mail/releases/latest/download/NotYourAverageMail-macOS.zip"
  TMP_ZIP="/tmp/NotYourAverageMail-macOS.zip"
  curl -fsSL "$RELEASE_URL" -o "$TMP_ZIP"
  pkill -f "NotYourAverageMail" || pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
  rm -rf /Applications/NotYourAverageMail.app
  unzip -q "$TMP_ZIP" -d /Applications
  rm -f "$TMP_ZIP"
fi

echo "🛡️ Clearing Gatekeeper quarantine attribute..."
xattr -cr /Applications/NotYourAverageMail.app || true

echo "🚀 Launching NotYourAverageMail Companion..."
open /Applications/NotYourAverageMail.app

echo "✅ NotYourAverageMail Companion installed successfully!"
