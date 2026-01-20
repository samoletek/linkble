# Настройка Push-уведомлений через Supabase Edge Functions

Весь процесс делится на 3 этапа:
1.  Настройка OneSignal Secrets в Supabase.
2.  Создание Edge Function (`send-push`), которая умеет отправлять уведомления.
3.  Настройка Database Webhooks, чтобы функция вызывалась автоматически при событиях в базе.

---

## 1. Настройка секретов
Вам нужно добавить ключ OneSignal REST API в секреты Supabase, чтобы функции могли его использовать.

1.  Зайдите в **OneSignal Dashboard** -> Settings -> Keys & IDs.
2.  Скопируйте **REST API Key**.
3.  В терминале выполните команду (нужен установленнный Supabase CLI) или добавьте через Dashboard (Settings -> Edge Functions -> Secrets):
    ```bash
     
    ```

---

## 2. Создание Edge Function

1.  В корне проекта создайте папку `supabase/functions/send-push`.
2.  Внутри создайте файл `index.ts`:

```typescript
// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = "28c6cf57-374f-47b4-85b9-95d56289ed84" // Ваш App ID
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")

serve(async (req) => {
  const { record, type } = await req.json()
  
  // Логика формирования сообщения в зависимости от события
  let heading = "Linkble"
  let content = "Новое уведомление"
  let targetUserId = null
  let data = {}

  // Пример: Новая заявка на участие (таблица event_participants)
  if (type === 'INSERT' && record.status === 'pending') {
     // Нам нужно узнать host_id события, чтобы отправить ему уведомление.
     // В record (event_participants) есть только event_id.
     // Поэтому нам нужно сделать запрос к базе, чтобы получить host_id.
     
     // Вариант 1: Сделать запрос к Supabase из функции 
     // (нужен SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в secrets)
     
     // Вариант 2 (Простой): Предположим, что мы передали host_id в record (если денормализовали) 
     // или просто шлем всем админам (не подходит).
     
     // Правильный путь:
     // const { data: event } = await supabase.from('events').select('host_id').eq('id', record.event_id).single()
     // targetUserId = event.host_id
     
     // Для упрощения примера пока оставим заглушку, 
     // но в реальности тут нужен запрос за host_id
     heading = "Новая заявка!"
     content = "Кто-то хочет присоединиться к вашему событию."
     // targetUserId = ... 
     data = { requestId: record.id, eventId: record.event_id }
  }
  
  // Пример: Заявка принята (таблица event_participants, update status)
  if (type === 'UPDATE' && record.status === 'accepted' && old_record.status === 'pending') {
      heading = "Заявка принята!"
      content = "Вы были приняты в событие!"
      targetUserId = record.user_id // Тут просто, шлем тому, чья заявка
      data = { eventId: record.event_id }
  }

  if (!targetUserId) {
    return new Response(JSON.stringify({ message: "No target user or action logic" }), { headers: { "Content-Type": "application/json" } })
  }

  // Отправка в OneSignal
  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: [targetUserId] // Важно: шлем по user_id из базы
      },
      headings: { en: heading },
      contents: { en: content },
      data: data,
    }),
  })

  const result = await response.json()
  
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  })
})
```

3.  Задеплойте функцию:
    ```bash
    supabase functions deploy send-push
    ```

---

## 3. Настройка Database Webhooks
Теперь нужно связать события в базе с этой функцией.

1.  Зайдите в **Supabase Dashboard** -> Database -> Webhooks.
2.  Нажмите **Create Webhook**.
3.  **Name**: `notify-on-new-request`
4.  **Table**: `event_participants`
5.  **Events**: `INSERT` (для новых заявок) или `UPDATE` (для смены статуса).
6.  **Type**: HTTP Request
7.  **URL**: URL вашей функции (можно найти в Dashboard -> Edge Functions).
    *   Пример: `https://<project-ref>.supabase.co/functions/v1/send-push`
8.  **HTTP Method**: POST
9.  **HTTP Headers**:
    *   `Authorization`: `Bearer <ANON_KEY>` (или Service Role, но для вебхуков Supabase сам подписывает запросы, можно пропустить или настроить безопасность отдельно).

Теперь при создании новой записи в таблице `requests` Supabase дернет вашу функцию, а функция отправит пуш через OneSignal.

### Важные моменты:
*   В приложении мы используем `OneSignal.login(userId)`, где `userId` — это UUID из Supabase.
*   В функции мы используем `include_aliases: { external_id: [targetUserId] }`.
*   Это позволяет OneSignal найти нужный девайс без хранения токенов в вашей базе.
