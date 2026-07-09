import type {CancelToken} from "axios";

export interface Columns {
    columns: ColumnInfo[]
    totalRows: number
}

export interface ColumnInfo {
    title: string
    id: string
}

export interface RowData {
    data: Record<string, string |number>
}

export interface RowCountResponse {
    count: number
}

export interface UploadProgressCallbackRequest {
    (percent: number): void
}

export interface UploadFileRequest {
    data: FormData
    onProgress?: UploadProgressCallbackRequest
    cancelToken: CancelToken
}

export interface UploadFileResponse {
    message: string
    success: boolean
    files: string[]
}
