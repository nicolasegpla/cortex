import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import './BreweryList.scss';

interface Brewery {
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
    correo: string | null;
    tipo_operacion: string | null;
    litros_mes: number | null;
    marca_equipo: string | null;
    created_at: string;
}

export function BreweryList() {
    const [breweries, setBreweries] = useState<Brewery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const formatTipoOperacion = (tipo: string | null) => {
        if (!tipo) return '-';
        const map: Record<string, string> = {
            maquila: 'Maquila',
            planta_propia: 'Planta Propia',
            ambos: 'Ambos',
        };
        return map[tipo] || tipo;
    };

    if (loading) {
        return <div className="brewery-list__skeleton-row">Cargando cervecerías...</div>;
    }

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="brewery-list">
            <div className="brewery-list__header">
                <h2>Cervecerías</h2>
                <Link to="/breweries/new" className="button">Agregar Cervecería</Link>
            </div>

            {breweries.length === 0 ? (
                <div className="brewery-list__empty-state">
                    No hay cervecerías registradas.
                </div>
            ) : (
                <div className="brewery-list__table">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Razón Social</th>
                                <th>NIT</th>
                                <th>Ciudad</th>
                                <th>Contacto</th>
                                <th>Tipo Operación</th>
                                <th>Litros/Mes</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breweries.map((brewery) => (
                                <tr key={brewery.id}>
                                    <td>{brewery.nombre_cerveceria}</td>
                                    <td>{brewery.razon_social || '-'}</td>
                                    <td>{brewery.nit || '-'}</td>
                                    <td>{brewery.ciudad || '-'}</td>
                                    <td>{brewery.nombre_contacto || '-'}</td>
                                    <td>{formatTipoOperacion(brewery.tipo_operacion)}</td>
                                    <td>{brewery.litros_mes?.toLocaleString() || '-'}</td>
                                    <td>
                                        <div className="brewery-list__actions">
                                            <button className="brewery-list__edit-button">Editar</button>
                                            <button className="brewery-list__delete-button">Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
