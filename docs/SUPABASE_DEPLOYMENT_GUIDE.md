# Инструкция: Деплой Edge Function и настройка Webhooks

## Шаг 1: Установка Supabase CLI (если еще не установлен)

```bash
brew install supabase/tap/supabase
```

Проверьте установку:
```bash
supabase --version
```

## Шаг 2: Логин в Supabase

```bash
supabase login
```

Откроется браузер для авторизации. После успешного входа вернитесь в терминал.

## Шаг 3: Связать проект

```bash
cd /Users/Andrej/Desktop/linkble
supabase link --project-ref YOUR_PROJECT_REF_HERE
```

**Где найти project-ref:**
1. Откройте Supabase Dashboard (app.supabase.com)
2. Выберите ваш проект
3. Перейдите в Settings → General
4. Скопируйте **Reference ID**

## Шаг 4: Установить секреты

Нужно установить API ключ OneSignal как секрет для Edge Function:

```bash
supabase secrets set ONESIGNAL_REST_API_KEY=os_v2_app_fddm6vzxj5d3jbnzsxkwfcpnqqtxm774iv5udt4cpga5zgmzrohuxicbzt4gcl2bvqpud4wpo4of2q4mopnytusiy22lz5uifm7muti
```

**Где найти REST API Key:**
1. Откройте OneSignal Dashboard (onesignal.com)
2. Выберите ваше приложение
3. Settings → Keys & IDs
4. Скопируйте **REST API Key**

## Шаг 5: Задеплоить функцию

```bash
supabase functions deploy send-push
```

После успешного деплоя вы увидите URL функции, например:
```
https://your-project-ref.supabase.co/functions/v1/send-push
```

## Шаг 6: Настроить Database Webhooks

Теперь нужно настроить автоматический вызов функции при изменениях в базе данных.

### 6.1. Webhook для event_participants (заявки на участие)

1. Откройте Supabase Dashboard → Database → Webhooks
2. Нажмите **Create Webhook**
3. Заполните:
   - **Name**: `notify-on-event-request`
   - **Table**: `event_participants`
   - **Events**: выберите `INSERT` и `UPDATE`
   - **Type**: HTTP Request
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/send-push`
   - **HTTP Method**: POST
   - **HTTP Headers**: не требуется (Supabase автоматически подписывает запросы)
4. Нажмите **Create Webhook**

### 6.2. Webhook для messages (сообщения в чате события)

1. **Create Webhook**
2. Заполните:
   - **Name**: `notify-on-event-message`
   - **Table**: `messages`
   - **Events**: `INSERT`
   - **Type**: HTTP Request
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/send-push`
   - **HTTP Method**: POST
3. **Create Webhook**

### 6.3. Webhook для direct_messages (личные сообщения)

1. **Create Webhook**
2. Заполните:
   - **Name**: `notify-on-dm`
   - **Table**: `direct_messages`
   - **Events**: `INSERT`
   - **Type**: HTTP Request
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/send-push`
   - **HTTP Method**: POST
3. **Create Webhook**

### 6.4. Webhook для events (отмена события)

1. **Create Webhook**
2. Заполните:
   - **Name**: `notify-on-event-cancelled`
   - **Table**: `events`
   - **Events**: `UPDATE`
   - **Type**: HTTP Request
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/send-push`
   - **HTTP Method**: POST
3. **Create Webhook**

## Шаг 7: Тестирование

Теперь при любом действии в приложении (новая заявка, сообщение, отмена события) должно автоматически отправляться push-уведомление.

### Посмотреть логи функции:

```bash
supabase functions logs send-push --follow
```

Или в Dashboard: Functions → send-push → Logs

## Troubleshooting

**Если уведомления не приходят:**

1. Проверьте логи функции (см. выше)
2. Убедитесь, что в приложении вызывается `OneSignal.login(userId)` после авторизации
3. Проверьте, что в OneSignal Dashboard есть подписанные устройства для External User ID
4. Убедитесь, что установлены все секреты: `ONESIGNAL_REST_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Автоматические секреты:**
`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` автоматически доступны внутри Edge Functions, их не нужно устанавливать вручную.
