# Налаштування Google OAuth для продакшну

## Проблема
Після логіну через Google користувача перекидає на localhost замість продакшн URL.

## Рішення

### 1. Налаштування в Supabase Dashboard

1. Перейдіть в Supabase Dashboard → Authentication → URL Configuration
2. Встановіть **Site URL** на ваш продакшн URL:
   ```
   https://your-app.vercel.app
   ```
3. Додайте **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

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

