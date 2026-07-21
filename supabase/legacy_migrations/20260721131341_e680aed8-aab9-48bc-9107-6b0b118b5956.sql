INSERT INTO public.user_roles (user_id, role)
VALUES ('048d395a-d69f-4d74-b704-2aeefa778cf8', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;