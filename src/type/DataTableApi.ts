export interface Columns {
    columns: ColumnInfo[]
    totalRows: number
}

export interface ColumnInfo {
    columnName: string;
    dataType: string
}

export interface RowData {
    data: Record<string, string |number>
}