import { useEffect, useState } from 'react';

import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { TableLoadingRow } from '@/presentation/components/atoms';
import { DeleteConfirmationModal, EntityDetailModal, EntityFormModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

import { WineProducerForm } from './WineProducerForm';

import './WineProducerList.scss';

export interface WineProducer {
    id: string;
    nombre_comercial: string;
    razon_social: string | null;
    nit: string | null;
    direccion: string | null;
    ciudad: string | null;
    pais: string | null;
    nombre_contacto: string | null;
    celular: string | null;
    correo: string | null;
    marcas: string[] | null;
    fuente_azucar: string | null;
    tipo_uva: string[] | null;
    tipo_vino: string[] | null;
    levaduras_utilizadas: string[] | null;
    botellas_utilizadas: string[] | null;
    nutrientes_utilizados: string[] | null;
    conservantes_utilizados: string[] | null;
    clarificantes_utilizados: string[] | null;
    produccion_anual: string | null;
    observaciones: string | null;
    oportunidades: string | null;
    created_at: string;
    updated_at: string;
}

export function WineProducerList() {
    const [producers, setProducers] = useState<WineProducer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedProducer, setSelectedProducer] = useState<WineProducer | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const { isOpen, isDeleting, error: deleteError, success, itemId, openModal, confirmDelete, cancelDelete } =
        useDeleteRecord('/wine-producers', (id) => {
            setProducers((prev) => prev.filter((producer) => producer.id !== id));
        });

    useEffect(() => {
        loadProducers();
    }, []);

    const loadProducers = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<WineProducer[]>('/wine-producers');
            setProducers(data);
        } catch (err) {
            setError('Error al cargar los productores de vino');
        } finally {
            setLoading(false);
        }
    };

    const producerToDelete = producers.find((producer) => producer.id === itemId);
    const itemLabel = producerToDelete ? `el productor ${producerToDelete.nombre_comercial}` : 'este registro';

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    const buildSections = (producer: WineProducer) => [
        {
            heading: 'Identificación',
            fields: [
                { label: 'Nombre Comercial', value: producer.nombre_comercial },
                { label: 'Razón Social', value: producer.razon_social || '-' },
                { label: 'NIT', value: producer.nit || '-' },
            ],
        },
        {
            heading: 'Ubicación',
            fields: [
                { label: 'Dirección', value: producer.direccion || '-' },
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
                { label: 'Marcas', value: formatArray(producer.marcas) },
                { label: 'Fuente de Azúcar', value: producer.fuente_azucar || '-' },
                { label: 'Tipo de Uva', value: formatArray(producer.tipo_uva) },
                { label: 'Tipo de Vino', value: formatArray(producer.tipo_vino) },
                { label: 'Levaduras Utilizadas', value: formatArray(producer.levaduras_utilizadas) },
            ],
        },
        {
            heading: 'Embotellado',
            fields: [
                { label: 'Botellas Utilizadas', value: formatArray(producer.botellas_utilizadas) },
                { label: 'Nutrientes Utilizados', value: formatArray(producer.nutrientes_utilizados) },
                { label: 'Conservantes Utilizados', value: formatArray(producer.conservantes_utilizados) },
                { label: 'Clarificantes Utilizados', value: formatArray(producer.clarificantes_utilizados) },
                { label: 'Producción Anual', value: producer.produccion_anual || '-' },
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

    const handleRowClick = (producer: WineProducer) => {
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
        <div className="wine-producer-list">
            <div className="wine-producer-list__header">
                <h2>Productores de Vino</h2>
                <button
                    type="button"
                    className="wine-producer-list__add-button"
                    onClick={handleCreate}
                >
                    Agregar Productor
                </button>
            </div>

            <div className="wine-producer-list__table-wrapper">
                <div className="wine-producer-list__table">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre Comercial</th>
                                <th>Razón Social</th>
                                <th>Ciudad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && producers.length === 0 ? (
                                <TableLoadingRow colSpan={3} message="Cargando productores de vino..." />
                            ) : producers.length === 0 ? (
                                <tr className="wine-producer-list__empty-state">
                                    <td colSpan={3}>No hay productores de vino registrados.</td>
                                </tr>
                            ) : (
                                producers.map((producer) => (
                                    <tr
                                        key={producer.id}
                                        className="wine-producer-list__row"
                                        onClick={() => handleRowClick(producer)}
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="wine-producer-list__row-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRowClick(producer);
                                                }}
                                                aria-label={`Ver detalles de ${producer.nombre_comercial}`}
                                            >
                                                {producer.nombre_comercial}
                                            </button>
                                        </td>
                                        <td>{producer.razon_social || '-'}</td>
                                        <td>{producer.ciudad || '-'}</td>
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
                    title={selectedProducer.nombre_comercial}
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
                title={isEditMode ? 'Editar Productor de Vino' : 'Crear Productor de Vino'}
                onClose={handleCloseFormModal}
                isLoading={isFormLoading}
            >
                {isFormModalOpen && (
                    <WineProducerForm
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
