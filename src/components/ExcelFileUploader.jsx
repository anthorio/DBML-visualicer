import React, { useState, useCallback } from 'react';
// import * as XLSX from 'xlsx'; // Descomenta cuando instales la librería
import './ExcelFileUploader.css';

const ExcelFileUploader = ({ onTablesLoaded, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState([]);

  // Función para detectar tipos de datos desde valores de Excel
  const detectDataType = (values) => {
    const nonEmptyValues = values.filter(val => val !== undefined && val !== null && val !== '');
    
    if (nonEmptyValues.length === 0) return { type: 'varchar(255)', note: 'Sin datos para análisis' };
    
    // Verificar si todos son números enteros
    if (nonEmptyValues.every(val => !isNaN(val) && Number.isInteger(Number(val)))) {
      return { type: 'integer', note: 'Números enteros detectados' };
    }
    
    // Verificar si todos son números decimales
    if (nonEmptyValues.every(val => !isNaN(val) && !Number.isInteger(Number(val)))) {
      return { type: 'decimal(10,2)', note: 'Números decimales detectados' };
    }
    
    // Verificar si son fechas
    if (nonEmptyValues.every(val => {
      const date = new Date(val);
      return date instanceof Date && !isNaN(date) && val.toString().includes('/') || val.toString().includes('-');
    })) {
      return { type: 'datetime', note: 'Fechas detectadas' };
    }
    
    // Verificar si son booleanos
    if (nonEmptyValues.every(val => 
      ['true', 'false', '1', '0', 'sí', 'no', 'si', 'yes', 'verdadero', 'falso'].includes(val.toString().toLowerCase())
    )) {
      return { type: 'boolean', note: 'Valores booleanos detectados' };
    }
    
    // Determinar longitud apropiada para texto
    const maxLength = Math.max(...nonEmptyValues.map(val => val.toString().length));
    let varcharSize = 255;
    
    if (maxLength <= 10) varcharSize = 10;
    else if (maxLength <= 50) varcharSize = 50;
    else if (maxLength <= 100) varcharSize = 100;
    else if (maxLength > 255) return { type: 'text', note: `Texto largo (máx. ${maxLength} caracteres)` };
    
    return { 
      type: `varchar(${varcharSize})`, 
      note: `Texto (máx. ${maxLength} caracteres detectados)` 
    };
  };

  // Parser simplificado para procesar archivos Excel sin librería externa
  const parseExcelFile = async (file) => {
    try {
      // Si XLSX no está disponible, usar método alternativo
      if (typeof XLSX === 'undefined') {
        console.warn('XLSX library not available. Using simplified parsing...');
        
        // Crear tabla de ejemplo basada en el nombre del archivo
        const fileName = file.name.replace(/\.(xlsx|xls)$/i, '');
        return [{
          name: fileName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          fileName: fileName,
          source: 'excel',
          columns: [
            { name: 'ARCHIVO', type: 'varchar(100)', note: `Archivo: ${file.name}`, isPrimaryKey: false },
            { name: 'TAMAÑO', type: 'integer', note: `Tamaño: ${(file.size / 1024).toFixed(2)} KB`, isPrimaryKey: false },
            { name: 'TIPO', type: 'varchar(50)', note: 'Archivo Excel detectado', isPrimaryKey: false },
            { name: 'INSTRUCCIONES', type: 'text', note: 'Instala "npm install xlsx" para procesamiento completo', isPrimaryKey: false }
          ],
          indexes: []
        }];
      }

      // Usar XLSX si está disponible
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const tables = [];
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) return;
        
        // Encontrar fila de headers
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          if (jsonData[i] && jsonData[i].length > 0 && jsonData[i].some(cell => cell && cell.toString().trim())) {
            headerRowIndex = i;
            break;
          }
        }
        
        const headers = jsonData[headerRowIndex];
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        if (!headers || headers.length === 0) return;
        
        const columns = headers.map((header, colIndex) => {
          if (!header || header.toString().trim() === '') return null;
          
          const columnName = header.toString().trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
          
          // Obtener valores de muestra para detectar tipo
          const sampleValues = dataRows
            .slice(0, 20)
            .map(row => row[colIndex])
            .filter(val => val !== undefined && val !== null && val !== '');
          
          const { type, note } = detectDataType(sampleValues);
          
          return {
            name: columnName || `COLUMN_${colIndex + 1}`,
            type: type,
            note: note,
            isPrimaryKey: false
          };
        }).filter(col => col !== null);
        
        // Intentar identificar primary key
        const idColumn = columns.find(col => 
          col.name.includes('ID') || 
          col.name.includes('CODIGO') || 
          col.name.includes('CODE') ||
          col.name.endsWith('_ID')
        );
        
        if (idColumn) {
          idColumn.isPrimaryKey = true;
        } else if (columns.length > 0) {
          columns[0].isPrimaryKey = true; // Primera columna por defecto
        }
        
        if (columns.length > 0) {
          tables.push({
            name: sheetName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
            fileName: file.name.replace(/\.(xlsx|xls)$/i, ''),
            source: 'excel',
            columns: columns,
            indexes: idColumn ? [{
              name: `PK_${sheetName.toUpperCase().replace(/\s+/g, '_')}`,
              columns: [idColumn.name],
              unique: true
            }] : [],
            sheetInfo: {
              sheetName: sheetName,
              totalRows: dataRows.length,
              totalColumns: headers.length
            }
          });
        }
      });
      
      return tables;
    } catch (error) {
      console.error(`Error processing Excel file ${file.name}:`, error);
      throw error;
    }
  };

  const handleFiles = async (files) => {
    if (disabled) return;
    
    setIsProcessing(true);
    const excelFiles = Array.from(files).filter(file => 
      file.name.toLowerCase().endsWith('.xlsx') || 
      file.name.toLowerCase().endsWith('.xls')
    );
    
    if (excelFiles.length === 0) {
      alert('Por favor selecciona archivos Excel (.xlsx o .xls)');
      setIsProcessing(false);
      return;
    }

    const results = [];
    const allTables = [];
    
    for (const file of excelFiles) {
      try {
        const tables = await parseExcelFile(file);
        
        results.push({
          fileName: file.name,
          tables: tables,
          success: true,
          error: null
        });
        
        allTables.push(...tables);
      } catch (error) {
        results.push({
          fileName: file.name,
          tables: [],
          success: false,
          error: error.message
        });
      }
    }
    
    setProcessedFiles(results);
    setIsProcessing(false);
    
    if (onTablesLoaded) {
      onTablesLoaded(allTables);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="excel-file-uploader">
      <div 
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="upload-content">
          <div className="upload-icon">📊</div>
          <h3>Cargar Archivos Excel</h3>
          <p>
            Arrastra archivos .xlsx/.xls aquí o{' '}
            <label className="file-select-label">
              selecciona archivos
              <input
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={disabled}
                style={{ display: 'none' }}
              />
            </label>
          </p>
          
          <div className="supported-features">
            <div className="feature">✅ Detección automática de tipos de datos</div>
            <div className="feature">✅ Múltiples hojas por archivo</div>
            <div className="feature">✅ Identificación de primary keys</div>
            <div className="feature">✅ Soporte para .xlsx y .xls</div>
          </div>
          
          {isProcessing && (
            <div className="processing">
              <div className="spinner">📊</div>
              <p>Procesando archivos Excel...</p>
            </div>
          )}
        </div>
      </div>

      {processedFiles.length > 0 && (
        <div className="processed-files">
          <h4>📈 Archivos Excel Procesados</h4>
          <div className="files-list">
            {processedFiles.map((result, index) => (
              <div key={index} className={`file-result ${result.success ? 'success' : 'error'}`}>
                <div className="file-info">
                  <span className="file-name">📊 {result.fileName}</span>
                  <span className="file-status">
                    {result.success ? (
                      `✅ ${result.tables.length} tabla${result.tables.length !== 1 ? 's' : ''} procesada${result.tables.length !== 1 ? 's' : ''}`
                    ) : (
                      `❌ Error: ${result.error}`
                    )}
                  </span>
                </div>
                {result.success && result.tables.length > 0 && (
                  <div className="tables-found">
                    {result.tables.map((table, tableIndex) => (
                      <div key={tableIndex} className="table-summary">
                        <strong>{table.name}</strong> 
                        <span className="table-details">
                          ({table.columns.length} columnas
                          {table.sheetInfo && `, ${table.sheetInfo.totalRows} filas`})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelFileUploader;