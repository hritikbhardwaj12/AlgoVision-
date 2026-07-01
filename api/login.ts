import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import { MongoClient } from 'mongodb';

// Cache clientPromise at module level, but initialize it inside the handler at runtime
let clientPromise: Promise<MongoClient> | null = null;
let googleAuthClient: OAuth2Client | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 1. Get and verify environment variables at runtime inside the handler
  const uri = process.env.MONGODB_URI;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!uri) {
    console.error('Runtime Error: MONGODB_URI is not set in Vercel Environment Variables');
    return res.status(500).json({ message: 'Configuration error: MONGODB_URI is missing' });
  }

  if (!googleClientId) {
    console.error('Runtime Error: GOOGLE_CLIENT_ID is not set in Vercel Environment Variables');
    return res.status(500).json({ message: 'Configuration error: GOOGLE_CLIENT_ID is missing' });
  }

  // 2. Initialize clients if not already cached
  if (!clientPromise) {
    const mongoClient = new MongoClient(uri);
    clientPromise = mongoClient.connect();
  }

  if (!googleAuthClient) {
    googleAuthClient = new OAuth2Client(googleClientId);
  }

  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'Missing credential token' });
  }

  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    const { email, name, picture } = payload;

    const connectedClient = await clientPromise;
    const db = connectedClient.db('algovision');
    const usersCollection = db.collection('users');

    await usersCollection.updateOne(
      { email },
      {
        $set: {
          name,
          email,
          picture,
          lastLogin: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      user: {
        name,
        email,
        picture,
      },
    });
  } catch (error: any) {
    console.error('Error during login / authentication:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
