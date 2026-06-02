import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

interface Brewery {
    id: string;
    nombre_cerveceria: string;
    ciudad: string | null;
    pais: string | null;
    tipo_operacion: string | null;
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
            setError('Failed to load breweries');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading breweries...</div>;
    }

    if (error) {
        return <div className="error" role="alert">{error}</div>;
    }

    return (
        <div className="brewery-list">
            <div className="brewery-list__header">
                <h2>Breweries</h2>
                <Link to="/breweries/new" className="button">Add Brewery</Link>
            </div>

            {breweries.length === 0 ? (
                <p className="empty-state">No breweries found.</p>
            ) : (
                <table className="brewery-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>City</th>
                            <th>Country</th>
                            <th>Operation Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {breweries.map((brewery) => (
                            <tr key={brewery.id}>
                                <td>{brewery.nombre_cerveceria}</td>
                                <td>{brewery.ciudad || '-'}</td>
                                <td>{brewery.pais || '-'}</td>
                                <td>{brewery.tipo_operacion || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
