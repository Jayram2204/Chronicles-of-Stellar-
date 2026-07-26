import { EventHub, GameEvents } from '../events/EventHub';
import { authService } from '../services/authService';
import { app } from '../services/firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

export interface BountyContract {
  id: string;
  title: string;
  description: string;
  rewardReputation: number;
  rewardCredits: number;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  type: 'kills' | 'transactions' | 'ai_deal';
}

export class DailyBountyManager {
  private activeBounties: BountyContract[] = [];

  constructor() {
    this.initDailyBounties();
    this.attachGameEventListeners();
    this.hydrateFromFirestore();
  }

  private initDailyBounties() {
    // Deterministic daily contracts
    this.activeBounties = [
      {
        id: 'bounty_kills_5',
        title: 'GRID PURGE: 5 FOES',
        description: 'Neutralize 5 rogue cyberware enemies in sector combat.',
        rewardReputation: 15,
        rewardCredits: 50,
        targetCount: 5,
        currentCount: 0,
        isCompleted: false,
        type: 'kills',
      },
      {
        id: 'bounty_ledger_mutation',
        title: 'SOROBAN LEDGER MUTATION',
        description: 'Authorize 1 on-chain smart contract state mutation.',
        rewardReputation: 20,
        rewardCredits: 100,
        targetCount: 1,
        currentCount: 0,
        isCompleted: false,
        type: 'transactions',
      },
      {
        id: 'bounty_ai_negotiation',
        title: 'NEURAL LINK BARGAIN',
        description: 'Negotiate and gain approval from a Gemini AI NPC.',
        rewardReputation: 25,
        rewardCredits: 150,
        targetCount: 1,
        currentCount: 0,
        isCompleted: false,
        type: 'ai_deal',
      },
    ];
  }

  private attachGameEventListeners() {
    EventHub.on(GameEvents.ENEMY_DEATH, () => {
      this.updateProgress('kills', 1);
    });

    EventHub.on(GameEvents.TX_CONFIRMED, () => {
      this.updateProgress('transactions', 1);
    });

    EventHub.on(GameEvents.AGENT_DECISION, (data: { npcId: string; decision: string }) => {
      if (data.decision === 'approve') {
        this.updateProgress('ai_deal', 1);
      }
    });
  }

  private updateProgress(type: 'kills' | 'transactions' | 'ai_deal', increment: number) {
    let updated = false;

    this.activeBounties = this.activeBounties.map((bounty) => {
      if (bounty.type === type && !bounty.isCompleted) {
        const newCount = Math.min(bounty.currentCount + increment, bounty.targetCount);
        const completed = newCount >= bounty.targetCount;
        updated = true;
        if (completed && !bounty.isCompleted) {
          console.log(`[DailyBountyManager] Bounty Completed: ${bounty.title}!`);
          EventHub.emit('bounty_completed', bounty);
        }
        return {
          ...bounty,
          currentCount: newCount,
          isCompleted: completed,
        };
      }
      return bounty;
    });

    if (updated) {
      this.syncOffChainBounties();
    }
  }

  private async syncOffChainBounties() {
    const session = authService.getSession();
    if (session.user?.id) {
      try {
        const bountyData = this.activeBounties.map((b) => ({
          id: b.id,
          title: b.title,
          currentCount: b.currentCount,
          targetCount: b.targetCount,
          isCompleted: b.isCompleted,
        }));
        const db = getFirestore(app);
        await setDoc(doc(db, 'users', session.user.id, 'stats', 'daily_bounties'), {
          bounties: bountyData,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn('[DailyBountyManager] Error saving bounty progress off-chain:', e);
      }
    }
  }

  public getBounties(): BountyContract[] {
    return [...this.activeBounties];
  }

  private async hydrateFromFirestore() {
    try {
      const session = authService.getSession();
      if (!session.user?.id) return;

      const db = getFirestore(app);
      const snap = await getDoc(doc(db, 'users', session.user.id, 'stats', 'daily_bounties'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.bounties)) {
          this.activeBounties = this.activeBounties.map((bounty) => {
            const saved = data.bounties.find((b: any) => b.id === bounty.id);
            if (saved) {
              return {
                ...bounty,
                currentCount: saved.currentCount || 0,
                isCompleted: saved.isCompleted || false,
              };
            }
            return bounty;
          });
          console.log('[DailyBountyManager] Hydrated bounty progress from Firestore');
        }
      }
    } catch (e) {
      console.warn('[DailyBountyManager] Error hydrating bounties from Firestore:', e);
    }
  }
}

export const dailyBountyManager = new DailyBountyManager();
