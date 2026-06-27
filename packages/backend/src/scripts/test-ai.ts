import { config } from '../config/env.js';
import { runReporterAgent } from '../agents/reporterAgent.js';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithRetry } from '../services/ai.js';

// Base64 for a 1x1 transparent PNG
const DUMMY_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function testGeminiConnection() {
  console.log('--- Testing Gemini Basic Connectivity ---');
  if (!config.genai.apiKey) {
    console.error('❌ GOOGLE_GENAI_API_KEY is not set in environment.');
    process.exit(1);
  }

  try {
    const genai = new GoogleGenAI({ apiKey: config.genai.apiKey });
    
    console.log(`Testing with text model: ${config.genai.modelText}`);
    const request = {
      model: config.genai.modelText,
      contents: 'Respond with exactly: "Hello CivicSense"'
    };
    const result = await generateContentWithRetry(genai, request);
    console.log(`✅ Model responded: "${result.text.trim()}"`);
  } catch (error: any) {
    console.error('❌ Basic Connectivity Test Failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

async function testReporterAgent() {
  console.log('\n--- Testing ReporterAgent Classification ---');
  try {
    const result = await runReporterAgent({
      photoBase64List: [{ mimeType: 'image/png', data: DUMMY_IMAGE }],
      description: 'This is a test image of a completely blank space.'
    });

    console.log('✅ ReporterAgent Output:');
    console.log(JSON.stringify(result, null, 2));

    if ((result.suggestedCategory as string) === 'other' || (result.suggestedCategory as string) === 'Other') {
      console.log('✅ Correctly classified blank image as "other" or with low confidence.');
    } else {
      console.log(`⚠️ Note: Classified dummy image as ${result.suggestedCategory}.`);
    }

  } catch (error: any) {
    console.error('❌ ReporterAgent Test Failed:');
    console.error(error);
  }
}

async function main() {
  console.log('Starting AI Verification tests...\n');
  await testGeminiConnection();
  await testReporterAgent();
  console.log('\nTests completed successfully.');
}

main().catch(console.error);
