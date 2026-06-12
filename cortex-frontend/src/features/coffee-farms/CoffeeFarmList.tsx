import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import './CoffeeFarmList.scss';

interface CoffeeFarm {
    id: string;
    nombre_finca: string;
    razon_social: string | null;
    nit: string | null;
    direccion: string | null;
    departamento: string | null;
    ciudad: string | null;
    pais: string | null;
    nombre_contacto: string | null;
    celular: string | null;
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta finca de café?')) {
            return;
        }
        try {
            await apiClient.delete(`/coffee-farms/${id}`);
            setFarms((prev) => prev.filter((farm) => farm.id !== id));
        } catch (err) {
            setError('Error al eliminar la finca de café');
        }
    };

    const formatValue = (value: string | number | null) => {
        if (value === null || value === undefined) return '-';
        return value.toLocaleString();
    };

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    if (loading) {
        return <div className="coffee-farm-list__skeleton-row">Cargando fincas de café...</div>;
    }

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="coffee-farm-list">
            <div className="coffee-farm-list__header">
                <h2>Fincas de café</h2>
                <Link to="/coffee-farms/new" className="coffee-farm-list__add-button">Agregar Finca de Café</Link>
            </div>

            {farms.length === 0 ? (
                <div className="coffee-farm-list__empty-state">
                    No hay fincas de café registradas.
                </div>
            ) : (
                <div className="coffee-farm-list__table-wrapper">
                    <div className="coffee-farm-list__table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Razón Social</th>
                                    <th>NIT</th>
                                    <th>Dirección</th>
                                    <th>Departamento</th>
                                    <th>Ciudad</th>
                                    <th>País</th>
                                    <th>Contacto</th>
                                    <th>Celular</th>
                                    <th>Correo</th>
                                    <th>Tipo Actividad</th>
                                    <th>Hectáreas Totales</th>
                                    <th>Hectáreas Café</th>
                                    <th>Número de Árboles</th>
                                    <th>Variedades Sembradas</th>
                                    <th>Tipo Proceso</th>
                                    <th>Puntaje Café</th>
                                    <th>Nivel Tecnificación</th>
                                    <th>Equipos</th>
                                    <th>Observaciones</th>
                                    <th>Oportunidades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {farms.map((farm) => (
                                    <tr key={farm.id}>
                                        <td>{farm.nombre_finca}</td>
                                        <td>{farm.razon_social || '-'}</td>
                                        <td>{farm.nit || '-'}</td>
                                        <td>{farm.direccion || '-'}</td>
                                        <td>{farm.departamento || '-'}</td>
                                        <td>{farm.ciudad || '-'}</td>
                                        <td>{farm.pais || '-'}</td>
                                        <td>{farm.nombre_contacto || '-'}</td>
                                        <td>{farm.celular || '-'}</td>
                                        <td>{farm.correo || '-'}</td>
                                        <td>{farm.tipo_actividad || '-'}</td>
                                        <td>{formatValue(farm.hectareas_totales)}</td>
                                        <td>{formatValue(farm.hectareas_cafe)}</td>
                                        <td>{formatValue(farm.numero_arboles)}</td>
                                        <td>{formatArray(farm.variedades_sembradas)}</td>
                                        <td>{farm.tipo_proceso || '-'}</td>
                                        <td>{formatValue(farm.puntaje_cafe)}</td>
                                        <td>{farm.nivel_tecnificacion || '-'}</td>
                                        <td>{formatArray(farm.equipos)}</td>
                                        <td>{farm.observaciones || '-'}</td>
                                        <td>{farm.oportunidades || '-'}</td>
                                        <td>
                                            <div className="coffee-farm-list__actions">
                                                <button className="coffee-farm-list__edit-button">Editar</button>
                                                <button
                                                    className="coffee-farm-list__delete-button"
                                                    onClick={() => handleDelete(farm.id)}
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
        </div>
    );
}
