import { useState, useRef, useEffect } from 'react';

import { useChatStore, PROVIDER_MODELS } from './store';
import { useCredentialsStore, type Provider } from './credentialsStore';
import { ChatSettings } from './ChatSettings';

import './ChatPage.scss';

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

    const { fetchCredentials, getValidatedProviders } = useCredentialsStore();
    const validatedProviders = getValidatedProviders();

    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current?.scrollIntoView) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        void fetchCredentials();
    }, [fetchCredentials]);

    useEffect(() => {
        if (validatedProviders.length === 0) return;
        if (validatedProviders.includes(activeProvider)) return;
        setActiveProvider(validatedProviders[0]);
    }, [activeProvider, setActiveProvider, validatedProviders]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const text = input;
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const hasMessages = messages.length > 0;

    return (
        <div className={`chat-page ${hasMessages ? 'chat-page--has-messages' : ''}`}>
            {/* Top bar */}
            <div className="chat-page__top-bar">
                <div className="chat-page__top-bar-left">
                    {validatedProviders.length > 0 && (
                        <div className="chat-page__selectors">
                            <select
                                value={activeProvider}
                                onChange={(e) => setActiveProvider(e.target.value as Provider)}
                                className="chat-page__select"
                                aria-label="Select provider"
                            >
                                {validatedProviders.map((provider) => (
                                    <option key={provider} value={provider}>
                                        {PROVIDER_LABELS[provider]}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={activeModel}
                                onChange={(e) => setActiveModel(e.target.value)}
                                className="chat-page__select"
                                aria-label="Select model"
                            >
                                {PROVIDER_MODELS[activeProvider]?.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="chat-page__top-bar-right">
                    {hasMessages && (
                        <button
                            onClick={clearMessages}
                            className="chat-page__icon-btn"
                            aria-label="Clear conversation"
                            title="Clear conversation"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/>
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="chat-page__icon-btn"
                        aria-label="Settings"
                        title="Settings"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m20.07-4.93l-4.24 4.24M7.17 14.83l-4.24 4.24m18.34 0l-4.24-4.24M7.17 9.17L2.93 4.93"/>
                        </svg>
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="chat-page__settings-panel">
                    <ChatSettings />
                </div>
            )}

            {/* Main content */}
            <div className="chat-page__content">
                {!hasMessages ? (
                    /* Empty state */
                    <div className="chat-page__empty">
                        <h1 className="chat-page__heading">What can I do for you?</h1>
                        
                        {validatedProviders.length === 0 ? (
                            <p className="chat-page__hint">
                                Add a provider credential in settings to begin chatting.
                            </p>
                        ) : (
                            <p className="chat-page__hint">
                                Start a conversation by typing below.
                            </p>
                        )}
                    </div>
                ) : (
                    /* Messages */
                    <div className="chat-page__messages">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`chat-page__message chat-page__message--${msg.role}`}
                            >
                                <div className="chat-page__message-avatar">
                                    {msg.role === 'user' ? 'U' : 'AI'}
                                </div>
                                <div className="chat-page__message-body">
                                    <div className="chat-page__message-role">
                                        {msg.role === 'user' ? 'You' : 'Assistant'}
                                    </div>
                                    <div className="chat-page__message-content">
                                        {msg.content || '\u00A0'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="chat-page__input-area">
                <div className="chat-page__input-box">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Assign a task or ask anything"
                        rows={1}
                        disabled={isLoading || validatedProviders.length === 0}
                        className="chat-page__textarea"
                    />
                    <div className="chat-page__input-actions">
                        {isLoading ? (
                            <button
                                onClick={abort}
                                className="chat-page__stop-btn"
                                title="Stop generating"
                                aria-label="Stop generating"
                            >
                                <div className="chat-page__stop-icon" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit()}
                                disabled={!input.trim() || validatedProviders.length === 0}
                                className="chat-page__send-btn"
                                title="Send message"
                                aria-label="Send message"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="chat-page__error" role="alert">
                    <span>{error}</span>
                    <button onClick={clearError} className="chat-page__error-dismiss">✕</button>
                </div>
            )}
        </div>
    );
}
