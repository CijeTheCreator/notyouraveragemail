/**
 * Extracts OTP or 2FA verification codes from email text and subject.
 */
export function extractOtpCode(subject: string, body: string): string | undefined {
  const combined = `${subject}\n${body}`;

  // Priority 1: Keyword-bounded codes (e.g., "code is 123456", "verification code: 123456", "OTP: 1234")
  const keywordPattern = /(?:code|otp|passcode|pin|verification)\s*(?:is|:|-)?\s*([0-9]{4,8})\b/i;
  const keywordMatch = combined.match(keywordPattern);
  if (keywordMatch && keywordMatch[1]) {
    return keywordMatch[1];
  }

  // Priority 2: Standalone 6-digit code pattern
  const sixDigitMatch = body.match(/\b([0-9]{6})\b/) || subject.match(/\b([0-9]{6})\b/);
  if (sixDigitMatch && sixDigitMatch[1]) {
    return sixDigitMatch[1];
  }

  return undefined;
}
