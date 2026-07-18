import { useEffect, useState } from 'react';

import { formatDisplayValue } from '@/shared/displayUtils';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { TableLoadingRow } from '@/presentation/components/atoms';
import { DeleteConfirmationModal, EntityDetailModal, EntityFormModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

import { AnimalFeedProducerForm } from './AnimalFeedProducerForm';

import './AnimalFeedProducerList.scss';

export interface AnimalFeedProducer {
    id: string;
    razon_social: string;
    marca: string | null;
    nit: string | null;
    direccion: string | null;
    departamento: string | null;
    ciudad: string | null;
    pais: string | null;
    nombre_contacto: string | null;
    celular: string | null;
    phones: string[] | null;
    correo: string | null;
    especies_manejadas: string[] | null;
    productos_fabricados: string[] | null;
    observaciones: string | null;
    oportunidades: string | null;
    created_at: string;
    updated_at: string;
}

function getPrimaryIdentity(producer: AnimalFeedProducer): string {
    return producer.marca || producer.razon_social;
}

export function AnimalFeedProducerList() {
    const [producers, setProducers] = useState<AnimalFeedProducer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedProducer, setSelectedProducer] = useState<AnimalFeedProducer | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const { isOpen, isDeleting, error: deleteError, success, itemId, openModal, confirmDelete, cancelDelete } =
        useDeleteRecord('/animal-feed-producers', (id) => {
            setProducers((prev) => prev.filter((producer) => producer.id !== id));
        });

    useEffect(() => {
        loadProducers();
    }, []);

    const loadProducers = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<AnimalFeedProducer[]>('/animal-feed-producers');
            setProducers(data);
        } catch (err) {
            setError('Error al cargar los productores de alimentos para animales');
        } finally {
            setLoading(false);
        }
    };

    const producerToDelete = producers.find((producer) => producer.id === itemId);
    const itemLabel = producerToDelete ? `el productor ${producerToDelete.razon_social}` : 'este registro';

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    const buildSections = (producer: AnimalFeedProducer) => [
        {
            heading: 'Identificación',
            fields: [
                { label: 'Razón Social', value: producer.razon_social },
                { label: 'Marca', value: producer.marca || '-' },
                { label: 'NIT', value: producer.nit || '-' },
            ],
        },
        {
            heading: 'Ubicación',
            fields: [
                { label: 'Dirección', value: producer.direccion || '-' },
                { label: 'Departamento', value: producer.departamento || '-' },
                { label: 'Ciudad', value: producer.ciudad || '-' },
                { label: 'País', value: producer.pais || '-' },
            ],
        },
        {
            heading: 'Contacto',
            fields: [
                { label: 'Nombre de Contacto', value: producer.nombre_contacto || '-' },
                { label: 'Celular', value: producer.celular || '-' },
                { label: 'Correo', value: producer.correo || '-' },
            ],
        },
        {
            heading: 'Producción',
            fields: [
                { label: 'Especies Manejadas', value: formatArray(producer.especies_manejadas) },
                { label: 'Productos Fabricados', value: formatArray(producer.productos_fabricados) },
            ],
        },
        {
            heading: 'Notas',
            fields: [
                { label: 'Observaciones', value: producer.observaciones || '-' },
                { label: 'Oportunidades', value: producer.oportunidades || '-' },
            ],
        },
    ];

    const handleRowClick = (producer: AnimalFeedProducer) => {
        setSelectedProducer(producer);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
    };

    const handleEdit = () => {
        if (selectedProducer) {
            setIsDetailOpen(false);
            setIsEditMode(true);
            setIsFormModalOpen(true);
        }
    };

    const handleCreate = () => {
        setSelectedProducer(null);
        setIsEditMode(false);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
    };

    const handleFormSuccess = async () => {
        await loadProducers();
        setIsFormModalOpen(false);
    };

    const handleDelete = () => {
        if (selectedProducer) {
            setIsDetailOpen(false);
            openModal(selectedProducer.id);
        }
    };

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="animal-feed-producer-list">
            <div className="animal-feed-producer-list__header">
                <h2>Productores de Alimentos para Animales</h2>
                <button
                    type="button"
                    className="animal-feed-producer-list__add-button"
                    onClick={handleCreate}
                >
                    Agregar Productor
                </button>
            </div>

            <div className="animal-feed-producer-list__table-wrapper">
                <div className="animal-feed-producer-list__table">
                    <table>
                        <thead>
                            <tr>
                                <th>Identificación</th>
                                <th>Razón Social</th>
                                <th>Ciudad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && producers.length === 0 ? (
                                <TableLoadingRow colSpan={3} message="Cargando productores de alimentos para animales..." />
                            ) : producers.length === 0 ? (
                                <tr className="animal-feed-producer-list__empty-state">
                                    <td colSpan={3}>No hay productores de alimentos para animales registrados.</td>
                                </tr>
                            ) : (
                                producers.map((producer) => (
                                    <tr
                                        key={producer.id}
                                        className="animal-feed-producer-list__row"
                                        onClick={() => handleRowClick(producer)}
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="animal-feed-producer-list__row-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRowClick(producer);
                                                }}
                                                aria-label={`Ver detalles de ${getPrimaryIdentity(producer)}`}
                                            >
                                                {formatDisplayValue(getPrimaryIdentity(producer))}
                                            </button>
                                        </td>
                                        <td>{formatDisplayValue(producer.razon_social)}</td>
                                        <td>{formatDisplayValue(producer.ciudad)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedProducer && (
                <EntityDetailModal
                    isOpen={isDetailOpen}
                    title={getPrimaryIdentity(selectedProducer)}
                    sections={buildSections(selectedProducer)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClose={handleCloseDetail}
                />
            )}

            <DeleteConfirmationModal
                isOpen={isOpen}
                isDeleting={isDeleting}
                error={deleteError}
                success={success}
                itemLabel={itemLabel}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
            />

            <EntityFormModal
                isOpen={isFormModalOpen}
                title={isEditMode ? 'Editar Productor de Alimentos para Animales' : 'Crear Productor de Alimentos para Animales'}
                onClose={handleCloseFormModal}
                isLoading={isFormLoading}
            >
                {isFormModalOpen && (
                    <AnimalFeedProducerForm
                        id={isEditMode ? selectedProducer?.id ?? undefined : undefined}
                        initialData={isEditMode ? selectedProducer ?? undefined : undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={handleCloseFormModal}
                        onSavingChange={setIsFormLoading}
                    />
                )}
            </EntityFormModal>
        </div>
    );
}
