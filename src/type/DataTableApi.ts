export interface Columns {
    columns: ColumnInfo[]
    totalRows: number
}

export interface ColumnInfo {
    title: string;
    id: string
}

export interface RowData {
    data: Record<string, string |number>
}

export interface RowCountResponse {
    count: number
}

export interface CellData {
    kind: string
    data: string
    displayData: string
    allowOverlay: boolean
    readonly: boolean
}