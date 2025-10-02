import React, { useState, useEffect } from 'react';
import './App.css';
import TableVisualizer from './components/TableVisualizer';
import DataSourceSwitch from './components/DataSourceSwitch';
import { loadTablesBySource, DATA_SOURCES } from './services/dataSourceManager';

function App() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSource, setCurrentSource] = useState(DATA_SOURCES.TXT); // Cambiamos a TXT por defecto

  // Cargar tablas según la fuente seleccionada
  const loadTables = async (source = currentSource) => {
    setLoading(true);
    try {
      const allTables = await loadTablesBySource(source);
      setTables(allTables);
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar tablas al iniciar la aplicación
  useEffect(() => {
    loadTables();
  }, []);

  // Manejar cambio de fuente de datos
  const handleSourceChange = async (newSource) => {
    setCurrentSource(newSource);
    await loadTables(newSource);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>DBML Visualizer</h1>
        <p>Visualizador de esquemas de base de datos DBML, TXT y documentos Word</p>
      </header>
      
      <main>
        <DataSourceSwitch 
          currentSource={currentSource}
          onSourceChange={handleSourceChange}
          disabled={loading}
        />
        
        {loading ? (
          <div className="loading">
            <p>
              Cargando tablas desde {currentSource === DATA_SOURCES.DBML ? 'archivos DBML' : 'archivos TXT'}...
            </p>
            <div className="loading-spinner">⏳</div>
          </div>
        ) : tables.length > 0 ? (
          <TableVisualizer tables={tables} />
        ) : (
          <div className="no-tables">
            <p>
              No se encontraron tablas en la fuente seleccionada.
            </p>
            <p>
              {currentSource === DATA_SOURCES.DBML 
                ? 'Asegúrate de tener archivos .dbml en la carpeta "tablas/"' 
                : 'Asegúrate de tener archivos .txt en la carpeta "table_docs/"'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;