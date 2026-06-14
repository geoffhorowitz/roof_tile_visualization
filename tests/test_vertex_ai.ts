import fs from 'fs';
import path from 'path';
import { predictVertexAI } from '../utils/vertexClient';
import configs from '../utils/configLoader';

async function runTest() {
  console.log('--- Testing Agent Platform Client Connection ---');
  console.log('Project ID:', configs.vertex_ai_settings.project_id);
  console.log('Location:', configs.vertex_ai_settings.location);
  console.log('Endpoint ID:', configs.vertex_ai_settings.endpoint_id);
  console.log('Use Agent Platform toggle:', configs.vertex_ai_settings.use_vertex_ai);

  // Check if configuration is present
  if (!configs.vertex_ai_settings.project_id || !configs.vertex_ai_settings.endpoint_id) {
    console.warn('⚠️ Warning: Agent Platform configuration is missing in environment variables.');
    console.log('Please configure VERTEX_PROJECT_ID and VERTEX_ENDPOINT_ID in .env.local to run this test against a live endpoint.');
    console.log('Or verify that you have set VERTEX_SERVICE_ACCOUNT_KEY if running locally.');
    console.log('This test will run in mock validation mode (simulating auth and calling endpoint with placeholder values).');
  }

  // Load house.jpg from public folder
  const houseImagePath = path.join(process.cwd(), 'public/house.jpg');
  if (!fs.existsSync(houseImagePath)) {
    console.error(`❌ Error: House image not found at ${houseImagePath}`);
    process.exit(1);
  }

  console.log(`Loading input image from ${houseImagePath}...`);
  const imageBuffer = fs.readFileSync(houseImagePath);
  const base64Input = imageBuffer.toString('base64');

  // Simple test workflow JSON
  const testWorkflow = {
    "9": {
      "class_type": "LoadImage",
      "inputs": {
        "image": "input.png"
      }
    }
  };

  try {
    console.log('Sending test prediction request to Agent Platform Endpoint...');
    const startTime = Date.now();
    const base64Output = await predictVertexAI(testWorkflow, base64Input);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Success! Received response from Agent Platform in ${duration}s.`);
    const outputBuffer = Buffer.from(base64Output, 'base64');
    const outputPath = path.join(process.cwd(), 'tests/vertex_test_output.png');
    fs.writeFileSync(outputPath, outputBuffer);
    console.log(`Saved output image to ${outputPath}`);
  } catch (err: any) {
    console.error('❌ Agent Platform Prediction failed:', err.message);
    console.log('\nNote: This is expected if you do not have a live endpoint ID configured or if your Service Account Key is missing.');
  }
}

runTest();
