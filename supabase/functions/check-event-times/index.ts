// supabase/functions/check-event-times/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ONESIGNAL_APP_ID = "28c6cf57-374f-47b4-85b9-95d56289ed84"
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        console.log("⏰ [Event Times] Checking for upcoming events...")
        const now = new Date()

        // Define time windows to check
        const checks = [
            {
                windowMinutes: 60,
                type: 'event_starting_1h',
                heading: 'Event starting in 1 hour',
                notifType: 'event_starting_1h'
            },
            {
                windowMinutes: 30,
                type: 'event_starting_30m',
                heading: 'Event starting in 30 minutes',
                notifType: 'event_starting_30m'
            },
            {
                windowMinutes: 0,
                type: 'event_started',
                heading: 'Event is starting now!',
                notifType: 'event_started'
            }
        ]

        let totalSent = 0

        for (const check of checks) {
            console.log(`⏰ [Event Times] Checking ${check.type}...`)

            // Calculate time window (5 min range to catch events)
            const windowStart = new Date(now.getTime() + check.windowMinutes * 60 * 1000)
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000) // 5 min window

            console.log(`⏰ [Event Times] Window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`)

            // Find active events in this time window
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, title, start_time, host_id')
                .eq('status', 'active')
                .gte('start_time', windowStart.toISOString())
                .lt('start_time', windowEnd.toISOString())

            if (eventsError) {
                console.error(`🔥 Error fetching events:`, eventsError)
                continue
            }

            console.log(`⏰ [Event Times] Found ${events?.length || 0} events for ${check.type}`)

            if (!events || events.length === 0) continue

            for (const event of events) {
                console.log(`⏰ [Event Times] Processing event: ${event.title} (${event.id})`)

                // Get all accepted participants
                const { data: participants, error: partError } = await supabase
                    .from('event_participants')
                    .select('user_id')
                    .eq('event_id', event.id)
                    .eq('status', 'accepted')

                if (partError) {
                    console.error(`🔥 Error fetching participants:`, partError)
                    continue
                }

                // Combine participants + host into unique set
                const allRecipients = new Set<string>()

                // Add participants
                if (participants) {
                    participants.forEach(p => allRecipients.add(p.user_id))
                }

                // Add host
                allRecipients.add(event.host_id)

                console.log(`⏰ [Event Times] Total recipients: ${allRecipients.size}`)

                // Check who already received this notification
                const { data: alreadySent, error: sentError } = await supabase
                    .from('event_time_notifications')
                    .select('user_id')
                    .eq('event_id', event.id)
                    .eq('notification_type', check.type)

                if (sentError) {
                    console.error(`🔥 Error checking sent notifications:`, sentError)
                    continue
                }

                const sentIds = new Set((alreadySent || []).map(s => s.user_id))
                const toNotify = Array.from(allRecipients).filter(id => !sentIds.has(id))

                console.log(`⏰ [Event Times] Need to notify: ${toNotify.length} users`)

                if (toNotify.length === 0) {
                    console.log(`⏰ [Event Times] All users already notified for this event`)
                    continue
                }

                // Filter by notification settings
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, notification_settings')
                    .in('id', toNotify)

                const filteredRecipients = toNotify.filter(userId => {
                    const profile = profiles?.find(p => p.id === userId)
                    const settings = profile?.notification_settings

                    // If no settings, allow
                    if (!settings) return true

                    // If master disabled
                    if (settings.enabled === false) {
                        console.log(`🚫 User ${userId} has disabled all notifications`)
                        return false
                    }

                    // Check startingSoon setting
                    if (settings.events?.startingSoon === false) {
                        console.log(`🚫 User ${userId} disabled startingSoon notifications`)
                        return false
                    }

                    return true
                })

                console.log(`⏰ [Event Times] After filtering: ${filteredRecipients.length} users`)

                if (filteredRecipients.length === 0) continue

                // Prepare notification content
                const content = `"${event.title}" is ${check.windowMinutes === 0 ? 'starting now' : `starting in ${check.windowMinutes} minutes`}`
                const data = { type: 'event_starting', eventId: event.id }

                // Save in-app notifications
                const notificationsToInsert = filteredRecipients.map(userId => ({
                    user_id: userId,
                    type: check.notifType,
                    title: check.heading,
                    body: content,
                    data: data,
                    is_read: false
                }))

                const { error: dbError } = await supabase
                    .from('notifications')
                    .insert(notificationsToInsert)

                if (dbError) {
                    console.error("🔥 Failed to save in-app notifications:", dbError)
                }

                // Send push notification via OneSignal
                console.log(`🚀 Sending push to ${filteredRecipients.length} users...`)

                const response = await fetch("https://onesignal.com/api/v1/notifications", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Key ${ONESIGNAL_API_KEY}`,
                    },
                    body: JSON.stringify({
                        app_id: ONESIGNAL_APP_ID,
                        include_external_user_ids: filteredRecipients,
                        target_channel: "push",
                        headings: { en: check.heading },
                        contents: { en: content },
                        data: data,
                    }),
                })

                const result = await response.json()
                console.log("OneSignal Result:", result)

                // Mark as sent in tracking table
                const sentRecords = filteredRecipients.map(userId => ({
                    event_id: event.id,
                    user_id: userId,
                    notification_type: check.type
                }))

                const { error: trackError } = await supabase
                    .from('event_time_notifications')
                    .insert(sentRecords)

                if (trackError) {
                    console.error("🔥 Failed to track sent notifications:", trackError)
                } else {
                    console.log(`✅ Marked ${filteredRecipients.length} notifications as sent`)
                    totalSent += filteredRecipients.length
                }
            }
        }

        console.log(`⏰ [Event Times] Complete. Sent ${totalSent} total notifications.`)
        return new Response(
            JSON.stringify({ success: true, sent: totalSent }),
            { headers: { "Content-Type": "application/json" } }
        )

    } catch (error) {
        console.error("🔥 ERROR:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
})
