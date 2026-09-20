# Modern Mail — Agent Guidelines & Automation Rules

## macOS Desktop Companion (`mail-desktop`) Guidelines

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
