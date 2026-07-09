// import {UndoRedo} from "./stories/use-data-source.stories.tsx";
import '@glideapps/glide-data-grid/dist/index.css';
import FileUploader from "./FileUploader.tsx";

function App() {
    const handleSuccess = () => {
        console.log('Upload completed successfully!');
        // Можно сделать дополнительное действие, например, обновить таблицу
    };

    const handleError = (error: string) => {
        console.error('Upload failed:', error);
    };

    return (
        <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
            <FileUploader
                // accept=".xlsx,.xls"
                maxSize={1000 * 1024 * 1024}
                multiple={false}
                allowLocalPath={true}   // включаем режим указания пути
                onUploadSuccess={() => handleSuccess}
                onUploadError={(err) => handleError(err)}
            />
        </div>
    );
}

export default App;