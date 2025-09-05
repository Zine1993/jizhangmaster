# Changelog

## v1.1.2 (2025-09-05)
- fix(settings): 登录状态下“重置账户”将同步清理 Supabase 云端 accounts/transactions，避免残留回流
- chore(sync): 新增 useSupabaseSync.wipeAllUserData(userId) 并集成于设置页重置流程