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
4. Виберіть ваш OAuth 2.0 Client ID
5. В розділі **Authorized redirect URIs** додайте:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   (Замініть `your-project` на ваш Supabase project reference)

### 3. Перевірка змінних оточення на Vercel

Переконайтеся, що на Vercel налаштовані правильні змінні оточення:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Перезапуск деплою

Після зміни налаштувань в Supabase Dashboard перезапустіть деплой на Vercel.

## Примітка

Код автоматично використовує `window.location.origin`, який завжди правильний для поточного домену. Якщо проблема залишається, перевірте налаштування в Supabase Dashboard.

