import { Link } from 'react-router-dom';

import './DatabasesPage.scss';

interface DatabaseCard {
    id: string;
    name: string;
    description: string;
    count: number | null;
    route: string;
    status: 'active' | 'coming-soon';
}

const databases: DatabaseCard[] = [
    {
        id: 'breweries',
        name: 'Cervecerías',
        description: 'Cervecerías y productores de cerveza artesanal',
        count: null,
        route: '/breweries',
        status: 'active',
    },
    {
        id: 'coffee-farms',
        name: 'Fincas de café',
        description: 'Fincas de café y productores',
        count: null,
        route: '/coffee-farms',
        status: 'coming-soon',
    },
    {
        id: 'wine-producers',
        name: 'Productores de vino',
        description: 'Vinícolas y productores de vino',
        count: null,
        route: '/wine-producers',
        status: 'coming-soon',
    },
    {
        id: 'animal-feed',
        name: 'Alimentos para animales',
        description: 'Productores de piensos y alimentos para animales',
        count: null,
        route: '/animal-feed-producers',
        status: 'coming-soon',
    },
];

export function DatabasesPage() {
    return (
        <div className="databases-page">
            <div className="databases-page__header">
                <div className="databases-page__header-left">
                    <h1 className="databases-page__title">Bases de datos</h1>
                    <p className="databases-page__subtitle">
                        Gestiona las bases de datos de productores
                    </p>
                </div>
            </div>

            <div className="databases-page__grid">
                {databases.map((db) => (
                    <Link
                        key={db.id}
                        to={db.route}
                        className={`database-card ${db.status === 'coming-soon' ? 'database-card--coming-soon' : ''}`}
                    >
                        <div className="database-card__header">
                            <div className="database-card__icon">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                                    <path d="M3 12A9 3 0 0 0 21 12" />
                                </svg>
                            </div>
                            {db.status === 'coming-soon' && (
                                <span className="database-card__badge">Próximamente</span>
                            )}
                        </div>
                        <h3 className="database-card__title">{db.name}</h3>
                        <p className="database-card__description">{db.description}</p>
                        {db.status === 'active' && (
                            <span className="database-card__action">Ver tabla →</span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
