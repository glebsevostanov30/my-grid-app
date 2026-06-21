import * as React from "react";
import {
    DataEditor,
    type DataEditorProps,
    type DataEditorRef,
    GridCellKind,
    type GridColumn,
    type Theme,
} from "@glideapps/glide-data-grid";
import { faker } from "@faker-js/faker";
import { useCollapsingGroups, useColumnSort, useMoveableColumns } from "../index.js";
import { useUndoRedo } from "../use-undo-redo.js";
import { useMockDataGenerator } from "./utils.js";

faker.seed(1337);


const defaultProps: Partial<DataEditorProps> = {
    smoothScrollX: true,
    smoothScrollY: true,
    isDraggable: false,
    rowMarkers: "none",
    width: "100%",
};

const testTheme: Theme = {
    accentColor: "#4F5DFF",
    accentFg: "#FFFFFF",
    accentLight: "rgba(62, 116, 253, 0.1)",

    textDark: "#313139",
    textMedium: "#737383",
    textLight: "#B2B2C0",
    textBubble: "#313139",

    bgIconHeader: "#737383",
    fgIconHeader: "#FFFFFF",
    textHeader: "#313139",
    textGroupHeader: "#313139BB",
    textHeaderSelected: "#FFFFFF",

    bgCell: "#FFFFFF",
    bgCellMedium: "#FAFAFB",
    bgHeader: "#F7F7F8",
    bgHeaderHasFocus: "#E9E9EB",
    bgHeaderHovered: "#EFEFF1",

    bgBubble: "#EDEDF3",
    bgBubbleSelected: "#FFFFFF",

    headerIconSize: 20,
    markerFontStyle: "13px",

    bgSearchResult: "#fff9e3",

    borderColor: "rgba(115, 116, 131, 0.16)",
    horizontalBorderColor: "rgba(115, 116, 131, 0.16)",
    drilldownBorder: "rgba(0, 0, 0, 0)",

    linkColor: "#4F5DFF",

    cellHorizontalPadding: 8,
    cellVerticalPadding: 3,

    headerFontStyle: "600 13px",
    baseFontStyle: "13px",
    editorFontSize: "13px",
    lineHeight: 1.4,
    fontFamily:
        "Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif",
};

const cols: GridColumn[] = [
    {
        title: "A",
        width: 200,
        group: "Group 1",
    },
    {
        title: "B",
        width: 200,
        group: "Group 1",
    },
    {
        title: "C",
        width: 200,
        group: "Group 2",
    },
    {
        title: "D",
        width: 200,
        group: "Group 2",
    },
    {
        title: "E",
        width: 200,
        group: "Group 2",
    },
];

export const UseDataSource: React.FC = () => {
    const cache = React.useRef<Record<string, string>>({});

    const rows = 100_000;

    const moveArgs = useMoveableColumns({
        columns: cols,
        getCellContent: React.useCallback(([col, row]) => {
            if (col === 0) {
                return {
                    kind: GridCellKind.Text,
                    allowOverlay: true,
                    data: `${row}`,
                    displayData: `${row}`,
                };
            }

            const key = `${col},${row}`;
            if (cache.current[key] === undefined) {
                cache.current[key] = faker.airline.airport().name + " " + faker.airline.airport().name;
            }
            const d = cache.current[key];

            return {
                kind: GridCellKind.Text,
                allowOverlay: true,
                data: d,
                displayData: d,
            };
        }, []),
    });

    const [sort, setSort] = React.useState<number>();

    const sortArgs = useColumnSort({
        columns: moveArgs.columns,
        getCellContent: moveArgs.getCellContent,
        rows,
        sort:
            sort === undefined
                ? undefined
                : {
                      column: moveArgs.columns[sort],
                      direction: "desc",
                      mode: "smart",
                  },
    });

    const collapseArgs = useCollapsingGroups({
        columns: moveArgs.columns,
        theme: testTheme,
        freezeColumns: 0,
    });

    const onHeaderClick = React.useCallback((index: number) => {
        setSort(index);
    }, []);

    return (
            <DataEditor
                {...defaultProps}
                {...moveArgs}
                {...sortArgs}
                {...collapseArgs}
                rows={rows}
                onColumnMoved={moveArgs.onColumnMoved}
                onHeaderClicked={onHeaderClick}
            />
    );
};
(UseDataSource as any).parameters = {
    options: {
        showPanel: false,
    },
};

export const UndoRedo: React.FC = () => {
    const { cols: columns, getCellContent, setCellValue } = useMockDataGenerator(6);

    const gridRef = React.useRef<DataEditorRef>(null);

    const { gridSelection, onCellEdited, onGridSelectionChange, undo, canRedo, canUndo, redo } = useUndoRedo(
        gridRef,
        getCellContent,
        setCellValue
    );

    return (
            <DataEditor
                {...defaultProps}
                ref={gridRef}
                onCellEdited={onCellEdited}
                getCellContent={getCellContent}
                gridSelection={gridSelection ?? undefined}
                onGridSelectionChange={onGridSelectionChange}
                columns={columns}
                rows={1000}
            />
    );
};

(UndoRedo as any).parameters = {
    options: {
        showPanel: false,
    },
};
