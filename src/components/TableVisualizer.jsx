import React from 'react';
import './TableVisualizer.css';

const TableVisualizer = ({ tables }) => {
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

  return (
    <div className="table-visualizer">
      <h2>Visualización de Tablas ({tables.length} tablas encontradas)</h2>
      
      <div className="tables-container">
        {tables.map((table, index) => (
          <div key={index} className="table-card">
            <div className="table-header">
              <div className="table-title">
                <h3 className="table-name">{table.name}</h3>
                {table.fileName && (
                  <span className="file-name">📁 {table.fileName}.dbml</span>
                )}
              </div>
              <span className="column-count">{table.columns.length} columnas</span>
            </div>
            
            <div className="table-body">
              <div className="columns-list">
                {table.columns.map((column, columnIndex) => (
                  <div 
                    key={columnIndex} 
                    className={`column-row ${column.isPrimaryKey ? 'primary-key' : ''}`}
                    title={column.note || ''}
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
                    {column.note && (
                      <div className="column-note">
                        📝 {column.note}
                      </div>
                    )}
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
      
      {tables.length === 0 && (
        <div className="no-tables">
          <p>No se encontraron tablas en la carpeta "tablas". Añade archivos .dbml a la carpeta src/tablas/ para visualizarlos.</p>
        </div>
      )}
    </div>
  );
};

export default TableVisualizer;