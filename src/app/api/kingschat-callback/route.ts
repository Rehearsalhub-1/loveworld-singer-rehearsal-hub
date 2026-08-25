import { NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';

const KINGSCHAT_CLIENT_ID = process.env.NEXT_PUBLIC_KINGSCHAT_CLIENT_ID || 'a1f444fa-ea50-47cf-ba2b-232d0b46d1f5';

function logDebug(message: string) {
  console.log(`[KINGSCHAT DEBUG] ${message}`);
  try {
    const logPath = path.join(process.cwd(), 'debug-callback.log');
    const time = new Date().toISOString();
    fs.appendFileSync(logPath, `[${time}] ${message}\n`);
  } catch (e) {
    // Silent catch for read-only environments
  }
}

async function exchangeCodeForTokens(code: string): Promise<any> {
  logDebug(`Exchanging code for tokens: ${code}`);
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      grant_type: 'code',
      client_id: KINGSCHAT_CLIENT_ID,
      code: code,
    });

    const options = {
      hostname: 'connect.kingsch.at',
      port: 443,
      path: '/developer/api/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        logDebug(`Token response status: ${res.statusCode}`);
        logDebug(`Token response body: ${body}`);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse token response JSON: ${body}`));
          }
        } else {
          reject(new Error(`Token exchange failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      logDebug(`Token exchange connection error: ${err.message}`);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

function generateResponseHtml(tokens: any, origin: string | null) {
  const { access_token, refresh_token, expires_in_millis } = tokens;

  if (origin === 'mobile' || origin === 'mobile-flow') {
    const deepLink = `rehearsalhub://kingschat-callback?access_token=${access_token}&refresh_token=${refresh_token || ''}&expires_in=${expires_in_millis || ''}`;
    return `
      <html>
        <head>
          <title>Redirecting...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0c0c0e; color: #fff; }
            .loader { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #7c3aed; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            p { font-size: 16px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <p>Redirecting back to Rehearsal Hub...</p>
          <script>
            setTimeout(function() {
              window.location.href = "${deepLink}";
            }, 300);
          </script>
        </body>
      </html>
    `;
  }

  // Web Flow
  return `
    <html>
      <head>
        <title>Authenticated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0c0c0e; color: #fff; }
          p { font-size: 16px; font-weight: 500; }
        </style>
      </head>
      <body>
        <p>Authentication successful! Returning to app...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'kingschat_auth_success',
              accessToken: "${access_token}",
              refreshToken: "${refresh_token}",
              expiresInMillis: ${expires_in_millis}
            }, '*');
            window.close();
          } else {
            localStorage.setItem('kingschat_access_token', "${access_token}");
            window.location.href = '/auth';
          }
        </script>
      </body>
    </html>
  `;
}

export async function POST(request: Request) {
  try {
    logDebug(`POST request received at: ${request.url}`);
    
    // Log headers
    const headersObj: any = {};
    request.headers.forEach((val, key) => { headersObj[key] = val; });
    logDebug(`POST headers: ${JSON.stringify(headersObj)}`);

    // Log query params
    const { searchParams } = new URL(request.url);
    const queryCode = searchParams.get('code');
    const queryOrigin = searchParams.get('origin');
    logDebug(`POST Query params - code: ${queryCode}, origin: ${queryOrigin}`);

    let code = queryCode;
    let origin = queryOrigin;

    if (!code) {
      try {
        const bodyText = await request.text();
        logDebug(`POST Body text: ${bodyText}`);
        
        if (bodyText) {
          // Try parsing as JSON if it looks like JSON
          if (bodyText.trim().startsWith('{')) {
            try {
              const body = JSON.parse(bodyText);
              code = body?.code;
              origin = body?.origin;
              logDebug(`Parsed body as JSON - code: ${code}, origin: ${origin}`);
            } catch (jsonErr: any) {
              logDebug(`Failed to parse body as JSON: ${jsonErr.message}`);
            }
          }
          
          // If code still not found, try parsing as urlencoded form data
          if (!code) {
            try {
              const params = new URLSearchParams(bodyText);
              code = params.get('code');
              origin = params.get('origin');
              logDebug(`Parsed body as URLSearchParams - code: ${code}, origin: ${origin}`);
            } catch (urlErr: any) {
              logDebug(`Failed to parse body as URLSearchParams: ${urlErr.message}`);
            }
          }
        }
      } catch (readErr: any) {
        logDebug(`Failed to read request body: ${readErr.message}`);
      }
    }

    if (!code) {
      logDebug('Error: Authorization code is missing');
      return new NextResponse('Authorization code is missing', { status: 400 });
    }

    const tokens = await exchangeCodeForTokens(code);
    const html = generateResponseHtml(tokens, origin);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    logDebug(`POST handler main catch block: ${error.message}`);
    console.error('KingsChat POST Callback Error:', error);
    return new NextResponse(`Authentication Error: ${error.message}`, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    logDebug(`GET request received at: ${request.url}`);
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const origin = searchParams.get('origin');
    logDebug(`GET Query params - code: ${code}, origin: ${origin}`);

    if (!code) {
      logDebug('Error: Authorization code is missing');
      return new NextResponse('Authorization code is missing', { status: 400 });
    }

    const tokens = await exchangeCodeForTokens(code);
    const html = generateResponseHtml(tokens, origin);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    logDebug(`GET handler main catch block: ${error.message}`);
    console.error('KingsChat GET Callback Error:', error);
    return new NextResponse(`Authentication Error: ${error.message}`, { status: 500 });
  }
}
