
-- Reset admin password to 'password' using bcrypt hash
UPDATE auth.users 
SET encrypted_password = crypt('password', gen_salt('bf'))
WHERE email = 'admin@lkc.ac.bw';
