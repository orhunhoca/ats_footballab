CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- 1. Kullanıcı var mı kontrol et
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@sportex.com';

  IF new_user_id IS NULL THEN
    -- Kullanıcı yoksa yeni ID oluştur
    new_user_id := gen_random_uuid();

    -- Yeni kullanıcı ekle
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@sportex.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin User","role":"admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  ELSE
    -- Kullanıcı varsa şifresini güncelle
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        updated_at = NOW()
    WHERE id = new_user_id;
  END IF;

  -- 2. Profil tablosunu güncelle (Trigger çalışmazsa diye manuel garantiye alıyoruz)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new_user_id, 'admin@sportex.com', 'Admin User', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', full_name = 'Admin User', email = 'admin@sportex.com';

END $$;