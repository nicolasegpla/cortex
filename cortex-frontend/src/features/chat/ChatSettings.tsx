import { useState, useEffect } from 'react';

import { useCredentialsStore, type Provider } from './credentialsStore';

const PROVIDERS: { id: Provider; name: string; defaultModel: string }[] = [
    { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
    { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
    { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-v4-flash' },
];

export function ChatSettings() {
    const {
        providers,
        isLoading,
        error,
        fetchCredentials,
        saveCredential,
        deleteCredential,
        testCredential,
        clearError,
    } = useCredentialsStore();

    const [apiKeys, setApiKeys] = useState<Record<Provider, string>>({});
    const [labels, setLabels] = useState<Record<Provider, string>>({});
    const [testing, setTesting] = useState<Record<Provider, boolean>>({});
    const [testResults, setTestResults] = useState<Record<Provider, boolean | null>>({});

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const handleSave = async (provider: Provider) => {
        clearError();
        const key = apiKeys[provider]?.trim();
        if (!key) return;
        await saveCredential(provider, key, labels[provider] || undefined);
        setApiKeys((prev) => ({ ...prev, [provider]: '' }));
    };

    const handleDelete = async (provider: Provider) => {
        clearError();
        if (window.confirm(`Delete credential for ${provider}?`)) {
            await deleteCredential(provider);
        }
    };

    const handleTest = async (provider: Provider) => {
        const providerInfo = PROVIDERS.find((p) => p.id === provider);
        if (!providerInfo) return;

        setTesting((prev) => ({ ...prev, [provider]: true }));
        setTestResults((prev) => ({ ...prev, [provider]: null }));

        const key = apiKeys[provider]?.trim();
        if (!key) {
            setTesting((prev) => ({ ...prev, [provider]: false }));
            return;
        }

        const result = await testCredential(provider, key, providerInfo.defaultModel);
        setTestResults((prev) => ({ ...prev, [provider]: result }));
        setTesting((prev) => ({ ...prev, [provider]: false }));
    };

    return (
        <div className="chat-settings">
            <h2>Provider Credentials</h2>

            {isLoading && <div className="chat-settings__loading">Loading...</div>}

            {error && (
                <div className="chat-settings__error" role="alert">
                    {error}
                    <button onClick={clearError}>Dismiss</button>
                </div>
            )}

            <div className="chat-settings__providers">
                {PROVIDERS.map((provider) => {
                    const existing = providers[provider.id];
                    const isTesting = testing[provider.id];
                    const testResult = testResults[provider.id];

                    return (
                        <div key={provider.id} className="chat-settings__provider">
                            <div className="chat-settings__provider-header">
                                <h3>{provider.name}</h3>
                                {existing && (
                                    <span className={`chat-settings__status chat-settings__status--${existing.validated_at ? 'ready' : 'saved'}`}>
                                        {existing.validated_at ? 'Ready' : 'Saved'}
                                    </span>
                                )}
                            </div>

                            {existing ? (
                                <div className="chat-settings__existing">
                                    <p>{existing.label || 'No label'}</p>
                                    <button
                                        onClick={() => handleDelete(provider.id)}
                                        className="chat-settings__delete-btn"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ) : (
                                <div className="chat-settings__form">
                                    <input
                                        type="password"
                                        placeholder="Enter API key"
                                        value={apiKeys[provider.id] || ''}
                                        onChange={(e) =>
                                            setApiKeys((prev) => ({
                                                ...prev,
                                                [provider.id]: e.target.value,
                                            }))
                                        }
                                    />
                                    <input
                                        type="text"
                                        placeholder="Label (optional)"
                                        value={labels[provider.id] || ''}
                                        onChange={(e) =>
                                            setLabels((prev) => ({
                                                ...prev,
                                                [provider.id]: e.target.value,
                                            }))
                                        }
                                    />
                                    <div className="chat-settings__actions">
                                        <button
                                            onClick={() => handleSave(provider.id)}
                                            disabled={!apiKeys[provider.id]?.trim()}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => handleTest(provider.id)}
                                            disabled={!apiKeys[provider.id]?.trim() || isTesting}
                                        >
                                            {isTesting ? 'Testing...' : 'Test'}
                                        </button>
                                    </div>
                                    {testResult !== null && (
                                        <span className={`chat-settings__test-result chat-settings__test-result--${testResult ? 'success' : 'failure'}`}>
                                            {testResult ? 'Valid' : 'Invalid'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
