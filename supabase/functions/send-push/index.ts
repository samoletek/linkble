// @ts-nocheck
// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ONESIGNAL_APP_ID = "28c6cf57-374f-47b4-85b9-95d56289ed84"
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        const { record, old_record, type, table } = await req.json()

        let heading = "Linkble"
        let content = ""
        let targetUserIds = []
        let data = {}
        let shouldSend = false

        console.log(`🔔 EVENT: ${type} on ${table}. ID: ${record.id}`);

        // =========================================================
        // 1. EVENT REQUESTS (event_participants)
        // =========================================================
        if (table === 'event_participants') {


            // CHECK: Is this a new request? (Insert or Update from non-pending to pending/accepted)
            const isNewRequest = (type === 'INSERT') ||
                (type === 'UPDATE' &&
                    ['pending', 'accepted'].includes(record.status) &&
                    ['left', 'kicked', 'rejected', null, undefined].includes(old_record?.status));

            console.log(`📊 [event_participants] type=${type}, old_status=${old_record?.status}, new_status=${record.status}, isNewRequest=${isNewRequest}`);

            // SCENARIO A: New Request -> To Host
            if (isNewRequest) {
                console.log(`🔍 New request. Looking for host of event: ${record.event_id}`);
                const { data: eventData } = await supabase
                    .from('events')
                    .select('host_id, title')
                    .eq('id', record.event_id)
                    .single()

                if (eventData?.host_id) {
                    heading = "New Join Request!"
                    content = `Someone wants to join "${eventData.title || 'event'}"`
                    targetUserIds = [eventData.host_id]
                    data = { type: 'request_new', eventId: record.event_id }
                    shouldSend = true
                }
            }

            // SCENARIO B: Status Change -> To Participant
            else if (type === 'UPDATE' && record.status !== old_record?.status) {
                const { data: eventData } = await supabase.from('events').select('title').eq('id', record.event_id).single()
                const eventTitle = eventData?.title || 'event'

                // Accepted
                if (record.status === 'accepted') {
                    heading = "Request Accepted! 🎉"
                    content = `You are joining "${eventTitle}".`
                    targetUserIds = [record.user_id]
                    data = { type: 'request_approved', eventId: record.event_id }
                    shouldSend = true
                }
                // Rejected
                else if (record.status === 'rejected') {
                    heading = "Request Declined"
                    content = `Host declined your request for "${eventTitle}".`
                    targetUserIds = [record.user_id]
                    data = { type: 'request_denied', eventId: record.event_id }
                    shouldSend = true
                }
                // Kicked
                else if (record.status === 'kicked') {
                    heading = "You were removed"
                    content = `You were removed from event "${eventTitle}".`
                    targetUserIds = [record.user_id]
                    data = { type: 'kicked', eventId: record.event_id }
                    shouldSend = true
                }
            }
        }

        // =========================================================
        // 2. EVENT CHAT (messages) - FIXED LOGIC
        // =========================================================
        else if (table === 'messages' && type === 'INSERT') {
            // Check if event ID exists
            if (record.event_id) {
                // 1. Get Event Title AND Host ID
                const { data: eventData } = await supabase
                    .from('events')
                    .select('title, host_id')
                    .eq('id', record.event_id)
                    .single()

                // 2. Find all accepted participants (excluding sender)
                const { data: participants } = await supabase
                    .from('event_participants')
                    .select('user_id')
                    .eq('event_id', record.event_id)
                    .eq('status', 'accepted')
                    .neq('user_id', record.user_id)

                // 3. Combine Participants + Host
                const uniqueRecipients = new Set()

                // Add participants
                if (participants) {
                    participants.forEach(p => uniqueRecipients.add(p.user_id))
                }

                // Add Host (if Host is NOT the sender)
                if (eventData?.host_id && eventData.host_id !== record.user_id) {
                    uniqueRecipients.add(eventData.host_id)
                }

                // Convert back to array
                targetUserIds = Array.from(uniqueRecipients)

                if (targetUserIds.length > 0) {
                    heading = eventData?.title || "Event Chat"
                    content = `${record.content || 'New message'}`
                    data = { type: 'chat_message', eventId: record.event_id }
                    shouldSend = true
                }
            }
        }

        // =========================================================
        // 3. DIRECT MESSAGES (direct_messages)
        // =========================================================
        else if (table === 'direct_messages' && type === 'INSERT') {
            // Get conversation to find receiver
            const { data: conversation } = await supabase
                .from('conversations')
                .select('user1_id, user2_id')
                .eq('id', record.conversation_id)
                .single()

            if (conversation) {
                // Receiver is the user who is NOT the sender
                const receiverId = conversation.user1_id === record.sender_id
                    ? conversation.user2_id
                    : conversation.user1_id

                heading = "New Message"
                content = record.content || "You received a private message"
                targetUserIds = [receiverId]
                data = { type: 'dm_message', senderId: record.sender_id, conversationId: record.conversation_id }
                shouldSend = true
            }
        }

        // =========================================================
        // 4. EVENT CANCELLED (events)
        // =========================================================
        else if (table === 'events' && type === 'UPDATE' && record.status === 'cancelled' && old_record.status !== 'cancelled') {
            heading = "Event Cancelled 😞"
            content = `Event "${record.title}" was cancelled by the host.`

            // Send to all accepted participants
            const { data: participants } = await supabase
                .from('event_participants')
                .select('user_id')
                .eq('event_id', record.id)
                .eq('status', 'accepted')

            if (participants && participants.length > 0) {
                targetUserIds = participants.map(p => p.user_id)
                data = { type: 'event_cancelled', eventId: record.id }
                shouldSend = true
            }
        }

        // --- SENDING ---
        if (!shouldSend || targetUserIds.length === 0) {
            console.log("⏹️ Logic skipped (conditions not met or no recipients)");
            return new Response(JSON.stringify({ message: "Skipped" }), { headers: { "Content-Type": "application/json" } })
        }

        console.log(`🚀 Sending push to ${targetUserIds.length} users...`);
        console.log(`📦 Notification data:`, JSON.stringify(data));

        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Key ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_external_user_ids: targetUserIds,
                target_channel: "push",
                headings: { en: heading },
                contents: { en: content },
                data: data,
            }),
        })

        const result = await response.json()
        console.log("OneSignal Result:", result);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } })

    } catch (error) {
        console.error("🔥 ERROR:", error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
})
