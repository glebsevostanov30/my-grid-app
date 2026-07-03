import {useState, useEffect, useRef, useMemo} from 'react';
import DataEditor, {
    type GridColumn,
    type GridCell,
    GridCellKind,
    type Item,
    type DataEditorRef,
    type EditableGridCell,
    CompactSelection,
    type Rectangle,
    type CellArray
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import type {RowCountResponse, RowData} from "./type/DataTableType.ts";
import {getColumns, getCountRows, getRows} from "./service/DataTableService.ts";
import {LRUCache} from "./utils/LRUCache.ts";

const PAGE_SIZE = 3000;
const MAX_CACHED_PAGES = 60;



export function TableGrid() {
    const gridRef = useRef<DataEditorRef | null>(null);
    const [columns, setColumns] = useState<GridColumn[]>([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const pagesCache = useRef(new LRUCache<number, RowData[]>(MAX_CACHED_PAGES));
    const loadingPages = useRef(CompactSelection.empty());
    const abortControllers = useRef(new Map<number, AbortController>());
    const [visiblePages, setVisiblePages] = useState<Rectangle>({x: 0, y: 0, width: 0, height: 0});
    const visiblePagesRef = useRef(visiblePages);

    useEffect(() => {
        visiblePagesRef.current = visiblePages;
    }, [visiblePages]);

    // Загрузка метаданных
    useEffect(() => {
        getCountRows()
            .then((data: RowCountResponse) => {
                setRowCount(data.count);
                setLoading(false);
            })
            .catch(error => {
                console.error('Ошибка загрузки количества колонок:', error);
                setLoading(false);
            });
        getColumns()
            .then((data: GridColumn[]) => {
                setColumns(data.map((col: GridColumn) => ({
                    title: col.title,
                    id: col.title,
                    width: 150
                })));
                setLoading(false);
            })
            .catch(error => {
                console.error('Ошибка загрузки колонок:', error);
                setLoading(false);
            });
    }, []);

    const loadPage = async (page: number) => {
        if (loadingPages.current.hasIndex(page) || pagesCache.current.has(page)) return;

        loadingPages.current = loadingPages.current.add(page);

        // Отменяем предыдущий запрос для этой страницы
        abortControllers.current.get(page)?.abort();
        const controller = new AbortController();
        abortControllers.current.set(page, controller);

        try {
            const skip = page * PAGE_SIZE;
            const rows = await getRows(skip, PAGE_SIZE);
            pagesCache.current.set(page, rows);

            // 🔥 Точечное обновление только видимых ячеек
            const vr = visiblePagesRef.current;
            const damageList: { cell: [number, number] }[] = [];

            for (let i = 0; i < rows.length; i++) {
                const rowIndex = skip + i;
                // Обновляем только если строка в видимой области
                if (rowIndex >= vr.y && rowIndex < vr.y + vr.height) {
                    for (let col = vr.x; col <= vr.x + vr.width; col++) {
                        damageList.push({cell: [col, rowIndex]});
                    }
                }
            }

            if (damageList.length > 0) {
                gridRef.current?.updateCells(damageList);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error(`Page ${page} failed:`, error);
            }
        } finally {
            loadingPages.current = loadingPages.current.remove(page);
            abortControllers.current.delete(page);
        }
    };

    // Получение содержимого ячейки
    const getCellContent = (cell: Item): GridCell => {
        const [col, row] = cell;
        const pageIndex = Math.floor(row / PAGE_SIZE);
        const pageData = pagesCache.current.get(pageIndex);

        if (!pageData) {
            loadPage(pageIndex)
                .catch(error => {
                    console.error('Ошибка загрузки страницы:', error);
                });
            return {
                kind: GridCellKind.Loading,
                allowOverlay: false,
            };
        }

        const rowIndexInPage = row % PAGE_SIZE;
        const rowData = pageData[rowIndexInPage];
        const columnName = columns[col]?.id;

        // 🔥 Защита от undefined columnName
        if (!columnName) {
            return {
                kind: GridCellKind.Text,
                data: "",
                displayData: "",
                allowOverlay: false,
                readonly: true,
            };
        }

        const value = rowData[columnName];

        return {
            kind: GridCellKind.Text,
            data: String(value),
            displayData: String(value),
            allowOverlay: true,
            readonly: false,
        };
    };

    // Обработка изменения видимой области
    const onVisibleRegionChanged = (r: Rectangle) => {
        setVisiblePages(cv => {
            if (r.x === cv.x && r.y === cv.y && r.width === cv.width && r.height === cv.height) return cv;
            return r;
        });
    };

    // Загрузка страниц для видимой области
    useEffect(() => {
        const r = visiblePages;
        const firstPage = Math.max(0, Math.floor((r.y - PAGE_SIZE / 2) / PAGE_SIZE));
        const lastPage = Math.floor((r.y + r.height + PAGE_SIZE / 2) / PAGE_SIZE);

        for (let page = firstPage; page <= lastPage; page++) {
            if (loadingPages.current.hasIndex(page)) continue;
            void loadPage(page);
        }
    }, [visiblePages]);

    const onCellEdited = (cell: Item, newVal: EditableGridCell) => {
        const [col, row] = cell;
        const pageIndex = Math.floor(row / PAGE_SIZE);
        const pageData = pagesCache.current.get(pageIndex);

        if (!pageData) return;

        const rowIndexInPage = row % PAGE_SIZE;
        const rowData = pageData[rowIndexInPage];
        const columnName = columns[col]?.id;

        // 🔥 Объединяем проверки
        if (columnName && newVal.kind === GridCellKind.Text) {
            rowData[columnName] = newVal.data;
        }
    };

    // Получение ячеек для выделения (копирование)
    const getCellsForSelection = (r: Rectangle): (() => Promise<CellArray>) => {
        return async () => {
            const firstPage = Math.max(0, Math.floor(r.y / PAGE_SIZE));
            const lastPage = Math.floor((r.y + r.height) / PAGE_SIZE);

            // Загружаем все необходимые страницы
            const pagesToLoad = [];
            for (let page = firstPage; page <= lastPage; page++) {
                if (!loadingPages.current.hasIndex(page) && !pagesCache.current.has(page)) {
                    pagesToLoad.push(page);
                }
            }

            await Promise.all(pagesToLoad.map(loadPage));

            const result: GridCell[][] = [];
            for (let y = r.y; y < r.y + r.height; y++) {
                const row: GridCell[] = [];
                for (let x = r.x; x < r.x + r.width; x++) {
                    row.push(getCellContent([x, y]));
                }
                result.push(row);
            }

            return result;
        };
    };

    const memoizedColumns = useMemo(() => columns, [columns]);

    if (loading) return <div>Загрузка...</div>;

    return (
        <div style={{height: "80vh", width: "100%"}}>
            <DataEditor
                ref={gridRef}
                getCellContent={getCellContent}
                columns={memoizedColumns}
                rows={rowCount}
                rowHeight={34}
                headerHeight={38}
                onVisibleRegionChanged={onVisibleRegionChanged}
                onCellEdited={onCellEdited}
                getCellsForSelection={getCellsForSelection}
                onCellClicked={() => {
                }}
                smoothScrollY={true}
            />
        </div>
    );
}