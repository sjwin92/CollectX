-- Grant admin to the project owner's working account (steffanjwinstanley
-- +testbuyer1@gmail.com) so store applications can be reviewed from
-- /admin/store-applications without needing the original seeded admin.
-- Same pattern as 20260721131341.

INSERT INTO public.user_roles (user_id, role)
VALUES ('9a4e7df9-c863-4c43-8f54-a63099279e88', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
