import { Router } from 'express';
import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import type { CivicTrustEvent } from '@civicmind/shared';

const router = Router();

router.post('/escalate', authenticate, async (req, res) => {
  try {
    const { issue_id } = req.body;
    const user_id = (req as any).user.uid;
    const db = getFirestore();

    const userRef = db.collection(COLLECTIONS.USERS).doc(user_id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
       res.status(404).json({ error: 'User not found' });
       return;
    }

    const userData = userDoc.data()!;
    const currentTokens = userData.available_escalation_tokens || 0;

    if (currentTokens <= 0) {
       res.status(403).json({ error: 'Insufficient Escalation Tokens' });
       return;
    }

    // Spend token & log to ledger
    await db.runTransaction(async (t) => {
      t.update(userRef, {
        available_escalation_tokens: currentTokens - 1
      });

      const eventRef = db.collection(COLLECTIONS.CIVIC_TRUST_EVENTS).doc();
      const event: CivicTrustEvent = {
        event_id: eventRef.id,
        user_id,
        event_type: 'ESCALATION_SPEND',
        yield_amount: -1, // representing 1 token spent
        geohash: 'global',
        timestamp: new Date().toISOString(),
        idempotency_key: `escalate_${issue_id}_${Date.now()}`
      };
      t.set(eventRef, event);

      // Force SLA Override on Issue
      const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issue_id);
      t.update(issueRef, {
        escalation_tier_current: 3, // Force to highest tier
        updated_at: new Date().toISOString()
      });
    });

    res.json({ success: true, message: 'Escalation Token applied successfully. Issue bumped.' });
  } catch (error: any) {
    console.error('Trust Escalate Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
