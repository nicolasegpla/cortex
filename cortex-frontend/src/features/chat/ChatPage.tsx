import { useState, useRef, useEffect } from 'react';

import { useChatStore, PROVIDER_MODELS } from './store';
import { useCredentialsStore, type Provider } from './credentialsStore';
import { ChatSettings } from './ChatSettings';

const PROVIDER_LABELS: Record<Provider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
};

export function ChatPage() {
    const {
        messages,
        isLoading,
        error,
        activeProvider,
        activeModel,
        sendMessage,
        abort,
        clearMessages,
        setActiveProvider,
        setActiveModel,
        clearError,
    } = useChatStore();

    const { getValidatedProviders } = useCredentialsStore();
    const validatedProviders = getValidatedProviders();

    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current?.scrollIntoView) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (validatedProviders.length === 0) return;
        if (validatedProviders.includes(activeProvider)) return;
        setActiveProvider(validatedProviders[0]);
    }, [activeProvider, setActiveProvider, validatedProviders]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const text = input;
        setInput('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="chat-page">
            <div className="chat-page__header">
                <h2>Chat</h2>
                <div className="chat-page__actions">
                    {validatedProviders.length > 0 && (
                        <>
                            <div className="chat-page__provider-selector">
                                <label htmlFor="provider-select">Provider:</label>
                                <select
                                    id="provider-select"
                                    value={activeProvider}
                                    onChange={(e) => setActiveProvider(e.target.value as Provider)}
                                >
                                    {validatedProviders.map((provider) => (
                                        <option key={provider} value={provider}>
                                            {PROVIDER_LABELS[provider]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="chat-page__model-selector">
                                <label htmlFor="model-select">Model:</label>
                                <select
                                    id="model-select"
                                    value={activeModel}
                                    onChange={(e) => setActiveModel(e.target.value)}
                                >
                                    {PROVIDER_MODELS[activeProvider].map((model) => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="chat-page__settings-btn"
                        aria-label="Settings"
                    >
                        ⚙️
                    </button>
                    <button
                        onClick={clearMessages}
                        className="chat-page__clear-btn"
                        disabled={messages.length === 0}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="chat-page__settings">
                    <ChatSettings />
                </div>
            )}

            <div className="chat-page__messages">
                {messages.length === 0 && (
                    <div className="chat-page__empty">
                        <p>Start a conversation by typing below.</p>
                        {validatedProviders.length === 0 && (
                            <p>Add a provider credential in settings to begin chatting.</p>
                        )}
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`chat-page__message chat-page__message--${msg.role}`}
                    >
                        <div className="chat-page__message-role">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="chat-page__message-content">
                            {msg.content || '\u00A0'}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {error && (
                <div className="chat-page__error" role="alert">
                    {error}
                    <button onClick={clearError}>Dismiss</button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="chat-page__input-area">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={2}
                    disabled={isLoading}
                />
                <div className="chat-page__input-actions">
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={abort}
                            className="chat-page__stop-btn"
                        >
                            Stop
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim() || validatedProviders.length === 0}
                            className="chat-page__send-btn"
                        >
                            Send
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
