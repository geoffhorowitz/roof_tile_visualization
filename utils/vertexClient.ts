import crypto from 'crypto';
import configs from './configLoader';

// Cache for access token to avoid re-authenticating on every call within token lifetime
let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Signs a JWT assertion for the Google OAuth 2.0 token endpoint using a Service Account Key.
 */
function signJwt(serviceAccount: any): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour expiration
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${base64Header}.${base64Payload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Obtains an access token from the GCP Metadata Server when running on Cloud Run.
 */
async function getMetadataToken(): Promise<string> {
  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: {
          'Metadata-Flavor': 'Google'
        },
        // Low timeout for metadata server to avoid hanging if running locally without it
        signal: AbortSignal.timeout(2000)
      }
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    return data.access_token;
  } catch (error: any) {
    throw new Error(`Metadata server authentication failed: ${error.message}`);
  }
}

/**
 * Exchanges a JWT assertion for an Access Token at the Google OAuth endpoint.
 */
async function getServiceAccountToken(serviceAccountKey: string): Promise<string> {
  const sa = JSON.parse(serviceAccountKey);
  const jwt = signJwt(sa);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange JWT for token: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

/**
 * Resolves a valid Google Access Token, caching it for reuse.
 */
async function getAccessToken(): Promise<string> {
  const nowMs = Date.now();
  if (tokenCache && tokenCache.expiresAt > nowMs + 60000) {
    return tokenCache.token;
  }

  const saKey = process.env.VERTEX_SERVICE_ACCOUNT_KEY;
  let token = '';

  if (saKey && saKey.trim() !== '') {
    token = await getServiceAccountToken(saKey);
  } else {
    // Fallback to metadata server (Cloud Run IAM Identity)
    token = await getMetadataToken();
  }

  // Tokens are typically valid for 1 hour. Cache for 50 minutes.
  tokenCache = {
    token,
    expiresAt: nowMs + 50 * 60 * 1000
  };

  return token;
}

/**
 * Dispatches the image generation request to the Agent Platform (formerly Vertex AI) custom prediction endpoint.
 * Returns the output image as a base64 encoded string.
 */
export async function predictVertexAI(workflowJson: object, base64Image: string): Promise<string> {
  const { project_id, location, endpoint_id } = configs.vertex_ai_settings;

  if (!project_id || !location || !endpoint_id) {
    throw new Error(
      `Agent Platform configuration is incomplete. Project: '${project_id}', Location: '${location}', Endpoint: '${endpoint_id}'.`
    );
  }

  const token = await getAccessToken();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project_id}/locations/${location}/endpoints/${endpoint_id}:predict`;

  const requestBody = {
    instances: [
      {
        workflow: workflowJson,
        image: base64Image
      }
    ]
  };

  console.log(`Sending prediction request to Agent Platform Endpoint: ${endpoint_id}`);
  const start = Date.now();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log(`Agent Platform Endpoint request completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Agent Platform Predict API returned status ${res.status}: ${errText}`);
  }

  const resData = (await res.json()) as {
    predictions?: Array<{ image?: string }>;
    error?: { message?: string };
  };

  if (resData.error) {
    throw new Error(`Agent Platform Endpoint error: ${resData.error.message || JSON.stringify(resData.error)}`);
  }

  const prediction = resData.predictions?.[0];
  if (!prediction || !prediction.image) {
    throw new Error(`Agent Platform prediction response is missing output image. Response: ${JSON.stringify(resData)}`);
  }

  return prediction.image;
}
