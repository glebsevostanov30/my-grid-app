import React, {useState, useRef, useCallback} from 'react';
import axios, {type CancelTokenSource} from 'axios';
import './FileUploader.css';
import {uploadFile} from "./service/DataTableService.ts";

interface FileUploaderProps {
    accept?: string;
    maxSize?: number;               // байты
    multiple?: boolean;
    onUploadSuccess?: () => void;
    onUploadError?: (error: string) => void;
}

const FileUploader = ({
                          accept = '*/*',
                          maxSize = 50 * 1024 * 1024,
                          multiple = true,
                          onUploadSuccess,
                          onUploadError,
                      }: FileUploaderProps) => {
        const [files, setFiles] = useState<File[]>([]);
        const [validationErrors, setValidationErrors] = useState<string[]>([]);
        const [isDragging, setIsDragging] = useState(false);
        const [uploadProgress, setUploadProgress] = useState(0);
        const [isUploading, setIsUploading] = useState(false);
        const [uploadComplete, setUploadComplete] = useState(false);
        const [uploadError, setUploadError] = useState<string | null>(null);

        const inputRef = useRef<HTMLInputElement>(null);
        const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null);

        // --- Валидация (без изменений) ---
        const isFileAccepted = (file: File): boolean => {
            if (accept === '*/*') return true;
            const acceptedTypes = accept.split(',').map((s) => s.trim());
            return acceptedTypes.some((type) => {
                if (type.startsWith('.')) {
                    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                    return ext === type.toLowerCase();
                } else {
                    if (type.endsWith('/*')) {
                        const base = type.slice(0, -2);
                        return file.type.startsWith(base);
                    }
                    return file.type === type;
                }
            });
        };

        const validateFile = (file: File): string | null => {
            if (!isFileAccepted(file)) {
                return `Файл "${file.name}" имеет неподдерживаемый формат. Разрешены: ${accept}`;
            }
            if (file.size > maxSize) {
                return `Файл "${file.name}" превышает максимальный размер (${(maxSize / (1024 * 1024)).toFixed(0)} МБ)`;
            }
            return null;
        };

        // --- Добавление файлов ---
        const addFiles = (fileList: FileList | File[]) => {
            const newFiles: File[] = [];
            const errors: string[] = [];
            const fileArray = Array.from(fileList);
            const filesToProcess = multiple ? fileArray : fileArray.slice(0, 1);

            filesToProcess.forEach((file) => {
                const error = validateFile(file);
                if (error) errors.push(error);
                else newFiles.push(file);
            });

            if (newFiles.length) {
                setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
            }
            if (errors.length) {
                setValidationErrors((prev) => [...prev, ...errors]);
            }
            setUploadComplete(false);
            setUploadError(null);
        };

        // --- Обработчики Drag & Drop / Input (без изменений) ---
        const handleDragEnter = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
        }, []);

        const handleDragLeave = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
        }, []);

        const handleDragOver = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        }, []);

        const handleDrop = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files.length) {
                addFiles(e.dataTransfer.files);
            }
        }, [addFiles]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) {
                addFiles(e.target.files);
            }
            e.target.value = '';
        };

        // --- Удаление / очистка ---
        const removeFile = (index: number) => {
            setFiles((prev) => prev.filter((_, i) => i !== index));
            setUploadComplete(false);
            setUploadError(null);
            setUploadProgress(0);
        };

        const clearFiles = () => {
            setFiles([]);
            setValidationErrors([]);
            setUploadProgress(0);
            setUploadComplete(false);
            setUploadError(null);
        };

        const uploadFiles = async () => {
            if (files.length === 0) return;

            const source = axios.CancelToken.source();

            setIsUploading(true);
            setUploadProgress(0);
            setUploadComplete(false);
            setUploadError(null);

            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            cancelTokenSourceRef.current = source;

            const uploadFileRequest = {
                data: formData,
                onProgress: setUploadProgress,
                cancelToken: source.token
            };

            uploadFile(uploadFileRequest)
                .then(value => {
                    setIsUploading(false);
                    setUploadProgress(100);
                    setUploadComplete(value.success);
                    onUploadSuccess?.();
                })
                .catch(error => {
                    setIsUploading(false);
                    cancelTokenSourceRef.current = null;

                    if (axios.isCancel(error)) {
                        const errMsg = 'Загрузка отменена';
                        setUploadError(errMsg);
                        onUploadError?.(errMsg);
                    } else {
                        const errMsg = error.response?.data?.message || error.message || 'Ошибка загрузки';
                        setUploadError(errMsg);
                        onUploadError?.(errMsg);
                    }
                })

        };

        const cancelUpload = () => {
            if (cancelTokenSourceRef.current) {
                cancelTokenSourceRef.current.cancel('Операция отменена пользователем');
            }
        };

        const formatSize = (bytes: number) => {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        };

// --- Рендер (без изменений, кроме вызова uploadFiles) ---
        return (
            <div className="uploader-container">
                {/* Зона Drag & Drop — без изменений */}
                <div
                    className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadComplete ? 'success' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && inputRef.current?.click()}
                >
                    <input
                        type="file"
                        multiple={multiple}
                        accept={accept}
                        ref={inputRef}
                        style={{display: 'none'}}
                        onChange={handleInputChange}
                        disabled={isUploading}
                    />
                    {files.length === 0 ? (
                        <>
                            <div className="drop-icon">📁</div>
                            <p className="drop-text">
                                Перетащите файлы сюда или <span className="browse-link">выберите их</span>
                            </p>
                            <p className="drop-hint">
                                {multiple ? 'Поддерживаются файлы' : 'Поддерживается один файл'}
                                {' '}(макс. {(maxSize / (1024 * 1024)).toFixed(0)} МБ)
                            </p>
                        </>
                    ) : (
                        <div className="drop-active">
                            <p>Выбрано файлов: <strong>{files.length}</strong></p>
                            <p className="drop-hint">Нажмите, чтобы добавить ещё</p>
                        </div>
                    )}
                </div>

                {/* Ошибки валидации */}
                {validationErrors.length > 0 && (
                    <div className="validation-errors">
                        {validationErrors.map((err, idx) => (
                            <div key={idx} className="error-item">⚠️ {err}</div>
                        ))}
                        <button className="btn-close-errors" onClick={() => setValidationErrors([])}>
                            ✕
                        </button>
                    </div>
                )}

                {/* Список файлов */}
                {files.length > 0 && (
                    <div className="file-list">
                        {files.map((file, index) => (
                            <div key={index} className="file-item">
                                <div className="file-info">
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">{formatSize(file.size)}</span>
                                </div>
                                {!isUploading && !uploadComplete && (
                                    <button className="remove-btn" onClick={() => removeFile(index)} title="Удалить">
                                        ✕
                                    </button>
                                )}
                                {uploadComplete && <span className="file-status success">✅</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Прогресс */}
                {isUploading && (
                    <div className="progress-wrapper">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${uploadProgress}%`}}/>
                        </div>
                        <div className="progress-text">{uploadProgress}%</div>
                    </div>
                )}

                {/* Кнопки */}
                <div className="actions">
                    {!isUploading && !uploadComplete && files.length > 0 && (
                        <>
                            <button className="btn btn-primary" onClick={uploadFiles}>
                                Загрузить {files.length} файл(ов)
                            </button>
                            <button className="btn btn-secondary" onClick={clearFiles}>
                                Очистить
                            </button>
                        </>
                    )}
                    {isUploading && (
                        <button className="btn btn-danger" onClick={cancelUpload}>
                            Отменить загрузку
                        </button>
                    )}
                    {uploadComplete && (
                        <div className="success-message">
                            ✅ Все файлы успешно загружены!
                            <button className="btn btn-secondary" onClick={clearFiles}>
                                Загрузить новые
                            </button>
                        </div>
                    )}
                    {uploadError && (
                        <div className="error-message">
                            ⚠️ {uploadError}
                            <button className="btn btn-secondary" onClick={() => setUploadError(null)}>
                                Закрыть
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
;

export default FileUploader;