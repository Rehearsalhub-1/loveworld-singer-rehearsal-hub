import { NextResponse } from 'next/server';
import https from 'https';

const KINGSCHAT_API_KEY = process.env.KINGSCHAT_API_KEY || process.env.NEXT_PUBLIC_KINGSCHAT_API_KEY || 'cjAOL6hByMN3QA8CQ59K5MtG+4PdR2E6NbRL7hVa8po=';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      return new NextResponse('Access token is missing', { status: 400 });
    }

    if (!KINGSCHAT_API_KEY) {
      return new NextResponse('KingsChat API Key is not configured on server', { status: 500 });
    }

    // Call KingsChat profile endpoint using Node's native https module to avoid stream / CORS preflight issues
    const profile = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'connect.kingsch.at',
        path: '/developer/api/user/profile',
        method: 'GET',
        headers: {
          'api-key': KINGSCHAT_API_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseData));
            } catch (err) {
              reject(new Error('Failed to parse profile response JSON'));
            }
          } else {
            reject(new Error(`Failed to fetch profile: Status ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('KingsChat Profile Proxy Error:', error);
    return new NextResponse(`Profile Error: ${error.message}`, { status: 500 });
  }
}
