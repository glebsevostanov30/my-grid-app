import {
    DataEditor,
    type DataEditorRef,
    GridCellKind,
    type GridColumn,
    type Item,
    type Theme
} from "@glideapps/glide-data-grid";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {getCountRows, getColumns} from "./service/DataTableService.ts";
import type {RowCountResponse} from "./type/DataTableType.ts";

const getMockCellContent = ([col, row]: Item) => ({
    kind: GridCellKind.Text,
    data: `${String.fromCharCode(65 + col)}${row}`,
    displayData: `${String.fromCharCode(65 + col)}${row}`,
    allowOverlay: true,
    readonly: false,
});

function useSimpleUndoRedo(
    gridRef: React.RefObject<DataEditorRef | null>,
    getCellContent: (cell: Item) => any,
    setCellValue: (cell: Item, newValue: any) => void
) {
    const [gridSelection, setGridSelection] = useState<any>(undefined);
    const [history, setHistory] = useState<any[]>([]);
    const [redoStack, setRedoStack] = useState<any[]>([]);

    const onCellEdited = useCallback((cell: Item, newValue: any) => {
        const oldValue = getCellContent(cell);
        setHistory(prev => [...prev, {cell, oldValue, newValue}]);
        setRedoStack([]);

        // Меняем данные
        setCellValue(cell, newValue);

        // Говорим таблице перерисовать конкретную ячейку
        gridRef.current?.updateCells([{cell}]);
    }, [getCellContent, setCellValue]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setRedoStack(prev => [...prev, last]);
        setHistory(prev => prev.slice(0, -1));

        setCellValue(last.cell, last.oldValue);
        gridRef.current?.updateCells([{cell: last.cell}]);
    }, [history, setCellValue]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const last = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, last]);
        setRedoStack(prev => prev.slice(0, -1));

        setCellValue(last.cell, last.newValue);
        gridRef.current?.updateCells([{cell: last.cell}]);
    }, [redoStack, setCellValue]);

    return {
        gridSelection,
        onGridSelectionChange: setGridSelection,
        onCellEdited,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
    };
}


export function DataGridWithUndo() {
    const gridRef = useRef<DataEditorRef>(null);

    const [columns, setColumns] = useState<GridColumn[]>([]);
    const [rowCount, setRowCount] = useState<RowCountResponse>({count: 0});

    useEffect(() => {
        getColumns()
            .then((data) => {
                setColumns(data);
            })
            .catch((err) => {
                console.error(err);
            });
        getCountRows()
            .then((data) =>{
                setRowCount(data)
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    // Хранилище данных ячеек (ключ "col,row" -> GridCell)
    const [cellData, setCellData] = useState<Map<string, any>>(new Map());

    const getCellContent = useCallback(([col, row]: Item) => {
        const key = `${col},${row}`;
        if (cellData.has(key)) {
            return cellData.get(key);
        }
        return getMockCellContent([col, row]);
    }, [cellData]);

    const setCellValue = useCallback(([col, row]: Item, newValue: any) => {
        const key = `${col},${row}`;
        setCellData(prev => {
            const newMap = new Map(prev);
            newMap.set(key, newValue);
            return newMap;
        });
    }, []);

    const {
        onCellEdited,
        onGridSelectionChange,
        gridSelection,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useSimpleUndoRedo(gridRef, getCellContent, setCellValue);

    const theme: Partial<Theme> = {
        accentColor: '#4F5DFF',
        bgCell: '#FFFFFF',
        bgHeader: '#F7F7F8',
        borderColor: 'rgba(115, 116, 131, 0.16)',
        fontFamily: 'Inter, sans-serif',
    };

    // Проверяем наличие портала (ваш второй вариант)
    React.useEffect(() => {
        if (!document.getElementById('portal')) {
            const portal = document.createElement('div');
            portal.id = 'portal';
            document.body.appendChild(portal);
        }
    }, []);

    return (
        <div style={{height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', padding: 20}}>
            <div style={{marginBottom: 8, display: 'flex', gap: 8}}>
                <button onClick={undo} disabled={!canUndo}>
                    Undo (Ctrl+Z)
                </button>
                <button onClick={redo} disabled={!canRedo}>
                    Redo (Ctrl+Y / Ctrl+Shift+Z)
                </button>
            </div>
            <div style={{flex: 1, minHeight: 0, position: 'relative'}}>
                <DataEditor
                    ref={gridRef}
                    columns={columns}
                    rows={rowCount.count}
                    getCellContent={getCellContent}
                    onCellEdited={onCellEdited}
                    gridSelection={gridSelection}
                    onGridSelectionChange={onGridSelectionChange}
                    theme={theme}
                    smoothScrollX={true}
                    smoothScrollY={true}
                    rowMarkers="none"
                />
            </div>
        </div>
    );
}