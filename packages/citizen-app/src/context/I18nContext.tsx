/**
 * CivicMind — Lightweight i18n Context (NFR-5)
 * Supports English and Tamil. All citizen-facing UI strings go here.
 * Usage: const { t } = useI18n(); then t('key')
 */

import React, { createContext, useContext, useState } from 'react';

export type Locale = 'en' | 'ta';

const strings = {
  en: {
    // App-wide
    appName: 'CivicMind',
    appTagline: 'Empowering communities through transparent civic participation',
    
    // Onboarding
    onboarding1Title: 'Report in Seconds',
    onboarding1Sub: 'Just take a photo. Our AI identifies the issue and severity automatically — no forms required.',
    onboarding2Title: 'We Route It Automatically',
    onboarding2Sub: "CivicMind's AI finds the right department and drafts a formal complaint on your behalf.",
    onboarding3Title: "We Verify It's Actually Fixed",
    onboarding3Sub: 'Our AI compares before/after photos to confirm real resolution — not just a status change.',
    skip: 'Skip →',
    continue: 'Continue →',
    getStarted: 'Get Started',

    // Auth
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

    // Home
    nearbyIssues: 'Nearby Issues ({count})',
    noIssuesTitle: 'No issues nearby',
    noIssuesDesc: 'Your area looks good! Tap the button below to report a problem.',
    reportAnIssue: '📸 Report an Issue',
    showAll: '▲ Show All',
    collapse: '▼ Collapse',
    moreNearby: '+{count} more nearby',
    issueCount: '{count} issues',

    // Report flow
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

    // Classification Review
    reviewTitle: 'AI Classification',
    reviewSub: 'Review and confirm before submitting',
    category: 'Category',
    severity: 'Severity',
    confidence: 'Confidence',
    confirmAndSubmit: 'Confirm & Submit',
    editCategory: 'Edit',

    // Confirmation
    reportSubmitted: 'Report Submitted!',
    trackingId: 'Tracking ID',
    viewStatus: 'View Status',
    reportAnother: '+ Report Another',

    // My Reports
    myReports: 'My Reports',
    noReportsTitle: 'No reports yet',
    noReportsDesc: 'Your submitted issues will appear here.',
    loading: 'Loading…',

    // Status labels
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

    // Category labels
    pothole: 'Pothole',
    streetlight: 'Streetlight',
    garbage: 'Garbage',
    water_leakage: 'Water Leakage',
    drainage: 'Drainage',
    road_damage: 'Road Damage',
    traffic_signal: 'Traffic Signal',
    other: 'Other',

    // Severity labels
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',

    // Language toggle
    switchLanguage: 'தமிழ்',
  },

  ta: {
    // App-wide
    appName: 'CivicMind',
    appTagline: 'வெளிப்படையான குடிமைப் பங்கேற்பு மூலம் சமூகங்களை மேம்படுத்துதல்',

    // Onboarding
    onboarding1Title: 'வினாடிகளில் புகாரளிக்கவும்',
    onboarding1Sub: 'ஒரு புகைப்படம் எடுங்கள். எங்கள் AI தானாகவே சிக்கலை அடையாளம் காண்கிறது — படிவங்கள் தேவையில்லை.',
    onboarding2Title: 'நாங்கள் தானாகவே திருப்பி விடுகிறோம்',
    onboarding2Sub: 'CivicMind-ன் AI சரியான துறையைக் கண்டறிந்து உங்கள் சார்பில் முறையான புகார் வரைவு செய்கிறது.',
    onboarding3Title: 'நாங்கள் உண்மையிலேயே சரி செய்யப்பட்டதை சரிபார்க்கிறோம்',
    onboarding3Sub: 'எங்கள் AI முன்/பின் புகைப்படங்களை ஒப்பிட்டு உண்மையான தீர்வை உறுதிப்படுத்துகிறது.',
    skip: 'தவிர்க்கவும் →',
    continue: 'தொடரவும் →',
    getStarted: 'தொடங்குங்கள்',

    // Auth
    continueAsGuest: 'விருந்தினராக தொடரவும்',
    guestDesc: 'உடனடியாக சிக்கல்களை புகாரளிக்கவும். அறிவிப்புகள் இல்லை — உங்கள் புகார்கள் சமூகத்திற்கு உதவுகின்றன.',
    createAccount: 'கணக்கை உருவாக்கவும்',
    accountDesc: 'நேரடி நிலை புதுப்பிப்புகளைப் பெறவும் மற்றும் உங்கள் அனைத்து புகார்களையும் கண்காணிக்கவும்.',
    phone: '📱 தொலைபேசி',
    email: '✉️ மின்னஞ்சல்',
    sendCode: 'சரிபார்ப்பு குறியீட்டை அனுப்பவும்',
    enterCode: 'சரிபார்ப்பு குறியீட்டை உள்ளிடவும்',
    verifyAndContinue: 'சரிபார்த்து தொடரவும்',
    sending: '⏳ அனுப்புகிறது…',
    verifying: '⏳ சரிபார்க்கிறது…',
    enterContactError: 'உங்கள் தொலைபேசி எண் அல்லது மின்னஞ்சலை உள்ளிடவும்.',
    enterCodeError: 'குறியீட்டை உள்ளிடவும்.',
    demoCodeHint: '{contact}-க்கு குறியீடு அனுப்பப்பட்டது. (டெமோ: எந்த 4+ இலக்கங்களையும் உள்ளிடவும்.)',
    otpPlaceholder: '+91 98765 43210',

    // Home
    nearbyIssues: 'அருகிலுள்ள சிக்கல்கள் ({count})',
    noIssuesTitle: 'அருகில் சிக்கல்கள் இல்லை',
    noIssuesDesc: 'உங்கள் பகுதி நல்லது! கீழே உள்ள பொத்தானை அழுத்தி ஒரு பிரச்சனையை புகாரளிக்கவும்.',
    reportAnIssue: '📸 சிக்கலை புகாரளிக்கவும்',
    showAll: '▲ அனைத்தையும் காட்டு',
    collapse: '▼ சுருக்கு',
    moreNearby: '+{count} மேலும் அருகில்',
    issueCount: '{count} சிக்கல்கள்',

    // Report flow
    reportTitle: 'சிக்கலை புகாரளிக்கவும்',
    addPhotos: 'புகைப்படங்களை சேர்க்கவும்',
    photoDesc: 'சிக்கலின் தெளிவான புகைப்படங்களை எடுக்கவும் அல்லது பதிவேற்றவும்',
    location: 'இடம்',
    locationAuto: 'உங்கள் இடத்தை கண்டறிகிறது…',
    pinYourLocation: 'உங்கள் இடத்தை பின் செய்யவும்',
    description: 'விளக்கம் (விருப்பமான)',
    descPlaceholder: 'நீங்கள் பார்ப்பதை விவரிக்கவும்…',
    analyzing: 'AI பகுப்பாய்வு செய்கிறது…',
    submitReport: 'புகாரை சமர்ப்பிக்கவும்',
    submitting: 'சமர்ப்பிக்கிறது…',

    // Classification Review
    reviewTitle: 'AI வகைப்பாடு',
    reviewSub: 'சமர்ப்பிக்கும் முன் சரிபார்த்து உறுதிப்படுத்தவும்',
    category: 'வகை',
    severity: 'தீவிரம்',
    confidence: 'நம்பிக்கை',
    confirmAndSubmit: 'உறுதிப்படுத்தி சமர்ப்பிக்கவும்',
    editCategory: 'திருத்தவும்',

    // Confirmation
    reportSubmitted: 'புகார் சமர்ப்பிக்கப்பட்டது!',
    trackingId: 'கண்காணிப்பு ID',
    viewStatus: 'நிலையை காணவும்',
    reportAnother: '+ மற்றொரு புகார்',

    // My Reports
    myReports: 'என் புகார்கள்',
    noReportsTitle: 'இன்னும் புகார்கள் இல்லை',
    noReportsDesc: 'நீங்கள் சமர்ப்பித்த சிக்கல்கள் இங்கே தோன்றும்.',
    loading: 'ஏற்றுகிறது…',

    // Status labels
    submitted: 'சமர்ப்பிக்கப்பட்டது',
    validating: 'சரிபார்க்கிறது',
    routing: 'திருப்பி விடுகிறது',
    routed: 'திருப்பி விடப்பட்டது',
    in_progress: 'நடந்து கொண்டிருக்கிறது',
    escalated: 'உயர்த்தப்பட்டது',
    publicly_escalated: 'பொதுவில் உயர்த்தப்பட்டது',
    resolved: 'தீர்க்கப்பட்டது',
    verified_resolved: 'சரிபார்க்கப்பட்டது',
    disputed_resolution: 'மறுக்கப்பட்டது',
    duplicate_candidate: 'நகல்?',
    closed: 'மூடப்பட்டது',
    inconclusive: 'தெளிவற்றது',

    // Category labels
    pothole: 'குழி',
    streetlight: 'தெரு விளக்கு',
    garbage: 'குப்பை',
    water_leakage: 'தண்ணீர் கசிவு',
    drainage: 'வடிகால்',
    road_damage: 'சாலை சேதம்',
    traffic_signal: 'போக்குவரத்து சமிக்ஞை',
    other: 'பிற',

    // Severity labels
    low: 'குறைவு',
    medium: 'நடுத்தரம்',
    high: 'அதிகம்',
    critical: 'மிக முக்கியம்',

    // Language toggle
    switchLanguage: 'English',
  },
};

type StringKey = keyof typeof strings.en;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LS_LOCALE_KEY = 'civicmind_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LS_LOCALE_KEY);
    return (saved === 'ta' ? 'ta' : 'en') as Locale;
  });

  const setLocale = (l: Locale) => {
    localStorage.setItem(LS_LOCALE_KEY, l);
    setLocaleState(l);
  };

  const t = (key: StringKey, vars?: Record<string, string | number>): string => {
    let str: string = (strings[locale] as Record<string, string>)[key] ?? (strings.en as Record<string, string>)[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
