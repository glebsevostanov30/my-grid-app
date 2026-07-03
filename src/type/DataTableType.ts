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