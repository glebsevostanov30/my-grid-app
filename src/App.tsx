import {useCallback, useEffect, useRef, useState} from 'react';
import {
    DataEditor, type EditableGridCell,
    GridCellKind,
    type GridColumn,
    type Item,
    type TextCell,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import type {ColumnInfo, RowData} from "./type/DataTableApi.ts";
import {getInfo, getRows} from "./service/DataTable.ts";

// API-клиент (можно вынести в отдельный файл)
const API_BASE = 'http://localhost:5295/Api/Table';

async function updateCell(row: number, columnName: string, value: string) {
    await fetch(`${API_BASE}/UpdateCell`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({row, columnName, value}),
    });
}

function App() {
    const [columns, setColumns] = useState<GridColumn[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    // Кэш строк: ключ = индекс строки, значение = RowData
    const [rowsCache, setRowsCache] = useState<Map<number, RowData>>(new Map());
    // Для отслеживания загруженных диапазонов (опционально)
    const loadedRanges = useRef<Set<string>>(new Set());
    const loadingRef = useRef<boolean>(false);

    // 1. Загружаем метаданные при старте
    useEffect(() => {
        getInfo().then(info => {
            const gridCols: GridColumn[] = info.columns.map((col: ColumnInfo) => ({
                title: col.columnName,
                width: 150,
            }));
            setColumns(gridCols);
            setTotalRows(info.totalRows);
        });
    }, []);

    // Асинхронная загрузка порции строк
    const loadRows = useCallback(async (startRow: number, endRow: number) => {
        if (loadingRef.current) return;
        loadingRef.current = true;

        const neededRows: number[] = [];
        for (let i = startRow; i <= endRow && i < totalRows; i++) {
            if (!rowsCache.has(i)) neededRows.push(i);
        }
        if (neededRows.length === 0) {
            loadingRef.current = false;
            return;
        }

        // Определяем минимальный непрерывный блок, который нужно загрузить
        const minRow = Math.min(...neededRows);
        const maxRow = Math.max(...neededRows);
        // Загружаем с запасом по 100 строк от min до max+100 (или до конца)
        const take = Math.min(100, totalRows - minRow);
        const newRows = await getRows(minRow, take);

        setRowsCache((prev) => {
            const updated = new Map(prev);
            newRows.forEach((row, idx) => {
                updated.set(minRow + idx, row);
            });
            return updated;
        });
        loadingRef.current = false;
    }, [rowsCache, totalRows]);

    // getCellContent – синхронное чтение из кэша
    const getCellContent = useCallback((cell: Item): TextCell => {
        const [colIdx, rowIdx] = cell;
        const columnName = columns[colIdx]?.title;
        const rowData = rowsCache.get(rowIdx);

        let value = '';
        if (rowData && columnName) {
            value = String(rowData[columnName] ?? '');
        }

        return {
            kind: GridCellKind.Text,
            data: value,
            displayData: value,
            allowOverlay: true,
        };
    }, [columns, rowsCache]);

    // Обработка изменения видимой области – подгружаем то, что стало видно
    const onVisibleRegionChanged = useCallback((range: { x: number; y: number; width: number; height: number }) => {
        const firstVisibleRow = range.y;
        const lastVisibleRow = range.y + range.height;
        // Добавим буфер: подгружаем также строки выше и ниже
        const start = Math.max(0, firstVisibleRow - 50);
        const end = Math.min(totalRows - 1, lastVisibleRow + 50);
        loadRows(start, end);
    }, [loadRows, totalRows]);

    // Редактирование ячейки
    const onCellEdited = useCallback(async (cell: Item, newValue: EditableGridCell) => {
        const [colIdx, rowIdx] = cell;
        const columnName = columns[colIdx]?.title;
        if (!columnName) return;

        // Оптимистичное обновление UI
        setRowsCache((prev) => {
            const updated = new Map(prev);
            const oldRow = updated.get(rowIdx);
            if (oldRow) {
                updated.set(rowIdx, {...oldRow, [columnName]: newValue});
            }
            return updated;
        });

        try {
            await updateCell(rowIdx, columnName, newValue);
        } catch (error) {
            console.error('Ошибка сохранения', error);
            // При ошибке можно перезагрузить эту строку с сервера
            loadRows(rowIdx, rowIdx);
        }
    }, [columns, loadRows]);

    if (columns.length === 0) {
        return <div>Загрузка структуры таблицы...</div>;
    }

    return (
        <div style={{height: '100vh', width: '100%'}}>
            <DataEditor
                columns={columns}
                rows={totalRows}
                getCellContent={getCellContent}
                onVisibleRegionChanged={onVisibleRegionChanged}
                onCellEdited={onCellEdited}
                // Включаем возможность редактирования текста
                rowMarkers="both"
            />
        </div>
    );
}

export default App;