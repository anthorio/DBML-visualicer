import React, { useState, useEffect } from 'react';
import { DATA_SOURCES, getSourceStats } from '../services/dataSourceManager.js';
import './DataSourceSwitch.css';

const DataSourceSwitch = ({ currentSource, onSourceChange, disabled = false }) => {
  const [stats, setStats] = useState({
    [DATA_SOURCES.DBML]: { count: 0, files: 0, totalColumns: 0 },
    [DATA_SOURCES.TXT]: { count: 0, files: 0, totalColumns: 0 }
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const sourceStats = await getSourceStats();
      setStats(sourceStats);
    } catch (error) {
      console.error('Error loading source stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSourceChange = (source) => {
    if (!disabled && onSourceChange) {
      onSourceChange(source);
    }
  };



  return (
    <div className="data-source-switch">
      <div className="switch-header">
        <h3>📁 Fuente de Datos</h3>
        {loading && <span className="loading-indicator">⏳</span>}
      </div>
      
      <div className="switch-options">
        <div 
          className={`switch-option ${currentSource === DATA_SOURCES.DBML ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => handleSourceChange(DATA_SOURCES.DBML)}
        >
          <div className="option-header">
            <span className="option-icon">📄</span>
            <span className="option-title">Archivos DBML</span>
            <span className="option-badge">tablas/</span>
          </div>
          <div className="option-stats">
            <span className="stat">
              <strong>{stats[DATA_SOURCES.DBML].count}</strong> tablas
            </span>
            <span className="stat">
              <strong>{stats[DATA_SOURCES.DBML].files}</strong> archivos
            </span>
            <span className="stat">
              <strong>{stats[DATA_SOURCES.DBML].totalColumns}</strong> columnas
            </span>
          </div>
        </div>



        <div 
          className={`switch-option ${currentSource === DATA_SOURCES.TXT ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => handleSourceChange(DATA_SOURCES.TXT)}
        >
          <div className="option-header">
            <span className="option-icon">📋</span>
            <span className="option-title">Archivos TXT</span>
            <span className="option-badge">table_docs/</span>
          </div>
          <div className="option-stats">
            <span className="stat">
              <strong>{stats[DATA_SOURCES.TXT].count}</strong> tablas
            </span>
            <span className="stat">
              <strong>{stats[DATA_SOURCES.TXT].files}</strong> archivos
            </span>
            <span className="stat">
              <strong>{stats[DATA_SOURCES.TXT].totalColumns}</strong> columnas
            </span>
          </div>
        </div>
      </div>

      <div className="switch-footer">
        <p className="current-source">
          Fuente actual: <strong>
            {currentSource === DATA_SOURCES.DBML ? 'Archivos DBML' : 'Archivos TXT'}
          </strong>
        </p>
      </div>


    </div>
  );
};

export default DataSourceSwitch;