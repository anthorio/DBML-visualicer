// Importar XLSX - necesitarás instalarlo con: npm install xlsx
// import * as XLSX from 'xlsx';

// Variable global para almacenar las tablas cargadas desde archivos Excel reales
let loadedExcelTables = [];

// Función para establecer las tablas cargadas desde archivos reales
export const setLoadedExcelTables = (tables) => {
  loadedExcelTables = tables;
};

// Parser para extraer información de tablas desde archivos Excel
export const parseExcelToDBML = async (file) => {
  try {
    // Verificar si XLSX está disponible
    if (typeof XLSX === 'undefined') {
      console.warn('XLSX library not installed. Install with: npm install xlsx');
      return [];
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const tables = [];
    
    // Procesar cada hoja del Excel
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) return;
      
      // Buscar la primera fila con datos (headers)
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i] && jsonData[i].length > 0 && jsonData[i].some(cell => cell && cell.toString().trim())) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) return;
      
      const headers = jsonData[headerRowIndex];
      const dataRows = jsonData.slice(headerRowIndex + 1);
      
      // Determinar tipos de datos basados en el contenido
      const columns = headers.map((header, colIndex) => {
        if (!header || header.toString().trim() === '') return null;
        
        const columnName = header.toString().trim().toUpperCase().replace(/\s+/g, '_');
        
        // Analizar los primeros valores para determinar el tipo
        const sampleValues = dataRows
          .slice(0, 10) // Tomar primeras 10 filas
          .map(row => row[colIndex])
          .filter(val => val !== undefined && val !== null && val !== '');
        
        let dataType = 'varchar(255)'; // tipo por defecto
        let note = '';
        
        if (sampleValues.length > 0) {
          const firstValue = sampleValues[0];
          
          // Determinar tipo basado en el contenido
          if (sampleValues.every(val => !isNaN(val) && Number.isInteger(Number(val)))) {
            dataType = 'integer';
            note = 'Valor numérico entero';
          } else if (sampleValues.every(val => !isNaN(val))) {
            dataType = 'decimal(10,2)';
            note = 'Valor numérico decimal';
          } else if (sampleValues.every(val => {
            const dateVal = new Date(val);
            return dateVal instanceof Date && !isNaN(dateVal);
          })) {
            dataType = 'datetime';
            note = 'Fecha y hora';
          } else if (sampleValues.every(val => ['true', 'false', '1', '0', 'sí', 'no', 'si', 'yes'].includes(val.toString().toLowerCase()))) {
            dataType = 'boolean';
            note = 'Valor booleano';
          } else {
            // Determinar longitud apropiada para varchar
            const maxLength = Math.max(...sampleValues.map(val => val.toString().length));
            if (maxLength <= 10) dataType = 'varchar(10)';
            else if (maxLength <= 50) dataType = 'varchar(50)';
            else if (maxLength <= 100) dataType = 'varchar(100)';
            else if (maxLength <= 255) dataType = 'varchar(255)';
            else dataType = 'text';
            
            note = `Texto (máx. ${maxLength} caracteres detectados)`;
          }
        }
        
        return {
          name: columnName,
          type: dataType,
          note: note || `Columna ${colIndex + 1} de la hoja ${sheetName}`,
          isPrimaryKey: false
        };
      }).filter(col => col !== null);
      
      if (columns.length > 0) {
        // Intentar determinar primary key (primera columna que parezca ID)
        const possiblePKColumn = columns.find(col => 
          col.name.includes('ID') || 
          col.name.includes('CODIGO') || 
          col.name.includes('CODE') ||
          col.name === headers[0]?.toString().trim().toUpperCase().replace(/\s+/g, '_')
        );
        
        if (possiblePKColumn) {
          possiblePKColumn.isPrimaryKey = true;
        }
        
        tables.push({
          name: sheetName.toUpperCase().replace(/\s+/g, '_'),
          fileName: file.name.replace(/\.(xlsx|xls)$/i, ''),
          source: 'excel',
          columns: columns,
          indexes: possiblePKColumn ? [{
            name: `PK_${sheetName.toUpperCase().replace(/\s+/g, '_')}`,
            columns: [possiblePKColumn.name],
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
    console.error('Error parsing Excel file:', error);
    return [];
  }
};

// Función alternativa usando FileReader para navegadores que no soporten arrayBuffer
export const parseExcelWithFileReader = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (typeof XLSX === 'undefined') {
          console.warn('XLSX library not installed. Install with: npm install xlsx');
          resolve([]);
          return;
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const tables = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) return; // Necesitamos al menos header + 1 fila
          
          const headers = jsonData[0];
          const columns = headers.map((header, index) => ({
            name: header?.toString().toUpperCase().replace(/\s+/g, '_') || `COLUMN_${index + 1}`,
            type: 'varchar(255)', // Tipo genérico
            note: `Columna extraída de Excel - Hoja: ${sheetName}`,
            isPrimaryKey: index === 0 // Primera columna como PK por defecto
          }));
          
          tables.push({
            name: sheetName.toUpperCase().replace(/\s+/g, '_'),
            fileName: file.name.replace(/\.(xlsx|xls)$/i, ''),
            source: 'excel',
            columns: columns,
            indexes: [{
              name: `PK_${sheetName.toUpperCase().replace(/\s+/g, '_')}`,
              columns: [columns[0].name],
              unique: true
            }]
          });
        });
        
        resolve(tables);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

// Función para cargar todas las tablas desde archivos Excel
export const loadAllExcelTables = async () => {
  try {
    // Si hay tablas cargadas desde archivos reales, usarlas
    if (loadedExcelTables.length > 0) {
      return loadedExcelTables;
    }
    
    // Sino, mostrar mensaje informativo
    const exampleExcelTables = [
      {
        name: 'INSTRUCCIONES_EXCEL',
        fileName: 'info',
        source: 'excel',
        columns: [
          { name: 'MENSAJE', type: 'text', note: 'Para ver tablas reales, usa el botón "Cargar Archivos Excel" de abajo', isPrimaryKey: false },
          { name: 'FORMATOS_SOPORTADOS', type: 'text', note: 'Archivos .xlsx y .xls (Excel 2007+ y versiones anteriores)', isPrimaryKey: false },
          { name: 'COMO_USAR', type: 'text', note: 'Arrastra o selecciona archivos Excel para procesarlos automáticamente', isPrimaryKey: false },
          { name: 'DETECCION_TIPOS', type: 'text', note: 'Los tipos de datos se detectan automáticamente basados en el contenido', isPrimaryKey: false }
        ],
        indexes: []
      },
      {
        name: 'EJEMPLO_VENTAS',
        fileName: 'ejemplo-excel',
        source: 'excel',
        columns: [
          { name: 'ID_VENTA', type: 'integer', note: 'Identificador único de la venta', isPrimaryKey: true },
          { name: 'FECHA_VENTA', type: 'datetime', note: 'Fecha de la venta', isPrimaryKey: false },
          { name: 'CLIENTE', type: 'varchar(100)', note: 'Nombre del cliente', isPrimaryKey: false },
          { name: 'PRODUCTO', type: 'varchar(80)', note: 'Nombre del producto', isPrimaryKey: false },
          { name: 'CANTIDAD', type: 'integer', note: 'Cantidad vendida', isPrimaryKey: false },
          { name: 'PRECIO_UNITARIO', type: 'decimal(10,2)', note: 'Precio por unidad', isPrimaryKey: false },
          { name: 'TOTAL_VENTA', type: 'decimal(12,2)', note: 'Total de la venta', isPrimaryKey: false },
          { name: 'VENDEDOR', type: 'varchar(60)', note: 'Nombre del vendedor', isPrimaryKey: false }
        ],
        indexes: [
          { name: 'IDX_FECHA', columns: ['FECHA_VENTA'], unique: false },
          { name: 'IDX_CLIENTE', columns: ['CLIENTE'], unique: false }
        ]
      }
    ];
    
    return exampleExcelTables;
  } catch (error) {
    console.error('Error loading Excel files:', error);
    return [];
  }
};