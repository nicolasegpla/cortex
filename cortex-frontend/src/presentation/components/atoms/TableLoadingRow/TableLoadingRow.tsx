import './table-loading-row.scss';

interface TableLoadingRowProps {
    colSpan: number;
    message: string;
}

export function TableLoadingRow({ colSpan, message }: TableLoadingRowProps) {
    return (
        <tr className="table-loading-row">
            <td className="table-loading-row__cell" colSpan={colSpan}>
                <span role="status" aria-live="polite">
                    {message}
                </span>
            </td>
        </tr>
    );
}
