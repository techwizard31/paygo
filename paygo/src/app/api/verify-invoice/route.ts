import { NextRequest, NextResponse } from 'next/server';

// Your FastAPI backend URL
const INVOICE_API_URL = process.env.INVOICE_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('[verify-invoice] Received verification request');
    
    // Parse incoming request body
    const body = await request.json();
    const { 
      subject, 
      body: emailBody, 
      attachment_filename,
      // Additional email data for saving to database
      emailData 
    } = body;

    // Validate required fields
    if (!subject && !emailBody) {
      console.log('[verify-invoice] Missing required fields');
      return NextResponse.json(
        { error: 'Either subject or body must be provided' },
        { status: 400 }
      );
    }

    console.log('[verify-invoice] Forwarding to FastAPI backend...');
    console.log(`[verify-invoice] Subject: ${subject?.substring(0, 50)}...`);
    console.log(`[verify-invoice] Body length: ${emailBody?.length || 0}`);
    console.log(`[verify-invoice] Attachment: ${attachment_filename || 'none'}`);

    // Forward request to FastAPI backend for verification
    const response = await fetch(`${INVOICE_API_URL}/verify-invoice-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: subject || '',
        body: emailBody || '',
        attachment_filename: attachment_filename || null,
      }),
    });

    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[verify-invoice] FastAPI error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to verify email with backend',
          details: errorText 
        },
        { status: response.status }
      );
    }

    // Parse the response from FastAPI
    const verificationData = await response.json();
    console.log('[verify-invoice] Verification result:', verificationData.is_invoice);

    // If email data is provided and it's an invoice, save to database
    if (emailData && verificationData.is_invoice) {
      console.log('[verify-invoice] Email is an invoice, saving to database...');
      
      try {
        // Get user_uuid from the request headers or body
        const userUuid = request.headers.get('x-user-uuid') || emailData.user_uuid;
        
        if (!userUuid) {
          console.warn('[verify-invoice] No user_uuid provided, skipping database save');
        } else {
          // Prepare mail data for database
          const mailData = {
            user_uuid: userUuid,
            email_id: emailData.id,
            thread_id: emailData.threadId,
            from: emailData.from,
            to: emailData.to || '',
            subject: subject,
            body: emailBody,
            snippet: emailData.snippet || '',
            date: emailData.date,
            is_read: emailData.isRead || false,
            has_attachments: emailData.hasAttachments || false,
            attachments: emailData.attachments || [],
            is_invoice: verificationData.is_invoice,
            invoice_confidence: verificationData.confidence,
            verification_details: verificationData.details,
          };

          console.log('[verify-invoice] Calling /api/mails to save email...');
          
          // Call the mails API to save to database
          const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mailData),
          });

          if (saveResponse.ok) {
            const savedMail = await saveResponse.json();
            console.log('[verify-invoice] Email saved to database successfully:', savedMail.uuid);
            
            // Return verification data with database save confirmation
            return NextResponse.json({
              success: verificationData.success,
              is_invoice: verificationData.is_invoice,
              confidence: verificationData.confidence,
              message: verificationData.message,
              details: verificationData.details,
              saved_to_db: true,
              mail_uuid: savedMail.uuid,
            });
          } else {
            const saveError = await saveResponse.text();
            console.error('[verify-invoice] Failed to save email to database:', saveError);
            
            // Return verification data but indicate database save failed
            return NextResponse.json({
              success: verificationData.success,
              is_invoice: verificationData.is_invoice,
              confidence: verificationData.confidence,
              message: verificationData.message,
              details: verificationData.details,
              saved_to_db: false,
              save_error: saveError,
            });
          }
        }
      } catch (dbError) {
        console.error('[verify-invoice] Error saving to database:', dbError);
        
        // Return verification data but indicate database error
        return NextResponse.json({
          success: verificationData.success,
          is_invoice: verificationData.is_invoice,
          confidence: verificationData.confidence,
          message: verificationData.message,
          details: verificationData.details,
          saved_to_db: false,
          save_error: (dbError as Error).message,
        });
      }
    }

    // Return standard verification response (not an invoice or no emailData provided)
    return NextResponse.json({
      success: verificationData.success,
      is_invoice: verificationData.is_invoice,
      confidence: verificationData.confidence,
      message: verificationData.message,
      details: verificationData.details,
      saved_to_db: false,
    });

  } catch (error: any) {
    console.error('[verify-invoice] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during verification',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for health check
export async function GET(request: NextRequest) {
  try {
    // Check if backend is reachable
    const response = await fetch(`${INVOICE_API_URL}/health`, {
      method: 'GET',
    });

    if (response.ok) {
      return NextResponse.json({ 
        status: 'healthy',
        backend: 'connected',
        api_url: INVOICE_API_URL 
      });
    } else {
      return NextResponse.json({ 
        status: 'degraded',
        backend: 'unreachable',
        api_url: INVOICE_API_URL 
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      backend: 'error',
      api_url: INVOICE_API_URL 
    }, { status: 503 });
  }
}