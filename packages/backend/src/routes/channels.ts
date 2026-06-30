import { Router, Request, Response } from 'express';
import { orchestrateIssueSubmission } from '../services/orchestrator.js';

const router = Router();

// ─── POST /api/v1/channels/whatsapp/inbound ────────────────────────────────
// Webhook endpoint for Twilio WhatsApp integration
router.post('/whatsapp/inbound', async (req: Request, res: Response) => {
  try {
    // Twilio sends data as URL-encoded form data by default
    const { From, Body, Latitude, Longitude } = req.body;

    if (!From) {
      return res.status(400).send('Missing From parameter');
    }

    const senderId = From.replace('whatsapp:', '');
    console.log(`[WhatsApp] Received message from ${senderId}: ${Body}`);

    // Use a stable whatsapp system UID for attribution
    const whatsappSystemUid = `whatsapp:${senderId}`;

    // Build location from Twilio's optional lat/lng fields
    const locationLat = Latitude ? parseFloat(Latitude) : 12.9716; // default Bengaluru
    const locationLng = Longitude ? parseFloat(Longitude) : 77.5946;

    // Persist to Firestore via the full orchestration pipeline (reporter → submit)
    const idempotencyKey = `wa-${senderId}-${Date.now()}`;
    const result = await orchestrateIssueSubmission({
      idempotencyKey,
      reporterUserId: whatsappSystemUid,
      photoRefs: [],         // WhatsApp media download requires Twilio auth — skipped
      photoBase64List: [],
      locationLat,
      locationLng,
      description: Body || 'Reported via WhatsApp',
      wardOrAreaId: 'ward-unknown',
    });

    // Respond with TwiML acknowledgment
    const category = result.suggestedCategory?.replace(/_/g, ' ') ?? 'civic issue';
    const severity = result.suggestedSeverity ?? 'medium';
    const twiml = `
      <Response>
        <Message>Thank you! CivicSense AI classified this as: ${category} (${severity} severity). Your Report ID is: ${result.issueId}. We have routed it to the appropriate department.</Message>
      </Response>
    `;

    res.set('Content-Type', 'text/xml');
    return res.send(twiml.trim());
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing message:', error);
    const twiml = `
      <Response>
        <Message>Sorry, we encountered an error processing your report. Please try again later.</Message>
      </Response>
    `;
    res.set('Content-Type', 'text/xml');
    return res.status(500).send(twiml.trim());
  }
});

export default router;
