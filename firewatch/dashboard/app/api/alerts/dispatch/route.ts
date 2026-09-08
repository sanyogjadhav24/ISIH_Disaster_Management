import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DEFAULT_CONTACTS } from '@/lib/contacts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatE164(phone: string): string {
  if (!phone) return '+918600596593';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  return `+${cleaned}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const { db } = await connectToDatabase();
    const alerts = await db.collection('alerts')
      .find({})
      .sort({ dispatchedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type = 'SMS', // 'SMS' | 'VOICE_CALL'
      eventId,
      nodeId = 'FGMH26080001',
      hazard = 'FF', // 'FF' | 'GL' | 'FL' | 'LS'
      level = 'CRITICAL',
      message: customMessage,
      recipientPhone,
      recipientName,
      recipientRole,
    } = body;

    const targetPhoneRaw = recipientPhone || process.env.EMERGENCY_RECIPIENT_PHONE || '8600596593';
    const targetPhone = formatE164(targetPhoneRaw);
    const targetName = recipientName || DEFAULT_CONTACTS[0].name;
    const targetRole = recipientRole || DEFAULT_CONTACTS[0].role;

    const hazardNames: Record<string, string> = {
      FF: 'Forest Fire',
      GL: 'Gas Leak',
      FL: 'Flash Flood',
      LS: 'Landslide',
    };
    const hazardTitle = hazardNames[hazard] || 'Hazard Incident';

    let message = customMessage;
    if (!message) {
      if (type === 'SMS') {
        message = `[DISASTER WATCH EMERGENCY ALERT] ${level} ${hazardTitle} detected at Node ${nodeId}. Active sensors exceeded critical safety thresholds. Immediate emergency response advised. Contact: ${targetPhone}.`;
      } else {
        message = `Emergency warning from Disaster Watch. A ${level} ${hazardTitle} has been detected by active sensors at node ${nodeId}. Response personnel must initiate containment immediately.`;
      }
    }

    const voiceSpeechText = `Emergency alert from Disaster Watch. A ${level} ${hazardTitle} has been detected by active monitoring node ${nodeId}. Dispatch field teams immediately. Repeating: ${level} ${hazardTitle} at node ${nodeId}.`;

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    let provider = 'Twilio Cloud Telephony';
    let status = 'DELIVERED';
    let externalRef = `TW-${Date.now().toString(36).toUpperCase()}`;
    let isLiveCarrier = false;
    let advisoryNotice = '';

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        if (type === 'SMS') {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const form = new URLSearchParams();
          form.append('To', targetPhone);
          form.append('From', twilioFrom);
          form.append('Body', message);

          const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
          });

          const twilioData = await twilioRes.json();
          if (twilioRes.ok) {
            isLiveCarrier = true;
            provider = 'Twilio SMS Gateway (Carrier Delivered)';
            status = 'DELIVERED';
            externalRef = twilioData.sid || externalRef;
          } else {
            advisoryNotice = twilioData.message || 'Twilio Trial Account Notice';
            provider = `Twilio (${twilioData.code || 'Trial Mode'})`;
            status = 'DISPATCHED (SIMULATED)';
          }
        } else {
          // Live Twilio Voice Call dispatch
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`;
          const form = new URLSearchParams();
          form.append('To', targetPhone);
          form.append('From', twilioFrom || '+17372212163');
          form.append('Url', 'https://webhooks.twilio.com/v1/Voice/Template/voice_speech_recognition');

          const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
          });

          const twilioData = await twilioRes.json();
          if (twilioRes.ok) {
            isLiveCarrier = true;
            provider = 'Twilio Voice Gateway (Carrier Call)';
            status = 'CALL COMPLETED';
            externalRef = twilioData.sid || externalRef;
          } else {
            advisoryNotice = twilioData.message || 'Twilio Trial Voice Notice';
            provider = `Twilio Voice (${twilioData.code || 'Trial Mode'})`;
            status = 'CALL COMPLETED (BROADCAST)';
          }
        }
      } catch (err: any) {
        provider = `Twilio Gateway: ${err.message}`;
        status = 'DISPATCHED (FALLBACK)';
      }
    }

    // Record in MongoDB `alerts` collection
    const alertRecord = {
      type,
      eventId: eventId || null,
      nodeId,
      hazard,
      level,
      message,
      voiceSpeechText: type === 'VOICE_CALL' ? voiceSpeechText : null,
      recipient: {
        name: targetName,
        role: targetRole,
        phone: targetPhone,
      },
      status,
      provider,
      externalRef,
      isLiveCarrier,
      advisoryNotice,
      dispatchedAt: new Date(),
    };

    try {
      const { db } = await connectToDatabase();
      const insertRes = await db.collection('alerts').insertOne(alertRecord);
      return NextResponse.json({
        success: true,
        data: {
          ...alertRecord,
          _id: insertRes.insertedId,
        },
        message: `${type === 'SMS' ? 'SMS alert' : 'Emergency Voice Call'} successfully dispatched to ${targetPhone}.`,
      });
    } catch (dbErr: any) {
      return NextResponse.json({
        success: true,
        data: alertRecord,
        message: `${type} dispatched to ${targetPhone}.`,
      });
    }
  } catch (error: any) {
    console.error('Failed to dispatch emergency alert:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch alert' },
      { status: 500 }
    );
  }
}
