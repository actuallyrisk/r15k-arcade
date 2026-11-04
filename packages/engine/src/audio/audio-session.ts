/**
 * Sets `navigator.audioSession.type = 'ambient'` where the Audio Session API exists (WebKit), so the
 * app mixes with other audio and respects the iPhone silent switch. Returns whether the type is now
 * 'ambient'; false where the API is missing or rejects the value. Call it before creating the context.
 */
export function setAmbientAudioSession(navigator: Navigator): boolean {
  if (!('audioSession' in navigator)) {
    return false;
  }
  const session: unknown = navigator.audioSession;
  if (typeof session !== 'object' || session === null || !('type' in session)) {
    return false;
  }
  session.type = 'ambient';
  return session.type === 'ambient';
}
