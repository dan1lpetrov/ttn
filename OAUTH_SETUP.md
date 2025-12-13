# Налаштування Google OAuth для продакшну

## Проблема
Після логіну через Google користувача перекидає на localhost замість продакшн URL.

**Причина:** В Supabase Dashboard встановлений Site URL як `http://localhost:3000`, тому Supabase використовує цей URL в JWT токені стану, навіть якщо код передає правильний `redirectTo`.

## Рішення

### 1. Налаштування в Supabase Dashboard (ОБОВ'ЯЗКОВО!)

1. Перейдіть в [Supabase Dashboard](https://supabase.com/dashboard)
2. Виберіть ваш проект
3. Перейдіть в **Authentication** → **URL Configuration**
4. **ВАЖЛИВО:** Встановіть **Site URL** на ваш продакшн URL:
   ```
   https://ttn-one.vercel.app
   ```
   **НЕ використовуйте `http://localhost:3000` як Site URL на продакшні!**
5. Додайте **Redirect URLs** (можна додати кілька):
   ```
   https://ttn-one.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
   (Останній потрібен тільки для локальної розробки)

### 2. Налаштування в Google Cloud Console

1. Перейдіть в [Google Cloud Console](https://console.cloud.google.com/)
2. Виберіть ваш проект
3. Перейдіть в **APIs & Services** → **Credentials**
4. Виберіть ваш OAuth 2.0 Client ID (ID: `989968958332-tlgp4drmcra2ck8esg9tu7su6lvtciro`)
5. В розділі **Authorized redirect URIs** переконайтеся, що є:
   ```
   https://yicvpfphbvjhjikclika.supabase.co/auth/v1/callback
   ```
   (Це URL Supabase, який обробляє OAuth callback)

### 3. Перевірка змінних оточення на Vercel

Переконайтеся, що на Vercel налаштовані правильні змінні оточення:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Перезапуск деплою

Після зміни налаштувань в Supabase Dashboard перезапустіть деплой на Vercel.

## Важливо!

**Проблема в тому, що в Supabase Dashboard встановлений Site URL як `http://localhost:3000`.**

Це видно в JWT токені стану, де `site_url: "http://localhost:3000"`. Навіть якщо код передає правильний `redirectTo: "https://ttn-one.vercel.app/auth/callback"`, Supabase все одно використовує Site URL з Dashboard для створення JWT токену стану.

**Рішення:** Обов'язково змініть **Site URL** в Supabase Dashboard на `https://ttn-one.vercel.app`!

## Примітка

Код автоматично використовує `window.location.origin`, який завжди правильний для поточного домену. Але Supabase використовує Site URL з Dashboard для створення JWT токену стану, тому налаштування в Dashboard критично важливі.

