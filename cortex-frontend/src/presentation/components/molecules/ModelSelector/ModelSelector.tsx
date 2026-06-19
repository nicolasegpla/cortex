import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ChevronDown } from '@/presentation/components/atoms/Icon';
import { PROVIDER_MODELS, type ModelOption } from '@/features/chat/store';
import type { Provider } from '@/features/chat/credentialsStore';

import './ModelSelector.scss';

interface ModelSelectorProps {
    activeModel: string;
    validatedProviders: Provider[];
    onSelect: (modelId: string) => void;
}

function findModelName(modelId: string): string {
    for (const models of Object.values(PROVIDER_MODELS)) {
        const found = models.find((model) => model.id === modelId);
        if (found) return found.name;
    }
    return modelId;
}

export function ModelSelector({ activeModel, validatedProviders, onSelect }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const badgeRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const options = useMemo(() => {
        const list: Array<{ provider: Provider; model: ModelOption }> = [];
        for (const provider of validatedProviders) {
            const models = PROVIDER_MODELS[provider];
            if (models) {
                list.push(...models.map((model) => ({ provider, model })));
            }
        }
        return list;
    }, [validatedProviders]);

    const activeDisplayName = findModelName(activeModel);
    const hasOptions = options.length > 0;

    useEffect(() => {
        if (!isOpen) return;

        const badge = badgeRef.current;
        if (badge) {
            const rect = badge.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        }

        setHighlightedIndex(0);
        popoverRef.current?.focus();

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                popoverRef.current &&
                !popoverRef.current.contains(target) &&
                badgeRef.current &&
                !badgeRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                badgeRef.current?.focus();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const toggle = () => {
        if (!hasOptions) return;
        setIsOpen((open) => !open);
    };

    const selectOption = (index: number) => {
        const option = options[index];
        if (!option) return;
        setIsOpen(false);
        onSelect(option.model.id);
    };

    const handleBadgeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!hasOptions) return;
            setIsOpen(true);
            setHighlightedIndex(0);
        }
    };

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((index) => Math.min(index + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            selectOption(highlightedIndex);
        } else if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(options.length - 1);
        }
    };

    return (
        <>
            <button
                ref={badgeRef}
                type="button"
                className="model-selector__badge"
                onClick={toggle}
                onKeyDown={handleBadgeKeyDown}
                disabled={!hasOptions}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
            >
                <span className="model-selector__badge-text">
                    {hasOptions ? activeDisplayName : 'Sin modelo'}
                </span>
                <ChevronDown
                    width={14}
                    height={14}
                    className={`model-selector__chevron ${isOpen ? 'model-selector__chevron--open' : ''}`}
                    data-testid="chevron-down"
                    aria-hidden="true"
                />
            </button>
            {isOpen &&
                createPortal(
                    <div
                        ref={popoverRef}
                        id={menuId}
                        className="model-selector__popover"
                        role="menu"
                        tabIndex={-1}
                        aria-orientation="vertical"
                        style={
                            position
                                ? {
                                    top: position.top,
                                    left: position.left,
                                    width: position.width,
                                }
                                : undefined
                        }
                        onKeyDown={handleMenuKeyDown}
                    >
                        {options.map((option, index) => (
                            <button
                                key={option.model.id}
                                type="button"
                                role="menuitemradio"
                                className={`model-selector__option ${index === highlightedIndex ? 'model-selector__option--highlighted' : ''}`}
                                aria-checked={option.model.id === activeModel}
                                onClick={() => selectOption(index)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span className="model-selector__option-name">{option.model.name}</span>
                                <span className="model-selector__option-provider">
                                    {option.provider}
                                </span>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    );
}
