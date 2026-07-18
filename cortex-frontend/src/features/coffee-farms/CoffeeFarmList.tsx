import { useEffect, useState } from 'react';

import { formatDisplayValue } from '@/shared/displayUtils';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { TableLoadingRow } from '@/presentation/components/atoms';
import { DeleteConfirmationModal, EntityDetailModal, EntityFormModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

import { CoffeeFarmForm } from './CoffeeFarmForm';

import './CoffeeFarmList.scss';

export interface CoffeeFarm {
    id: string;
    nombre_finca: string;
    razon_social: string | null;
    nit: string | null;
    marca: string | null;
    direccion: string | null;
    departamento: string | null;
    ciudad: string | null;
    pais: string | null;
    nombre_contacto: string | null;
    celular: string | null;
    phones: string[] | null;
    correo: string | null;
    tipo_actividad: string | null;
    hectareas_totales: string | null;
    hectareas_cafe: string | null;
    numero_arboles: number | null;
    variedades_sembradas: string[] | null;
    tipo_proceso: string | null;
    puntaje_cafe: string | null;
    nivel_tecnificacion: string | null;
    equipos: string[] | null;
    observaciones: string | null;
    oportunidades: string | null;
    created_at: string;
    updated_at: string;
}

export function CoffeeFarmList() {
    const [farms, setFarms] = useState<CoffeeFarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedFarm, setSelectedFarm] = useState<CoffeeFarm | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const { isOpen, isDeleting, error: deleteError, success, itemId, openModal, confirmDelete, cancelDelete } =
        useDeleteRecord('/coffee-farms', (id) => {
            setFarms((prev) => prev.filter((farm) => farm.id !== id));
        });

    useEffect(() => {
        loadFarms();
    }, []);

    const loadFarms = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<CoffeeFarm[]>('/coffee-farms');
            setFarms(data);
        } catch (err) {
            setError('Error al cargar las fincas de café');
        } finally {
            setLoading(false);
        }
    };

    const itemLabel = selectedFarm ? `la finca de café ${selectedFarm.nombre_finca}` : 'este registro';

    const formatValue = (value: string | number | null) => {
        if (value === null || value === undefined) return '-';
        return value.toLocaleString();
    };

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    const buildSections = (farm: CoffeeFarm) => [
        {
            heading: 'Identificación',
            fields: [
                { label: 'Nombre', value: farm.nombre_finca },
                { label: 'Razón Social', value: farm.razon_social || '-' },
                { label: 'NIT', value: farm.nit || '-' },
                { label: 'Marca', value: farm.marca || '-' },
            ],
        },
        {
            heading: 'Ubicación',
            fields: [
                { label: 'Dirección', value: farm.direccion || '-' },
                { label: 'Departamento', value: farm.departamento || '-' },
                { label: 'Ciudad', value: farm.ciudad || '-' },
                { label: 'País', value: farm.pais || '-' },
            ],
        },
        {
            heading: 'Contacto',
            fields: [
                { label: 'Nombre de Contacto', value: farm.nombre_contacto || '-' },
                { label: 'Teléfonos', value: formatArray(farm.phones) },
                { label: 'Correo', value: farm.correo || '-' },
            ],
        },
        {
            heading: 'Producción',
            fields: [
                { label: 'Tipo de Actividad', value: farm.tipo_actividad || '-' },
                { label: 'Hectáreas Totales', value: formatValue(farm.hectareas_totales) },
                { label: 'Hectáreas de Café', value: formatValue(farm.hectareas_cafe) },
                { label: 'Número de Árboles', value: formatValue(farm.numero_arboles) },
                { label: 'Variedades Sembradas', value: formatArray(farm.variedades_sembradas) },
                { label: 'Tipo de Proceso', value: farm.tipo_proceso || '-' },
            ],
        },
        {
            heading: 'Calidad',
            fields: [
                { label: 'Puntaje del Café', value: formatValue(farm.puntaje_cafe) },
                { label: 'Nivel de Tecnificación', value: farm.nivel_tecnificacion || '-' },
                { label: 'Equipos', value: formatArray(farm.equipos) },
            ],
        },
        {
            heading: 'Notas',
            fields: [
                { label: 'Observaciones', value: farm.observaciones || '-' },
                { label: 'Oportunidades', value: farm.oportunidades || '-' },
            ],
        },
    ];

    const handleRowClick = (farm: CoffeeFarm) => {
        setSelectedFarm(farm);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
    };

    const handleEdit = () => {
        if (selectedFarm) {
            setIsDetailOpen(false);
            setIsEditMode(true);
            setIsFormModalOpen(true);
        }
    };

    const handleCreate = () => {
        setSelectedFarm(null);
        setIsEditMode(false);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
    };

    const handleFormSuccess = async () => {
        await loadFarms();
        setIsFormModalOpen(false);
    };

    const handleDelete = () => {
        if (selectedFarm) {
            setIsDetailOpen(false);
            openModal(selectedFarm.id);
        }
    };

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="coffee-farm-list">
            <div className="coffee-farm-list__header">
                <h2>Fincas de café</h2>
                <button
                    type="button"
                    className="coffee-farm-list__add-button"
                    onClick={handleCreate}
                >
                    Agregar Finca de Café
                </button>
            </div>

            <div className="coffee-farm-list__table-wrapper">
                <div className="coffee-farm-list__table">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Razón Social</th>
                                <th>Ciudad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && farms.length === 0 ? (
                                <TableLoadingRow colSpan={3} message="Cargando fincas de café..." />
                            ) : farms.length === 0 ? (
                                <tr className="coffee-farm-list__empty-state">
                                    <td colSpan={3}>No hay fincas de café registradas.</td>
                                </tr>
                            ) : (
                                farms.map((farm) => (
                                    <tr
                                        key={farm.id}
                                        className="coffee-farm-list__row"
                                        onClick={() => handleRowClick(farm)}
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="coffee-farm-list__row-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRowClick(farm);
                                                }}
                                                aria-label={`Ver detalles de ${farm.nombre_finca}`}
                                            >
                                                {formatDisplayValue(farm.nombre_finca)}
                                            </button>
                                        </td>
                                        <td>{formatDisplayValue(farm.razon_social)}</td>
                                        <td>{formatDisplayValue(farm.ciudad)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedFarm && (
                <EntityDetailModal
                    isOpen={isDetailOpen}
                    title={selectedFarm.nombre_finca}
                    sections={buildSections(selectedFarm)}
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
                title={isEditMode ? 'Editar Finca de Café' : 'Crear Finca de Café'}
                onClose={handleCloseFormModal}
                isLoading={isFormLoading}
            >
                {isFormModalOpen && (
                    <CoffeeFarmForm
                        id={isEditMode ? selectedFarm?.id ?? undefined : undefined}
                        initialData={isEditMode ? selectedFarm ?? undefined : undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={handleCloseFormModal}
                        onSavingChange={setIsFormLoading}
                    />
                )}
            </EntityFormModal>
        </div>
    );
}
