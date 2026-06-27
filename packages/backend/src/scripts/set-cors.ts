import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from the root directory
config({ path: resolve(process.cwd(), '../../.env') });

import { getStorage } from '../config/firebase.js';

async function setCors() {
  try {
    const bucket = getStorage().bucket();
    console.log(`Setting CORS for bucket: ${bucket.name}...`);
    
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable']
      }
    ]);
    
    console.log('✅ CORS configuration successfully updated!');
  } catch (err) {
    console.error('❌ Failed to set CORS:', err);
  }
}

setCors();
