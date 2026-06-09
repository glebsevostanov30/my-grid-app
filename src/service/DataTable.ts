import axios from 'axios';
import type {RowData, Columns} from '../type/DataTableApi';

const apiClient = axios.create({
    baseURL: 'http://localhost:5295/Api/Table',
    timeout: 10000,
    headers: {'Content-Type': 'application/json'},
});

// Типизированные методы
export async function getRows(skip: number, take: number) {
    try {
        const response = await apiClient.get<RowData[]>(`/Rows?skip=${skip}&take=${take}`);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error("Ошибка при получении данных:", { cause: error });
    }

}

export async function getInfo(): Promise<Columns> {
    try {
        const response = await apiClient.get<Columns>('/Info')
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error("Ошибка при получении данных:", { cause: error });
    }
}
