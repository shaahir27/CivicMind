import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const baseStrings = {
  appName: 'CivicMind',
  appTagline: 'Empowering communities through transparent civic participation',
  onboarding1Title: 'Report in Seconds',
  onboarding1Sub: 'Just take a photo. Our AI identifies the issue and severity automatically — no forms required.',
  onboarding2Title: 'We Route It Automatically',
  onboarding2Sub: "CivicMind's AI finds the right department and drafts a formal complaint on your behalf.",
  onboarding3Title: "We Verify It's Actually Fixed",
  onboarding3Sub: 'Our AI compares before/after photos to confirm real resolution — not just a status change.',
  skip: 'Skip →',
  continue: 'Continue →',
  getStarted: 'Get Started',
  continueAsGuest: 'Continue as Guest',
  guestDesc: 'Report issues immediately. No tracking or notifications — your reports still help the community.',
  createAccount: 'Create Account',
  accountDesc: 'Get live status updates and track all your reports. Earn Hero Points for verified fixes.',
  phone: '📱 Phone',
  email: '✉️ Email',
  sendCode: 'Send Verification Code',
  enterCode: 'Enter Verification Code',
  verifyAndContinue: 'Verify & Continue',
  sending: '⏳ Sending…',
  verifying: '⏳ Verifying…',
  enterContactError: 'Please enter your phone number or email.',
  enterCodeError: 'Please enter the code.',
  demoCodeHint: 'We sent a code to {contact}. (Demo: enter any 4+ digits.)',
  otpPlaceholder: '+91 98765 43210',
  nearbyIssues: 'Nearby Issues ({count})',
  noIssuesTitle: 'No issues nearby',
  noIssuesDesc: 'Your area looks good! Tap the button below to report a problem.',
  reportAnIssue: '📸 Report an Issue',
  showAll: '▲ Show All',
  collapse: '▼ Collapse',
  moreNearby: '+{count} more nearby',
  issueCount: '{count} issues',
  reportTitle: 'Report an Issue',
  addPhotos: 'Add Photos',
  photoDesc: 'Take or upload clear photos of the issue',
  location: 'Location',
  locationAuto: 'Detecting your location…',
  pinYourLocation: 'Pin Your Location',
  description: 'Description (optional)',
  descPlaceholder: 'Describe what you see…',
  analyzing: 'AI is analyzing…',
  submitReport: 'Submit Report',
  submitting: 'Submitting…',
  reviewTitle: 'AI Classification',
  reviewSub: 'Review and confirm before submitting',
  category: 'Category',
  severity: 'Severity',
  confidence: 'Confidence',
  confirmAndSubmit: 'Confirm & Submit',
  editCategory: 'Edit',
  reportSubmitted: 'Report Submitted!',
  trackingId: 'Tracking ID',
  viewStatus: 'View Status',
  reportAnother: '+ Report Another',
  myReports: 'My Reports',
  noReportsTitle: 'No reports yet',
  noReportsDesc: 'Your submitted issues will appear here.',
  loading: 'Loading…',
  submitted: 'Submitted',
  validating: 'Validating',
  routing: 'Routing',
  routed: 'Routed',
  in_progress: 'In Progress',
  escalated: 'Escalated',
  publicly_escalated: 'Publicly Escalated',
  resolved: 'Resolved',
  verified_resolved: 'Verified',
  disputed_resolution: 'Disputed',
  duplicate_candidate: 'Duplicate?',
  closed: 'Closed',
  inconclusive: 'Inconclusive',
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  garbage: 'Garbage',
  water_leakage: 'Water Leakage',
  drainage: 'Drainage',
  road_damage: 'Road Damage',
  traffic_signal: 'Traffic Signal',
  other: 'Other',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

const LANGUAGES = [
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'kn', name: 'Kannada' }
];

const LOCALES_DIR = path.resolve(__dirname, '../../../citizen-app/src/locales');

async function main() {
  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }

  // Write base English file
  fs.writeFileSync(path.join(LOCALES_DIR, 'en.json'), JSON.stringify(baseStrings, null, 2));
  console.log('✅ Generated en.json');

  for (const lang of LANGUAGES) {
    console.log(`⏳ Translating to ${lang.name}...`);
    try {
      const targetPath = path.join(LOCALES_DIR, `${lang.code}.json`);
      if (fs.existsSync(targetPath)) {
        console.log(`⏩ Skipping ${lang.name} (already exists)`);
        continue;
      }
      const prompt = `
You are a professional software translator. Translate the following JSON object's VALUES into ${lang.name}.
Keep the KEYS exactly the same. Do not translate the keys.
If a value contains a placeholder like {count} or {contact}, KEEP the placeholder exactly as is.
If a value contains emojis, KEEP the emojis.

JSON to translate:
${JSON.stringify(baseStrings, null, 2)}

Return ONLY valid JSON. No markdown formatting, no code blocks, just raw JSON.`;

      // Sleep to avoid rate limits
      await new Promise(r => setTimeout(r, 10000));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const translatedText = response.text;
      // Ensure it parses correctly
      const translatedJson = JSON.parse(translatedText || "{}");

      fs.writeFileSync(targetPath, JSON.stringify(translatedJson, null, 2));
      console.log(`✅ Generated ${lang.code}.json`);
    } catch (err) {
      console.error(`❌ Failed to translate ${lang.name}:`, err);
    }
  }

  console.log('🎉 All translations generated successfully!');
}

main();
