import { useEffect, useState } from 'react';

import { X } from '@/presentation/components/atoms/Icon/X';

import { useCredentialsStore, type Provider } from './credentialsStore';
import { useChatStore } from './store';

import './ChatSettings.scss';

const PROVIDERS: { id: Provider; name: string; defaultModel: string }[] = [
    { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
    { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
    { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-v4-flash' },
];

interface ChatSettingsProps {
    headingId?: string;
}

export function ChatSettings({ headingId = 'config-provider-settings-title' }: ChatSettingsProps) {
    const {
        providers,
        isLoading,
        error,
        fetchCredentials,
        saveCredential,
        clearError,
    } = useCredentialsStore();
    const { setActiveProvider, setActiveModel } = useChatStore();

    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [apiKeys, setApiKeys] = useState<Partial<Record<Provider, string>>>({});

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const handleSave = async (provider: Provider) => {
        clearError();
        const key = apiKeys[provider]?.trim();
        if (!key) return;

        await saveCredential(provider, key);
        const providerInfo = PROVIDERS.find((item) => item.id === provider);
        setActiveProvider(provider);
        if (providerInfo) {
            setActiveModel(providerInfo.defaultModel);
        }
        setApiKeys((prev) => ({ ...prev, [provider]: '' }));
    };

    const selectedProviderInfo = selectedProvider
        ? (PROVIDERS.find((provider) => provider.id === selectedProvider) ?? null)
        : null;
    const connectedProviders = PROVIDERS.filter((provider) => providers[provider.id]);

    return (
        <section className="chat-settings" aria-labelledby={headingId}>
            {isLoading && <div className="chat-settings__loading">Cargando...</div>}

            {error && (
                <div className="chat-settings__error" role="alert">
                    <span>{error}</span>
                    <button type="button" className="chat-settings__dismiss" onClick={clearError}>
                        Cerrar
                    </button>
                </div>
            )}

            <div className="chat-settings__main">
                <div className="chat-settings__catalog" role="list" aria-label="Proveedores disponibles">
                    {PROVIDERS.map((provider) => (
                        <button
                            key={provider.id}
                            type="button"
                            className={`chat-settings__catalog-item ${selectedProvider === provider.id ? 'chat-settings__catalog-item--active' : ''}`}
                            onClick={() => setSelectedProvider((current) => (current === provider.id ? null : provider.id))}
                            aria-pressed={selectedProvider === provider.id}
                        >
                            {provider.name}
                        </button>
                    ))}
                </div>

                {selectedProviderInfo && (
                    <div className="chat-settings__editor-layer">
                        <section
                            className="chat-settings__editor"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={`${selectedProviderInfo.id}-editor-title`}
                        >
                            <header className="chat-settings__editor-header">
                                <h3 id={`${selectedProviderInfo.id}-editor-title`} className="chat-settings__editor-title">
                                    {selectedProviderInfo.name}
                                </h3>
                                <button
                                    type="button"
                                    className="chat-settings__editor-close"
                                    aria-label="Cerrar editor"
                                    onClick={() => setSelectedProvider(null)}
                                >
                                    <X width={18} height={18} />
                                </button>
                            </header>

                            <div className="chat-settings__form">
                                <label>
                                    <span className="chat-settings__field-label">API key</span>
                                    <input
                                        className="chat-settings__input"
                                        type="password"
                                        value={apiKeys[selectedProviderInfo.id] || ''}
                                        onChange={(event) => {
                                            setApiKeys((prev) => ({
                                                ...prev,
                                                [selectedProviderInfo.id]: event.target.value,
                                            }));
                                        }}
                                    />
                                </label>
                                <div className="chat-settings__actions">
                                    <button
                                        type="button"
                                        onClick={() => handleSave(selectedProviderInfo.id)}
                                        disabled={!apiKeys[selectedProviderInfo.id]?.trim()}
                                        className="chat-settings__button chat-settings__button--primary"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {connectedProviders.length > 0 && (
                <div className="chat-settings__summary" aria-labelledby="connected-providers-title">
                    <div className="chat-settings__summary-header">
                        <h4 id="connected-providers-title" className="chat-settings__summary-title">
                            Proveedores conectados
                        </h4>
                        <span className="chat-settings__summary-count">{connectedProviders.length}</span>
                    </div>

                    <div className="chat-settings__summary-list">
                        {connectedProviders.map((provider) => (
                            <button
                                key={provider.id}
                                type="button"
                                className="chat-settings__summary-pill"
                                onClick={() => setSelectedProvider(provider.id)}
                            >
                                {provider.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
