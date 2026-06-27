import axios from 'axios';
import type {RowData, Columns, RowCountResponse, CellData} from '../type/DataTableApi';
import type {GridColumn, Item} from "@glideapps/glide-data-grid";

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

export async function getInfo(): Promise<GridColumn[]> {
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

export async function getCell(row: number, col: number): Promise<CellData> {
    try {
        const response = await apiClient.get<CellData>(`/Cell?row=${row}&col=${col}`)
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error("Ошибка при получении данных:", { cause: error });
    }
}
