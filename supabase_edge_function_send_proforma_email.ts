/*
  Supabase Edge Function: Send Proforma Notification Email
  
  Deploy with: supabase functions deploy send-proforma-email
  
  This function:
  1. Listens for new rows in proforma_notifications table
  2. Fetches proforma and user details
  3. Sends email via Resend API (https://resend.com)
  
  SETUP INSTRUCTIONS:
  ===================
  
  1. Get Resend API Key:
     - Go to https://resend.com
     - Sign up for free account
     - Get your API key from dashboard
  
  2. Add secret to Supabase:
     - Run: supabase secrets set RESEND_API_KEY your-api-key-here
  
  3. Deploy function:
     - Run: supabase functions deploy send-proforma-email
  
  4. Create database webhook (one-time):
     - Supabase Dashboard → Database → Webhooks
     - Click "New webhook"
     - Table: proforma_notifications
     - Events: Insert
     - URL: https://[your-project].functions.supabase.co/send-proforma-email
     - Method: POST
     - HTTP Auth: None (or add if you want)
*/

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_BASE_URL = 'https://api.resend.com';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: {
    id: string;
    proforma_id: string;
    receiver_user_id: string;
    sender_user_id: string;
    notification_type: string;
    receiver_email: string;
    sent_at: string;
  };
  schema: string;
  table: string;
  created_at: string;
}

interface ProformaNotificationData {
  proforma_number: string;
  sender_name: string;
  receiver_name: string;
  status: string;
  total_amount: number;
  currency: string;
}

serve(async (req) => {
  // Only accept POST and OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    if (!payload.record) {
      return new Response('No record in payload', { status: 400 });
    }

    const notificationRecord = payload.record;
    const notificationType = notificationRecord.notification_type;
    const receiverEmail = notificationRecord.receiver_email;

    console.log(`Processing ${notificationType} notification for ${receiverEmail}`);

    // Get email content based on notification type
    let emailSubject = '';
    let emailHTML = '';

    if (notificationType === 'sent') {
      emailSubject = `🎉 New Proforma Received - Action Required`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #0066cc;">New Proforma Received!</h2>
          <p>You have received a new proforma that requires your attention.</p>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <p><strong>Action Required:</strong> Please log in to your PiGenovo account to review and accept or reject this proforma.</p>
          </div>
          <p>
            <a href="${Deno.env.get('APP_URL') || 'https://pigenevo.com'}/app" 
               style="display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Proforma
            </a>
          </p>
        </div>
      `;
    } else if (notificationType === 'accepted') {
      emailSubject = `✅ Your Proforma Has Been Accepted!`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #28a745;">Proforma Accepted!</h2>
          <p>Great news! Your proforma has been accepted by the recipient.</p>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p><strong>Next Step:</strong> You can now convert this proforma to an invoice in your PiGenovo account.</p>
          </div>
          <p>
            <a href="${Deno.env.get('APP_URL') || 'https://pigenevo.com'}/app" 
               style="display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Go to PiGenevo
            </a>
          </p>
        </div>
      `;
    } else if (notificationType === 'rejected') {
      emailSubject = `❌ Your Proforma Has Been Rejected`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #dc3545;">Proforma Rejected</h2>
          <p>Unfortunately, the recipient has rejected your proforma.</p>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <p><strong>Next Step:</strong> You can review the rejection or create a new proforma with revised terms.</p>
          </div>
          <p>
            <a href="${Deno.env.get('APP_URL') || 'https://pigenevo.com'}/app" 
               style="display: inline-block; background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Go to PiGenevo
            </a>
          </p>
        </div>
      `;
    }

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not configured. Email not sent.');
      console.log(`Email would be sent to: ${receiverEmail}`);
      console.log(`Subject: ${emailSubject}`);
      return new Response(JSON.stringify({ status: 'skipped', reason: 'API key not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailResponse = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@pigenevo.com',
        to: receiverEmail,
        subject: emailSubject,
        html: emailHTML,
        reply_to: 'support@pigenevo.com'
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Email send failed:', emailResult);
      return new Response(JSON.stringify({ success: false, error: emailResult }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Email sent to ${receiverEmail}`);
    
    return new Response(JSON.stringify({ success: true, message: 'Email sent', email_id: emailResult.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
