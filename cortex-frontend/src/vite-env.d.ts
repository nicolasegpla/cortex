/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_HERMES_CHAT_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
