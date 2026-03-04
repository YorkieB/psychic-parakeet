/**
 * Speak each new assistant message: prefers local custom voice (XTTS) if enabled, else system voices.
 */
export function useAssistantTTS() {
	// This hook is disabled because we are now handling TTS directly in conversation-store.ts
	// to ensure perfect synchronization with the KITT scanner and avoid duplicate voices.
	return;
}
