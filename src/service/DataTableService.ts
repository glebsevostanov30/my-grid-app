import axios from 'axios';
import type {RowData, RowCountResponse} from '../type/DataTableType.ts';
import type {GridColumn} from "@glideapps/glide-data-grid";

const apiClient = axios.create({
    baseURL: 'http://localhost:5295/Api/Table',
    timeout: 10000,
    headers: {'Content-Type': 'application/json'},
});

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

export async function getColumns(): Promise<GridColumn[]> {
    try {
        const response = await apiClient.get<GridColumn[]>('/Columns')
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error("Ошибка при получении данных:", { cause: error });
    }
}

export async function getCountRows(): Promise<RowCountResponse> {
    try {
        const response = await apiClient.get<RowCountResponse>('/Rows/Count')
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error("Ошибка при получении данных:", { cause: error });
    }
}
