import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { DeleteConfirmationModal } from '@/presentation/components/organisms';
import { apiClient } from '@/services/api/client';

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
    correo: string | null;
    especies_manejadas: string[] | null;
    productos_fabricados: string[] | null;
    observaciones: string | null;
    oportunidades: string | null;
    created_at: string;
    updated_at: string;
}

export function AnimalFeedProducerList() {
    const [producers, setProducers] = useState<AnimalFeedProducer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const selectedProducer = producers.find((producer) => producer.id === itemId);
    const itemLabel = selectedProducer ? `el productor ${selectedProducer.razon_social}` : 'este registro';

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    if (loading) {
        return <div className="animal-feed-producer-list__skeleton-row">Cargando productores de alimentos para animales...</div>;
    }

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="animal-feed-producer-list">
            <div className="animal-feed-producer-list__header">
                <h2>Productores de Alimentos para Animales</h2>
                <Link to="/animal-feed-producers/new" className="animal-feed-producer-list__add-button">Agregar Productor</Link>
            </div>

            {producers.length === 0 ? (
                <div className="animal-feed-producer-list__empty-state">
                    No hay productores de alimentos para animales registrados.
                </div>
            ) : (
                <div className="animal-feed-producer-list__table-wrapper">
                    <div className="animal-feed-producer-list__table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Razón Social</th>
                                    <th>Marca</th>
                                    <th>NIT</th>
                                    <th>Dirección</th>
                                    <th>Departamento</th>
                                    <th>Ciudad</th>
                                    <th>País</th>
                                    <th>Contacto</th>
                                    <th>Celular</th>
                                    <th>Correo</th>
                                    <th>Especies Manejadas</th>
                                    <th>Productos Fabricados</th>
                                    <th>Observaciones</th>
                                    <th>Oportunidades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {producers.map((producer) => (
                                    <tr key={producer.id}>
                                        <td>{producer.razon_social}</td>
                                        <td>{producer.marca || '-'}</td>
                                        <td>{producer.nit || '-'}</td>
                                        <td>{producer.direccion || '-'}</td>
                                        <td>{producer.departamento || '-'}</td>
                                        <td>{producer.ciudad || '-'}</td>
                                        <td>{producer.pais || '-'}</td>
                                        <td>{producer.nombre_contacto || '-'}</td>
                                        <td>{producer.celular || '-'}</td>
                                        <td>{producer.correo || '-'}</td>
                                        <td>{formatArray(producer.especies_manejadas)}</td>
                                        <td>{formatArray(producer.productos_fabricados)}</td>
                                        <td>{producer.observaciones || '-'}</td>
                                        <td>{producer.oportunidades || '-'}</td>
                                        <td>
                                            <div className="animal-feed-producer-list__actions">
                                                <Link
                                                    to={`/animal-feed-producers/${producer.id}/edit`}
                                                    className="animal-feed-producer-list__edit-button"
                                                >
                                                    Editar
                                                </Link>
                                                <button
                                                    className="animal-feed-producer-list__delete-button"
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
