// import {UndoRedo} from "./stories/use-data-source.stories.tsx";
import '@glideapps/glide-data-grid/dist/index.css';
import {TableGrid} from "./TableGridComponent.tsx";
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
                accept=".xlsx,.xls"
                maxSize={10 * 1024 * 1024}
                multiple={false}
                uploadUrl="http://localhost:5295/api/upload"
                allowLocalPath={true}   // включаем режим указания пути
                onUploadSuccess={() => console.log('Успешно!')}
                onUploadError={(err) => console.error('Ошибка:', err)}
            />
        </div>
    );
}

export default App;