import { useEffect, useRef, useState } from 'react';

import { useChatStore, DEFAULT_MODELS, MODEL_PROVIDER_MAP } from './store';
import { useCredentialsStore } from './credentialsStore';
import { MarkdownContent } from './MarkdownContent';
import { ModelSelector } from '@/presentation/components/molecules/ModelSelector/ModelSelector';

import './ChatPage.scss';

export function ChatPage() {
    const {
        messages,
        isLoading,
        error,
        activeModel,
        hydrated,
        sendMessage,
        abort,
        clearMessages,
        setActiveModel,
        clearError,
    } = useChatStore();

    const { fetchCredentials, getValidatedProviders } = useCredentialsStore();
    const validatedProviders = getValidatedProviders();

    const [input, setInput] = useState('');
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
        if (!hydrated) return;
        if (validatedProviders.length === 0) return;

        const activeProvider = MODEL_PROVIDER_MAP[activeModel];
        if (activeProvider && validatedProviders.includes(activeProvider)) return;

        setActiveModel(DEFAULT_MODELS[validatedProviders[0]]);
    }, [activeModel, hydrated, setActiveModel, validatedProviders]);

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
                <div className="chat-page__top-bar-left" />
                <div className="chat-page__top-bar-right">
                    {hasMessages && (
                        <button
                            onClick={clearMessages}
                            className="chat-page__icon-btn"
                            aria-label="Limpiar conversación"
                            title="Limpiar conversación"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="chat-page__content">
                {!hasMessages ? (
                    /* Empty state */
                    <div className="chat-page__empty">
                        <h1 className="chat-page__heading">¿En qué te puedo ayudar?</h1>

                        {validatedProviders.length === 0 ? (
                            <p className="chat-page__hint">
                                Configurá un proveedor desde Configuración antes de iniciar una conversación.
                            </p>
                        ) : (
                            <p className="chat-page__hint">
                                Empezá una conversación escribiendo abajo.
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
                                        {msg.role === 'user' ? 'Vos' : 'Asistente'}
                                    </div>
                                    <div className="chat-page__message-content">
                                        <MarkdownContent content={msg.content} role={msg.role as 'user' | 'assistant'} />
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
                        placeholder={
                            validatedProviders.length === 0
                                ? 'Configurá un proveedor en Configuración para empezar a chatear'
                                : 'Asigná una tarea o preguntá lo que necesites'
                        }
                        rows={1}
                        disabled={isLoading || validatedProviders.length === 0}
                        className="chat-page__textarea"
                    />
                    <div className="chat-page__input-toolbar">
                        <div className="chat-page__model-selector">
                            <ModelSelector
                                activeModel={activeModel}
                                validatedProviders={validatedProviders}
                                onSelect={setActiveModel}
                            />
                        </div>
                        
                        <div className="chat-page__input-actions">
                            {isLoading ? (
                                <button
                                    onClick={abort}
                                    className="chat-page__stop-btn"
                                    title="Detener generación"
                                    aria-label="Detener generación"
                                >
                                    <div className="chat-page__stop-icon" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmit()}
                                    disabled={!input.trim() || validatedProviders.length === 0}
                                    className="chat-page__send-btn"
                                    title="Enviar mensaje"
                                    aria-label="Enviar mensaje"
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
