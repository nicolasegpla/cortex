import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { DeleteConfirmationModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

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

    const selectedProducer = producers.find((producer) => producer.id === itemId);
    const itemLabel = selectedProducer ? `el productor ${selectedProducer.nombre_comercial}` : 'este registro';

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    if (loading) {
        return <div className="wine-producer-list__skeleton-row">Cargando productores de vino...</div>;
    }

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="wine-producer-list">
            <div className="wine-producer-list__header">
                <h2>Productores de Vino</h2>
                <Link to="/wine-producers/new" className="wine-producer-list__add-button">Agregar Productor</Link>
            </div>

            {producers.length === 0 ? (
                <div className="wine-producer-list__empty-state">
                    No hay productores de vino registrados.
                </div>
            ) : (
                <div className="wine-producer-list__table-wrapper">
                    <div className="wine-producer-list__table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre Comercial</th>
                                    <th>Razón Social</th>
                                    <th>NIT</th>
                                    <th>Dirección</th>
                                    <th>Ciudad</th>
                                    <th>País</th>
                                    <th>Contacto</th>
                                    <th>Celular</th>
                                    <th>Correo</th>
                                    <th>Marcas</th>
                                    <th>Fuente de Azúcar</th>
                                    <th>Tipo de Uva</th>
                                    <th>Tipo de Vino</th>
                                    <th>Levaduras</th>
                                    <th>Botellas</th>
                                    <th>Nutrientes</th>
                                    <th>Conservantes</th>
                                    <th>Clarificantes</th>
                                    <th>Producción Anual</th>
                                    <th>Observaciones</th>
                                    <th>Oportunidades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {producers.map((producer) => (
                                    <tr key={producer.id}>
                                        <td>{producer.nombre_comercial}</td>
                                        <td>{producer.razon_social || '-'}</td>
                                        <td>{producer.nit || '-'}</td>
                                        <td>{producer.direccion || '-'}</td>
                                        <td>{producer.ciudad || '-'}</td>
                                        <td>{producer.pais || '-'}</td>
                                        <td>{producer.nombre_contacto || '-'}</td>
                                        <td>{producer.celular || '-'}</td>
                                        <td>{producer.correo || '-'}</td>
                                        <td>{formatArray(producer.marcas)}</td>
                                        <td>{producer.fuente_azucar || '-'}</td>
                                        <td>{formatArray(producer.tipo_uva)}</td>
                                        <td>{formatArray(producer.tipo_vino)}</td>
                                        <td>{formatArray(producer.levaduras_utilizadas)}</td>
                                        <td>{formatArray(producer.botellas_utilizadas)}</td>
                                        <td>{formatArray(producer.nutrientes_utilizados)}</td>
                                        <td>{formatArray(producer.conservantes_utilizados)}</td>
                                        <td>{formatArray(producer.clarificantes_utilizados)}</td>
                                        <td>{producer.produccion_anual || '-'}</td>
                                        <td>{producer.observaciones || '-'}</td>
                                        <td>{producer.oportunidades || '-'}</td>
                                        <td>
                                            <div className="wine-producer-list__actions">
                                                <Link
                                                    to={`/wine-producers/${producer.id}/edit`}
                                                    className="wine-producer-list__edit-button"
                                                >
                                                    Editar
                                                </Link>
                                                <button
                                                    className="wine-producer-list__delete-button"
                                                    onClick={() => openModal(producer.id)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
        </div>
    );
}
