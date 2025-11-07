import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import { randomUUID } from 'crypto';

// Firebase removed temporarily - using local file system for attachments
// import { storage, uploadFile } from '../components/firebase'; 
// import { ref } from 'firebase/storage';

// =========================================
// DEV-MODE PERSISTENCE
// =========================================
const STORAGE_FILE = path.join(process.cwd(), '.dev_storage.json');

interface DevStorage {
  sessions: Record<string, { userId: string; email: string; profile_uuid?: string }>;
  tokens: Record<string, any>;
}

let storageCache: DevStorage = { sessions: {}, tokens: {} };

const loadStorage = (): DevStorage => {
  if (process.env.NODE_ENV === 'production') return storageCache; // Don't use file in prod
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      storageCache = JSON.parse(data);
    }
  } catch (e) {
    console.error('[Storage] Failed to load dev storage:', e);
    storageCache = { sessions: {}, tokens: {} };
  }
  return storageCache;
};

const saveStorage = (storageToSave: DevStorage) => {
  if (process.env.NODE_ENV === 'production') return;
  try {
    storageCache = storageToSave;
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageCache, null, 2));
  } catch (e) {
    console.error('[Storage] Failed to save dev storage:', e);
  }
};

// =========================================
// OAUTH & GMAIL CLIENT
// =========================================
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

interface Session { userId: string; email: string; profile_uuid?: string; }

/** Gets the session from the cookie and storage */
const getSession = (request: NextRequest): Session | null => {
  const storage = loadStorage();
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return null;
  return storage.sessions[sessionId] || null;
};

/** Gets valid tokens for the current session */
const getTokens = (request: NextRequest): any | null => {
  const storage = loadStorage();
  const session = getSession(request);
  if (!session) return null;
  return storage.tokens[session.userId] || null;
};

// =========================================
// EMAIL PROCESSING HELPERS
// =========================================

// --- MODIFIED INTERFACE ---
interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  url?: string; // We will store the public Firebase URL here
  attachmentId?: string; // Keep for reference if needed
}
interface ProcessedEmail {
  id: string; threadId: string; subject: string; from: string; fromEmail: string;
  to: string;
  date: string; snippet: string; body: string; isRead: boolean;
  hasAttachments: boolean; attachments: EmailAttachment[]; labels: string[];
  isInvoice?: boolean;
  invoiceConfidence?: number;
}

const decodeBase64Url = (data: string): string => {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) { return ''; }
};

const getHeader = (headers: any[], name: string): string => {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

const parseEmailAddress = (emailString: string): { name: string; email: string } => {
  const match = emailString.match(/^"?(.+?)"?\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: emailString, email: emailString };
};

const getEmailBody = (payload: any): string => {
  let body = '';
  if (payload.body?.size > 0 && payload.body.data) {
    body = decodeBase64Url(payload.body.data);
  } else if (payload.parts) {
    const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
    const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
    if (htmlPart?.body?.data) {
      body = decodeBase64Url(htmlPart.body.data);
    } else if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data);
      // Basic plain text to HTML
      body = `<div style="white-space: pre-wrap; font-family: monospace;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    } else {
      // Handle nested parts (e.g., multipart/alternative)
      for (const part of payload.parts) {
        const nestedBody = getEmailBody(part);
        if (nestedBody) { body = nestedBody; break; }
      }
    }
  }
  return body;
};

/**
 * --- MODIFIED FUNCTION ---
 * Uses the imported `uploadFile` helper.
 */
const processEmail = async (
  gmail: any, // Gmail API client
  userId: string, // User's Google ID
  message: any // The raw message object from Gmail
): Promise<ProcessedEmail> => {
  const payload = message.payload;
  const headers = payload.headers;
  const { name: fromName, email: fromEmail } = parseEmailAddress(getHeader(headers, 'From'));
  
  const attachments: EmailAttachment[] = [];
  const parts = payload.parts || [];

  for (const part of parts) {
    // Find parts that are attachments and have an attachmentId
    if (part.filename && part.body?.attachmentId) {
      try {
        console.log(`[processEmail] Found attachment: ${part.filename}`);
        // 1. Fetch attachment data from Gmail
        const attData = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: message.id,
          id: part.body.attachmentId,
        });

        if (attData.data?.data) {
          // 2. Convert Base64 data to a Buffer
          const buffer = Buffer.from(attData.data.data, 'base64');
          
          // 3. Save to local file system (public/attachments)
          const uploadDir = path.join(process.cwd(), 'public', 'attachments', userId, message.id);
          
          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const localFilePath = path.join(uploadDir, part.filename);
          fs.writeFileSync(localFilePath, buffer);
          
          // 4. Create public URL (relative to public folder)
          const publicUrl = `/attachments/${userId}/${message.id}/${encodeURIComponent(part.filename)}`;
          
          console.log(`[processEmail] Saved attachment locally: ${publicUrl}`);

          // 5. Add to attachments array with the public URL
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            url: publicUrl, // Local URL
          });
        }
      } catch (uploadError) {
        console.error(`[processEmail] Failed to save attachment ${part.filename}:`, uploadError);
        // Add to array anyway, but without a URL, so the frontend knows it exists
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          url: undefined, // Explicitly undefined
        });
      }
    }
  }

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject'),
    from: fromName,
    fromEmail,
    to: getHeader(headers, 'To'),
    date: getHeader(headers, 'Date'),
    snippet: message.snippet,
    body: getEmailBody(payload),
    isRead: !message.labelIds?.includes('UNREAD'),
    hasAttachments: attachments.length > 0,
    attachments,
    labels: message.labelIds || [],
  };
};

// ============================================
// API ROUTES
// ============================================

/**
 * POST /api/auth/google
 */
export async function authGoogle(request: NextRequest) {
  let storage = loadStorage();
  try {
    const { credential, email } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid credential' }, { status: 400 });
    }

    const userId = payload.sub;
    const userEmail = email || payload.email!;

    // Create or get profile
    const db = await getDb();
    const profiles = db.collection('profiles');
    let profile = await profiles.findOne({ google_id: userId });
    if (!profile) {
      const uuid = randomUUID();
      await profiles.insertOne({
        uuid,
        google_id: userId,
        email: userEmail,
        created_at: new Date(),
      });
      profile = await profiles.findOne({ uuid });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    storage.sessions[sessionId] = { userId, email: userEmail, profile_uuid: profile!.uuid };
    saveStorage(storage);
    console.log('[authGoogle] Session created:', sessionId, 'for user:', userId);

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ];
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force refresh token
      state: sessionId,
    });

    const response = NextResponse.json({ success: true, requiresGmailAuth: true, authUrl });
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false on localhost
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;

  } catch (error: any) {
    console.error('[authGoogle] Error:', error);
    return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500 });
  }
}

/**
 * GET /api/auth/google/callback
 */
export async function authGoogleCallback(request: NextRequest) {
  let storage = loadStorage(); // Load fresh data
  console.log('[Callback] HIT! Processing callback...');
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is our sessionId

    if (!code || !state) {
      throw new Error('Authorization code or state is missing');
    }
    console.log('[Callback] State received:', state);

    const session = storage.sessions[state];
    if (!session) {
      console.error('[Callback] Error: Session not found for state. Storage:', storage.sessions);
      throw new Error('Invalid or expired session. Please try logging in again.');
    }
    console.log('[Callback] Session matched for user:', session.userId);

    const { tokens } = await oauth2Client.getToken(code);
    console.log('[Callback] Tokens received from Google.');

    storage.tokens[session.userId] = tokens;
    saveStorage(storage);
    console.log('[Callback] Tokens saved for user:', session.userId);

    // Return HTML to close the popup and notify the parent window
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>Auth Success</title></head>
        <body style="background:#1a1f26;color:white;font-family:sans-serif;text-align:center;padding-top:50px;">
          <h1>✓ Success!</h1>
          <p>Your account is connected. This window will close automatically.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'gmail-auth-success' }, '*');
            }
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error: any) {
    console.error('[Callback] Error:', error);
    return new NextResponse(`
      <!DOCTYPE html><html><body style="background:#1a1f26;color:red;font-family:sans-serif;text-align:center;padding-top:50px;">
        <h1>✕ Authorization Failed</h1><p>${error.message}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' }, status: 500 });
  }
}

/**
 * GET /api/auth/status
 */
export async function authStatus(request: NextRequest) {
  let session = getSession(request); // getSession loads fresh storage
  const storage = storageCache; // Use the cache populated by getSession

  if (session && !session.profile_uuid) {
    console.log('[authStatus] No profile_uuid in session, creating...');
    try {
      const db = await getDb();
      const profiles = db.collection('profiles');
      let profile = await profiles.findOne({ google_id: session.userId });
      if (!profile) {
        const uuid = randomUUID();
        await profiles.insertOne({
          uuid,
          google_id: session.userId,
          email: session.email,
          created_at: new Date(),
        });
        profile = await profiles.findOne({ uuid });
      }
      // Update storage
      const sessionId = request.cookies.get('session_id')?.value;
      if (sessionId && storage.sessions[sessionId]) {
        storage.sessions[sessionId].profile_uuid = profile!.uuid;
        saveStorage(storage);
      }
      session.profile_uuid = profile!.uuid;
    } catch (error) {
      console.error('[authStatus] Error creating profile:', error);
    }
  }

  const hasTokens = session ? !!storage.tokens[session.userId] : false;

  console.log(`[authStatus] Session: ${session?.userId || 'none'} | Has Tokens: ${hasTokens}`);

  return NextResponse.json({
    isAuthenticated: hasTokens,
    userEmail: session?.email || null,
    profile_uuid: session?.profile_uuid || null,
  });
}

/**
 * POST /api/auth/disconnect
 */
export async function authDisconnect(request: NextRequest) {
  let storage = loadStorage();
  try {
    const session = getSession(request);
    if (session) {
      const tokens = storage.tokens[session.userId];
      if (tokens?.access_token) {
        // Revoke the token
        await oauth2Client.revokeToken(tokens.access_token);
        console.log('[Disconnect] Token revoked for user:', session.userId);
      }
      // Clear from storage
      delete storage.tokens[session.userId];
      const sessionId = request.cookies.get('session_id')?.value;
      if (sessionId) delete storage.sessions[sessionId];
      saveStorage(storage);
    }
  } catch (error: any) {
    console.error('[Disconnect] Error revoking token:', error.message);
    // Continue to log out even if revoke fails
  }

  const response = NextResponse.json({ success: true, message: 'Disconnected' });
  response.cookies.delete('session_id');
  return response;
}


/**
 * --- MODIFIED FUNCTION ---
 * GET /api/emails
 */
export async function getEmails(request: NextRequest) {
  try {
    const tokens = getTokens(request);
    let session = getSession(request); // Get session to access userId
    
    if (!tokens || !session) {
      console.log('[getEmails] Unauthorized: No tokens or session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.profile_uuid) {
      console.log('[getEmails] No profile_uuid in session, creating...');
      const db = await getDb();
      const profiles = db.collection('profiles');
      let profile = await profiles.findOne({ google_id: session.userId });
      if (!profile) {
        const uuid = randomUUID();
        await profiles.insertOne({
          uuid,
          google_id: session.userId,
          email: session.email,
          created_at: new Date(),
        });
        profile = await profiles.findOne({ uuid });
      }
      // Update storage
      loadStorage(); // reload to fresh
      const storage = storageCache;
      const sessionId = request.cookies.get('session_id')?.value;
      if (sessionId && storage.sessions[sessionId]) {
        storage.sessions[sessionId].profile_uuid = profile!.uuid;
        saveStorage(storage);
      }
      session.profile_uuid = profile!.uuid;
    }

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '30');

    console.log('[getEmails] Fetching email list...');
    const listResponse = await gmail.users.messages.list({
      userId: 'me', maxResults, labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({ emails: [], total: 0, unreadCount: 0 });
    }

    // Get full email details
    const emailDetails = await Promise.all(
      messages.map(message =>
        gmail.users.messages.get({ userId: 'me', id: message.id!, format: 'full' })
      )
    );
    
    // --- MODIFIED SECTION ---
    // Process emails one by one, awaiting attachment uploads AND invoice verification
    console.log(`[getEmails] Processing ${emailDetails.length} emails, uploading attachments, and verifying invoices...`);
    const processedEmails = await Promise.all(
      emailDetails.map(email => 
        processEmailWithVerification(gmail, session.userId, session.profile_uuid!, email.data)
      )
    );
    
    const unreadCount = processedEmails.filter(email => !email.isRead).length;
    const invoiceCount = processedEmails.filter(email => email.isInvoice).length;

    console.log('[getEmails] Returning', processedEmails.length, 'emails with attachment URLs');
    console.log(`[getEmails] Found ${invoiceCount} invoice emails`);
    
    return NextResponse.json({
      emails: processedEmails,
      total: listResponse.data.resultSizeEstimate || processedEmails.length,
      unreadCount,
      invoiceCount,
    });

  } catch (error: any) {
    console.error('[getEmails] Error:', error);
    if (error.code === 401) { // Token expired or revoked
      return NextResponse.json({ error: 'Token expired', requiresReauth: true }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// New helper function to process email with verification
async function processEmailWithVerification(gmail: any, userId: string, profileUuid: string, emailData: any) {
  // First, process the email normally (get attachments, etc.)
  const processedEmail = await processEmail(gmail, userId, emailData);
  
  // Extract email subject and body for verification
  const headers = emailData.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
  const body = extractEmailBody(emailData.payload);
  
  // Get first attachment filename if exists
  const attachmentFilename = processedEmail.attachments?.[0]?.filename || null;
  
  try {
    // Call the verification API route
    console.log(`[processEmailWithVerification] Verifying email: ${subject.substring(0, 50)}...`);
    const verificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-uuid': profileUuid,
      },
      body: JSON.stringify({
        subject,
        body,
        attachment_filename: attachmentFilename,
        emailData: {
          id: processedEmail.id,
          threadId: processedEmail.threadId,
          from: `${processedEmail.from} <${processedEmail.fromEmail}>`,
          to: processedEmail.to || '',
          snippet: processedEmail.snippet || '',
          date: processedEmail.date,
          isRead: processedEmail.isRead || false,
          hasAttachments: processedEmail.hasAttachments || false,
          attachments: processedEmail.attachments || [],
        },
      }),
    });

    if (verificationResponse.ok) {
      const verificationData = await verificationResponse.json();
      
      // Add invoice verification data to the processed email
      return {
        ...processedEmail,
        isInvoice: verificationData.is_invoice || false,
        invoiceConfidence: verificationData.confidence || null,
      };
    } else {
      console.error('[processEmailWithVerification] Verification failed:', await verificationResponse.text());
      return {
        ...processedEmail,
        isInvoice: false,
        invoiceConfidence: null,
      };
    }
  } catch (error) {
    console.error('[processEmailWithVerification] Error verifying email:', error);
    // If verification fails, return email without invoice flag
    return {
      ...processedEmail,
      isInvoice: false,
      invoiceConfidence: null,
    };
  }
}

// Helper function to extract email body text
function extractEmailBody(payload: any): string {
  if (!payload) return '';
  
  // Check if payload has body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  // Check parts for text/plain or text/html
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    
    // Fallback to HTML if plain text not found
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Strip HTML tags (basic cleanup)
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    
    // Check nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const nestedBody = extractEmailBody(part);
        if (nestedBody) return nestedBody;
      }
    }
  }
  
  return '';
}

/**
 * POST /api/emails/[id]/read
 */
export async function markEmailAsRead(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tokens = getTokens(request);
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: params.id,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking email as read:', error);
    return NextResponse.json({ error: 'Failed to mark email as read' }, { status: 500 });
  }
}