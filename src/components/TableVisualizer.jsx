import React, { useState, useEffect, useRef } from 'react';
import './TableVisualizer.css';

const TableVisualizer = ({ tables }) => {
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const containerRef = useRef(null);
  const [columns, setColumns] = useState([[], [], []]);

  const getTypeColor = (type) => {
    const typeColors = {
      'integer': '#4CAF50',
      'char': '#2196F3',
      'varchar': '#2196F3',
      'text': '#2196F3',
      'decimal': '#FF9800',
      'float': '#FF9800',
      'date': '#9C27B0',
      'datetime': '#9C27B0',
      'boolean': '#F44336',
      'bit': '#F44336'
    };
    
    const baseType = type.toLowerCase().split('(')[0];
    return typeColors[baseType] || '#607D8B';
  };

  const handleColumnHover = (tableIndex, columnIndex, column) => {
    if (column.note) {
      setHoveredColumn({
        tableIndex,
        columnIndex,
        note: column.note,
        columnName: column.name
      });
    }
  };

  const handleColumnLeave = () => {
    setHoveredColumn(null);
  };

  // Distribución de tablas en columnas balanceadas (responsive)
  useEffect(() => {
    if (tables.length === 0) return;
    
    const updateLayout = () => {
      const width = window.innerWidth;
      let numColumns = 3;
      
      if (width <= 768) {
        numColumns = 1;
      } else if (width <= 1200) {
        numColumns = 2;
      }
      
      const newColumns = Array.from({ length: numColumns }, () => []);
      const columnHeights = Array(numColumns).fill(0);
      
      tables.forEach((table, index) => {
        // Estimar altura de la tabla (header + columnas + índices)
        const estimatedHeight = 60 + (table.columns.length * 35) + (table.indexes?.length ? 50 + (table.indexes.length * 20) : 0);
        
        // Encontrar la columna con menor altura
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        
        // Añadir tabla a la columna más corta
        newColumns[shortestColumnIndex].push({...table, originalIndex: index});
        columnHeights[shortestColumnIndex] += estimatedHeight + 15; // +15 por margin
      });
      
      setColumns(newColumns);
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    
    return () => window.removeEventListener('resize', updateLayout);
  }, [tables]);

  return (
    <div className="table-visualizer">
      <h2>Visualización de Tablas ({tables.length} tablas encontradas)</h2>
      
      <div className="tables-layout">
        <div className="tables-container" ref={containerRef}>
          {columns.map((columnTables, columnIndex) => (
            <div key={columnIndex} className="table-column">
              {columnTables.map((table, tableIndex) => (
                <div key={table.originalIndex} className="table-card">
                  <div className="table-header">
                    <div className="table-title">
                      <h3 className="table-name">{table.name}</h3>
                      {table.fileName && (
                        <span className="file-name">📁 {table.fileName}.dbml</span>
                      )}
                    </div>
                    <span className="column-count">{table.columns.length}</span>
                  </div>
                  
                  <div className="table-body">
                    <div className="columns-list">
                      {table.columns.map((column, columnIndex) => (
                        <div 
                          key={columnIndex} 
                          className={`column-row ${column.isPrimaryKey ? 'primary-key' : ''}`}
                          onMouseEnter={() => handleColumnHover(table.originalIndex, columnIndex, column)}
                          onMouseLeave={handleColumnLeave}
                        >
                          <div className="column-info">
                            <span className="column-name">
                              {column.isPrimaryKey && <span className="key-icon">🔑</span>}
                              {column.name}
                            </span>
                            <span 
                              className="column-type"
                              style={{ backgroundColor: getTypeColor(column.type) }}
                            >
                              {column.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {table.indexes && table.indexes.length > 0 && (
                      <div className="indexes-section">
                        <h4>Índices:</h4>
                        {table.indexes.map((index, indexIndex) => (
                          <div key={indexIndex} className="index-item">
                            <strong>{index.name}:</strong> ({index.columns.join(', ')})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="note-panel">
          {hoveredColumn ? (
            <div className="note-content">
              <h4>📝 {hoveredColumn.columnName}</h4>
              <p>{hoveredColumn.note}</p>
            </div>
          ) : (
            <div className="note-placeholder">
              <p>Pasa el ratón sobre una columna para ver su descripción</p>
            </div>
          )}
        </div>
      </div>
      
      {tables.length === 0 && (
        <div className="no-tables">
          <p>No se encontraron tablas en la carpeta "tablas". Añade archivos .dbml a la carpeta tablas/ (en la raíz del proyecto) para visualizarlos.</p>
        </div>
      )}
    </div>
  );
};

export default TableVisualizer;