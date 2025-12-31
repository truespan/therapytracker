const db = require('../config/database');

/**
 * Handle inbound WhatsApp messages from Vonage
 * This webhook receives messages sent to your WhatsApp Business number
 */
const handleInboundMessage = async (req, res) => {
  try {
    console.log('[Vonage Webhook] Inbound message received:', JSON.stringify(req.body, null, 2));

    // Vonage sends webhook data in a specific format
    const webhookData = req.body;

    // Extract message data from Vonage webhook format
    // Vonage webhook structure: { message_uuid, to, from, timestamp, message: { content: { text, type } } }
    const messageUuid = webhookData.message_uuid;
    const from = webhookData.from; // Phone number of the sender
    const to = webhookData.to; // Your WhatsApp Business number
    const timestamp = webhookData.timestamp;
    const messageContent = webhookData.message?.content;
    const messageType = messageContent?.type || 'text';
    const text = messageContent?.text || '';

    // Log the inbound message
    console.log(`[Vonage Webhook] Message from ${from} to ${to}: ${text}`);

    // Store inbound message in database (optional - for message history)
    try {
      await db.query(
        `INSERT INTO whatsapp_inbound_messages 
         (message_uuid, from_number, to_number, message_type, message_text, received_at, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (message_uuid) DO NOTHING`,
        [
          messageUuid,
          from,
          to,
          messageType,
          text,
          timestamp ? new Date(timestamp) : new Date(),
          JSON.stringify(webhookData)
        ]
      );
    } catch (dbError) {
      // If table doesn't exist, just log the error but don't fail the webhook
      console.warn('[Vonage Webhook] Could not store inbound message:', dbError.message);
    }

    // Respond with 200 OK to acknowledge receipt
    // Vonage expects a 200 response within a few seconds
    res.status(200).json({
      status: 'ok',
      message: 'Inbound message received'
    });
  } catch (error) {
    console.error('[Vonage Webhook] Error handling inbound message:', error);
    // Still return 200 to prevent Vonage from retrying
    // Log the error for debugging
    res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Handle message status updates from Vonage
 * This webhook receives delivery status updates for sent messages
 */
const handleStatusUpdate = async (req, res) => {
  try {
    console.log('[Vonage Webhook] Status update received:', JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // Extract status data from Vonage webhook format
    // Vonage status webhook structure: { message_uuid, to, from, timestamp, status }
    const messageUuid = webhookData.message_uuid;
    const status = webhookData.status; // delivered, read, failed, etc.
    const to = webhookData.to; // Recipient phone number
    const from = webhookData.from; // Your WhatsApp Business number
    const timestamp = webhookData.timestamp;
    const error = webhookData.error;

    console.log(`[Vonage Webhook] Status update for message ${messageUuid}: ${status}`);

    // Update message status in whatsapp_notifications table
    try {
      // Find the notification by message_id (which should match message_uuid)
      const updateResult = await db.query(
        `UPDATE whatsapp_notifications 
         SET status = $1, 
             updated_at = $2,
             error_message = $3
         WHERE message_id = $4
         RETURNING id`,
        [
          status === 'delivered' ? 'delivered' : 
          status === 'read' ? 'read' :
          status === 'failed' || status === 'rejected' ? 'failed' : 'sent',
          timestamp ? new Date(timestamp) : new Date(),
          error ? JSON.stringify(error) : null,
          messageUuid
        ]
      );

      if (updateResult.rows.length > 0) {
        console.log(`[Vonage Webhook] Updated notification ${updateResult.rows[0].id} with status: ${status}`);
      } else {
        console.warn(`[Vonage Webhook] No notification found with message_id: ${messageUuid}`);
      }
    } catch (dbError) {
      console.error('[Vonage Webhook] Error updating notification status:', dbError.message);
    }

    // Store status update in database (optional - for audit trail)
    try {
      await db.query(
        `INSERT INTO whatsapp_status_updates 
         (message_uuid, status, to_number, from_number, error_data, received_at, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (message_uuid, status) DO UPDATE 
         SET received_at = $6, error_data = $5, raw_data = $7`,
        [
          messageUuid,
          status,
          to,
          from,
          error ? JSON.stringify(error) : null,
          timestamp ? new Date(timestamp) : new Date(),
          JSON.stringify(webhookData)
        ]
      );
    } catch (dbError) {
      // If table doesn't exist, just log the error but don't fail the webhook
      console.warn('[Vonage Webhook] Could not store status update:', dbError.message);
    }

    // Respond with 200 OK to acknowledge receipt
    res.status(200).json({
      status: 'ok',
      message: 'Status update received'
    });
  } catch (error) {
    console.error('[Vonage Webhook] Error handling status update:', error);
    // Still return 200 to prevent Vonage from retrying
    res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  handleInboundMessage,
  handleStatusUpdate
};

