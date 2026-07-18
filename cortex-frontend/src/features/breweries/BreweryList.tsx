import { useEffect, useState } from 'react';

import { formatDisplayValue } from '@/shared/displayUtils';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { TableLoadingRow } from '@/presentation/components/atoms';
import { DeleteConfirmationModal, EntityDetailModal, EntityFormModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

import { BreweryForm } from './BreweryForm';

import './BreweryList.scss';

export interface Brewery {
    id: string;
    nombre_cerveceria: string;
    razon_social: string | null;
    nit: string | null;
    direccion: string | null;
    ciudad: string | null;
    pais: string | null;
    nombre_contacto: string | null;
    nombre_cervecero: string | null;
    celular_1: string | null;
    celular_2: string | null;
    phones: string[] | null;
    correo: string | null;
    maltas_utilizadas: string[] | null;
    lupulos_utilizados: string[] | null;
    levaduras_utilizadas: string[] | null;
    utiliza_otros_productos: boolean | null;
    estilos_cerveza: string[] | null;
    tipo_operacion: string | null;
    marca_equipo: string | null;
    capacidad_brewhouse: string | null;
    capacidad_fermentacion: string | null;
    litros_mes: number | null;
    calidad_equipo: string | null;
    formatos_venta: string[] | null;
    donde_vende: string | null;
    observaciones: string | null;
    oportunidades: string | null;
    created_at: string;
    updated_at: string;
}

export function BreweryList() {
    const [breweries, setBreweries] = useState<Brewery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedBrewery, setSelectedBrewery] = useState<Brewery | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const { isOpen, isDeleting, error: deleteError, success, itemId, openModal, confirmDelete, cancelDelete } =
        useDeleteRecord('/breweries', (id) => {
            setBreweries((prev) => prev.filter((b) => b.id !== id));
        });

    useEffect(() => {
        loadBreweries();
    }, []);

    const loadBreweries = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<Brewery[]>('/breweries');
            setBreweries(data);
        } catch (err) {
            setError('Error al cargar las cervecerías');
        } finally {
            setLoading(false);
        }
    };

    const itemLabel = selectedBrewery ? `la cervecería ${selectedBrewery.nombre_cerveceria}` : 'este registro';

    const formatTipoOperacion = (tipo: string | null) => {
        if (!tipo) return '-';
        const map: Record<string, string> = {
            maquila: 'Maquila',
            planta_propia: 'Planta Propia',
            ambos: 'Ambos',
        };
        return map[tipo] || tipo;
    };

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    const formatBoolean = (val: boolean | null) => {
        if (val === null || val === undefined) return '-';
        return val ? 'Sí' : 'No';
    };

    const formatNumber = (value: number | null) => {
        if (value === null || value === undefined) return '-';
        return value.toLocaleString();
    };

    const buildSections = (brewery: Brewery) => [
        {
            heading: 'Identificación',
            fields: [
                { label: 'Nombre', value: brewery.nombre_cerveceria },
                { label: 'Razón Social', value: brewery.razon_social || '-' },
                { label: 'NIT', value: brewery.nit || '-' },
            ],
        },
        {
            heading: 'Ubicación',
            fields: [
                { label: 'Dirección', value: brewery.direccion || '-' },
                { label: 'Ciudad', value: brewery.ciudad || '-' },
                { label: 'País', value: brewery.pais || '-' },
            ],
        },
        {
            heading: 'Contacto',
            fields: [
                { label: 'Nombre de Contacto', value: brewery.nombre_contacto || '-' },
                { label: 'Celular 1', value: brewery.celular_1 || '-' },
                { label: 'Celular 2', value: brewery.celular_2 || '-' },
                { label: 'Correo', value: brewery.correo || '-' },
            ],
        },
        {
            heading: 'Producción',
            fields: [
                { label: 'Maltas Utilizadas', value: formatArray(brewery.maltas_utilizadas) },
                { label: 'Lúpulos Utilizados', value: formatArray(brewery.lupulos_utilizados) },
                { label: 'Levaduras Utilizadas', value: formatArray(brewery.levaduras_utilizadas) },
                { label: 'Utiliza Otros Productos', value: formatBoolean(brewery.utiliza_otros_productos) },
                { label: 'Estilos de Cerveza', value: formatArray(brewery.estilos_cerveza) },
                { label: 'Tipo de Operación', value: formatTipoOperacion(brewery.tipo_operacion) },
            ],
        },
        {
            heading: 'Equipos',
            fields: [
                { label: 'Marca del Equipo', value: brewery.marca_equipo || '-' },
                { label: 'Capacidad Brewhouse', value: brewery.capacidad_brewhouse || '-' },
                { label: 'Capacidad Fermentación', value: brewery.capacidad_fermentacion || '-' },
                { label: 'Litros al Mes', value: formatNumber(brewery.litros_mes) },
                { label: 'Calidad del Equipo', value: brewery.calidad_equipo || '-' },
                { label: 'Formatos de Venta', value: formatArray(brewery.formatos_venta) },
                { label: 'Dónde Vende', value: brewery.donde_vende || '-' },
            ],
        },
        {
            heading: 'Notas',
            fields: [
                { label: 'Observaciones', value: brewery.observaciones || '-' },
                { label: 'Oportunidades', value: brewery.oportunidades || '-' },
            ],
        },
    ];

    const handleRowClick = (brewery: Brewery) => {
        setSelectedBrewery(brewery);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
    };

    const handleCreate = () => {
        setSelectedBrewery(null);
        setIsEditMode(false);
        setIsFormModalOpen(true);
    };

    const handleEdit = () => {
        if (selectedBrewery) {
            setIsDetailOpen(false);
            setIsEditMode(true);
            setIsFormModalOpen(true);
        }
    };

    const handleDelete = () => {
        if (selectedBrewery) {
            setIsDetailOpen(false);
            openModal(selectedBrewery.id);
        }
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
    };

    const handleFormSuccess = async () => {
        await loadBreweries();
        setIsFormModalOpen(false);
    };

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="brewery-list">
            <div className="brewery-list__header">
                <h2>Cervecerías</h2>
                <button
                    type="button"
                    className="brewery-list__add-button"
                    onClick={handleCreate}
                >
                    Agregar Cervecería
                </button>
            </div>

            <div className="brewery-list__table-wrapper">
                <div className="brewery-list__table">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Razón Social</th>
                                <th>Ciudad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && breweries.length === 0 ? (
                                <TableLoadingRow colSpan={3} message="Cargando cervecerías..." />
                            ) : breweries.length === 0 ? (
                                <tr className="brewery-list__empty-state">
                                    <td colSpan={3}>No hay cervecerías registradas.</td>
                                </tr>
                            ) : (
                                breweries.map((brewery) => (
                                    <tr
                                        key={brewery.id}
                                        className="brewery-list__row"
                                        onClick={() => handleRowClick(brewery)}
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="brewery-list__row-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRowClick(brewery);
                                                }}
                                                aria-label={`Ver detalles de ${brewery.nombre_cerveceria}`}
                                            >
                                                {formatDisplayValue(brewery.nombre_cerveceria)}
                                            </button>
                                        </td>
                                        <td>{formatDisplayValue(brewery.razon_social)}</td>
                                        <td>{formatDisplayValue(brewery.ciudad)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedBrewery && (
                <EntityDetailModal
                    isOpen={isDetailOpen}
                    title={selectedBrewery.nombre_cerveceria}
                    sections={buildSections(selectedBrewery)}
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
                title={isEditMode ? 'Editar Cervecería' : 'Crear Cervecería'}
                onClose={handleCloseFormModal}
                isLoading={isFormLoading}
            >
                {isFormModalOpen && (
                    <BreweryForm
                        id={isEditMode ? selectedBrewery?.id ?? undefined : undefined}
                        initialData={isEditMode ? selectedBrewery ?? undefined : undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={handleCloseFormModal}
                        onSavingChange={setIsFormLoading}
                    />
                )}
            </EntityFormModal>
        </div>
    );
}
