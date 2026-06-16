import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

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

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta cervecería?')) {
            return;
        }
        try {
            await apiClient.delete(`/breweries/${id}`);
            setBreweries((prev) => prev.filter((b) => b.id !== id));
        } catch (err) {
            setError('Error al eliminar la cervecería');
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

    const formatArray = (arr: string[] | null) => {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
    };

    const formatBoolean = (val: boolean | null) => {
        if (val === null || val === undefined) return '-';
        return val ? 'Sí' : 'No';
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
                <Link to="/breweries/new" className="brewery-list__add-button">Agregar Cervecería</Link>
            </div>

            {breweries.length === 0 ? (
                <div className="brewery-list__empty-state">
                    No hay cervecerías registradas.
                </div>
            ) : (
                <div className="brewery-list__table-wrapper">
                    <div className="brewery-list__table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Razón Social</th>
                                    <th>NIT</th>
                                    <th>Dirección</th>
                                    <th>Ciudad</th>
                                    <th>País</th>
                                    <th>Contacto</th>
                                    <th>Cervecero</th>
                                    <th>Celular 1</th>
                                    <th>Celular 2</th>
                                    <th>Correo</th>
                                    <th>Malta</th>
                                    <th>Lúpulo</th>
                                    <th>Levadura</th>
                                    <th>Otros Productos</th>
                                    <th>Estilos</th>
                                    <th>Tipo Operación</th>
                                    <th>Marca Equipo</th>
                                    <th>Cap. Brewhouse</th>
                                    <th>Cap. Fermentación</th>
                                    <th>Litros/Mes</th>
                                    <th>Calidad Equipo</th>
                                    <th>Formatos</th>
                                    <th>Dónde Vende</th>
                                    <th>Observaciones</th>
                                    <th>Oportunidades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breweries.map((brewery) => (
                                    <tr key={brewery.id}>
                                        <td>{brewery.nombre_cerveceria}</td>
                                        <td>{brewery.razon_social || '-'}</td>
                                        <td>{brewery.nit || '-'}</td>
                                        <td>{brewery.direccion || '-'}</td>
                                        <td>{brewery.ciudad || '-'}</td>
                                        <td>{brewery.pais || '-'}</td>
                                        <td>{brewery.nombre_contacto || '-'}</td>
                                        <td>{brewery.nombre_cervecero || '-'}</td>
                                        <td>{brewery.celular_1 || '-'}</td>
                                        <td>{brewery.celular_2 || '-'}</td>
                                        <td>{brewery.correo || '-'}</td>
                                        <td>{formatArray(brewery.maltas_utilizadas)}</td>
                                        <td>{formatArray(brewery.lupulos_utilizados)}</td>
                                        <td>{formatArray(brewery.levaduras_utilizadas)}</td>
                                        <td>{formatBoolean(brewery.utiliza_otros_productos)}</td>
                                        <td>{formatArray(brewery.estilos_cerveza)}</td>
                                        <td>{formatTipoOperacion(brewery.tipo_operacion)}</td>
                                        <td>{brewery.marca_equipo || '-'}</td>
                                        <td>{brewery.capacidad_brewhouse || '-'}</td>
                                        <td>{brewery.capacidad_fermentacion || '-'}</td>
                                        <td>{brewery.litros_mes?.toLocaleString() || '-'}</td>
                                        <td>{brewery.calidad_equipo || '-'}</td>
                                        <td>{formatArray(brewery.formatos_venta)}</td>
                                        <td>{brewery.donde_vende || '-'}</td>
                                        <td>{brewery.observaciones || '-'}</td>
                                        <td>{brewery.oportunidades || '-'}</td>
                                        <td>
                                            <div className="brewery-list__actions">
                                                <Link
                                                    to={`/breweries/${brewery.id}/edit`}
                                                    className="brewery-list__edit-button"
                                                >
                                                    Editar
                                                </Link>
                                                <button 
                                                className="brewery-list__delete-button"
                                                onClick={() => handleDelete(brewery.id)}
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
