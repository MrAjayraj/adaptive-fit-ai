DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users read profiles" ON user_profiles;
CREATE POLICY "Users read profiles" ON user_profiles FOR SELECT USING (true);
