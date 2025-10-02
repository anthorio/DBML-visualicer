import React, { useState, useEffect } from 'react';
import './App.css';
import TableVisualizer from './components/TableVisualizer';
import { loadAllTables } from './services/dbmlLoader';

function App() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todas las tablas al iniciar la aplicación
  useEffect(() => {
    const loadTables = async () => {
      try {
        const allTables = await loadAllTables();
        setTables(allTables);
      } catch (error) {
        console.error('Error loading tables:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>DBML Visualizer</h1>
        <p>Visualizador de esquemas de base de datos DBML</p>
      </header>
      
      <main>
        {loading ? (
          <div className="loading">
            <p>Cargando tablas...</p>
          </div>
        ) : (
          <TableVisualizer tables={tables} />
        )}
      </main>
    </div>
  );
}

export default App;