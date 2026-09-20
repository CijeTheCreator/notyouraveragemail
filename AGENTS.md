# Modern Mail — Agent Guidelines & Automation Rules

## macOS Desktop Companion (`mail-desktop`) Guidelines

### ⚠️ Always Install & Restart After Changing `mail-desktop`
After **any** change to `mail-desktop` code, do not stop at a successful build. **ALWAYS install the new build and restart the app without asking**, so the developer can test it immediately:
```bash
cd mail-desktop
xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build
# Product is named Clicky.app; install it as ModernMail.app
P=$(xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')/Clicky.app
pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
rm -rf /Applications/ModernMail.app && cp -R "$P" /Applications/ModernMail.app
codesign --force --deep --sign - /Applications/ModernMail.app
```
Then run the permission reset below and relaunch. Backend (`mail-web/convex`) changes must also be deployed with `npx convex dev --once` in `mail-web`.

### ⚠️ Mandatory Permission Cache Reset on Every App Rebuild
Whenever `mail-desktop` (`leanring-buddy`) is rebuilt, recompiled, or reinstalled to `/Applications/ModernMail.app`, **YOU MUST ALWAYS RESET THE macOS TCC PERMISSION CACHE AND USERDEFAULTS** so the developer can cleanly test and regrant permissions.

#### Required Commands to Run After Every Rebuild:
```bash
# 1. Kill any existing instances
pkill -f "ModernMail" || pkill -f "Clicky" || true

# 2. Reset macOS TCC privacy database permissions for the companion bundle ID
tccutil reset Accessibility com.yourcompany.leanring-buddy || true
tccutil reset ScreenCapture com.yourcompany.leanring-buddy || true
tccutil reset Microphone com.yourcompany.leanring-buddy || true
tccutil reset SpeechRecognition com.yourcompany.leanring-buddy || true
tccutil reset AppleEvents com.yourcompany.leanring-buddy || true
tccutil reset All com.yourcompany.leanring-buddy || true

# 3. Clear application user preferences cache
defaults delete com.yourcompany.leanring-buddy || true

# 4. Relaunch the application
open /Applications/ModernMail.app
```

---

### App Architecture & Key Shortcuts Reference
- **Bundle ID**: `com.yourcompany.leanring-buddy`
- **Application Path**: `/Applications/ModernMail.app`
- **Voice Push-To-Talk**: `Control + Option` (`⌃⌥`)
- **File Selection & Email Prompt Drafting**: `Command + Shift + M` (`⌘⇧M`)
- **Deep Link Scheme**: `modernmail://connect?inboxId=<inboxId>`
- **Backend Deployment**: Convex (`https://steady-ram-494.convex.cloud`)

---

### 📦 Building & Packaging for Distribution (Path A: Free / Ad-Hoc)

To build and package standalone distribution artifacts (`.dmg` and `.zip`):
```bash
./mail-desktop/scripts/package-release.sh
```
This automated script:
1. Compiles `mail-desktop` in **Release** configuration (stripped and optimized).
2. Stages `ModernMail.app` in `mail-desktop/dist/`.
3. Performs deep ad-hoc code-signing with entitlements.
4. Generates `mail-desktop/dist/ModernMail.dmg` (drag-and-drop disk image with `/Applications` link).
5. Generates `mail-desktop/dist/ModernMail-macOS.zip` (standalone compressed archive).

#### Gatekeeper Instructions for End Users:
Because ad-hoc builds are not notarized by a paid Apple Developer ID, downloaded copies will have the macOS quarantine attribute set by the browser. Instruct users to either:
1. **Right-click** `ModernMail.app` ➔ select **Open** ➔ click **Open Anyway** (in System Settings ➔ Privacy & Security).
2. Or run this one-line command in Terminal:
   ```bash
   xattr -cr /Applications/ModernMail.app
   ```

