import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';

export interface DialogueLog {
  sender: 'player' | 'npc' | 'system';
  text: string;
  timestamp: Date;
}

export class TerminalLogic {
  private history: Map<string, DialogueLog[]> = new Map();
  private loadedFromFirestore: Set<string> = new Set();

  public getHistory(npcId: string): DialogueLog[] {
    if (!this.history.has(npcId)) {
      this.history.set(npcId, [
        {
          sender: 'system',
          text: `// SECURE COMM LINK INITIALIZED WITH GRID-ENTITY [${npcId.toUpperCase()}]`,
          timestamp: new Date()
        }
      ]);
      this.hydrateFromFirestore(npcId);
    }
    return this.history.get(npcId) || [];
  }

  private async hydrateFromFirestore(npcId: string) {
    if (this.loadedFromFirestore.has(npcId)) return;
    this.loadedFromFirestore.add(npcId);

    try {
      const session = authService.getSession();
      if (!session.user?.id) return;

      const savedLogs = await firestoreService.getChatHistory(session.user.id, npcId);
      if (savedLogs.length > 0) {
        const existing = this.history.get(npcId) || [];
        const systemLog = existing[0];
        this.history.set(npcId, [systemLog, ...savedLogs]);
      }
    } catch (e) {
      console.warn('[TerminalLogic] Failed to hydrate chat history:', e);
    }
  }

  public addLog(npcId: string, sender: 'player' | 'npc' | 'system', text: string) {
    const logs = this.getHistory(npcId);
    logs.push({ sender, text, timestamp: new Date() });
    this.history.set(npcId, logs);
    this.persistToFirestore(npcId);
  }

  private async persistToFirestore(npcId: string) {
    try {
      const session = authService.getSession();
      if (!session.user?.id) return;
      const logs = this.history.get(npcId) || [];
      await firestoreService.saveChatHistory(session.user.id, npcId, logs);
    } catch (e) {
      console.warn('[TerminalLogic] Failed to persist chat history:', e);
    }
  }
}

export const terminalLogic = new TerminalLogic();
