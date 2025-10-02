// Función para importar automáticamente todos los archivos .dbml de la carpeta tablas
const importAllDbmlFiles = () => {
  // Usar Vite's import.meta.glob para importar archivos dinámicamente
  const modules = import.meta.glob('../../tablas/*.dbml', { 
    eager: true, 
    query: '?raw',
    import: 'default'
  });
  
  return modules;
};

// Parser mejorado que soporta primary keys e indexes
export const parseDBML = (text) => {
  const tables = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
  
  let currentTable = null;
  let inTable = false;
  let inIndexes = false;
  let currentIndexes = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar inicio de tabla (soporta Table y TABLE, case insensitive)
    const tableMatch = line.match(/^(table|TABLE)\s+(\w+)\s*\{/i);
    if (tableMatch) {
      const tableName = tableMatch[2];
      currentTable = {
        name: tableName,
        columns: [],
        indexes: []
      };
      inTable = true;
      inIndexes = false;
      continue;
    }
    
    // Detectar inicio de sección Indexes (case insensitive) - puede estar dentro o fuera de la tabla
    if (line.match(/^indexes\s*\{/i)) {
      inIndexes = true;
      currentIndexes = [];
      continue;
    }
    
    // Detectar fin de tabla o indexes
    if (line === '}') {
      if (inIndexes && !inTable) {
        // Fin de sección de índices fuera de tabla
        inIndexes = false;
        continue;
      } else if (inIndexes && inTable) {
        // Fin de sección de índices dentro de tabla
        if (currentTable) {
          currentTable.indexes = currentIndexes;
          // Marcar primary keys basado en el primer índice único
          const primaryIndex = currentIndexes.find(idx => idx.unique) || currentIndexes[0];
          if (primaryIndex && primaryIndex.columns) {
            currentTable.columns.forEach(column => {
              if (primaryIndex.columns.includes(column.name)) {
                column.isPrimaryKey = true;
              }
            });
          }
        }
        inIndexes = false;
        continue;
      } else if (inTable && currentTable) {
        // Fin de tabla
        // Si no se procesaron índices internos, procesar índices externos
        if (currentIndexes.length > 0 && (!currentTable.indexes || currentTable.indexes.length === 0)) {
          currentTable.indexes = currentIndexes;
          const primaryIndex = currentIndexes.find(idx => idx.unique) || currentIndexes[0];
          if (primaryIndex && primaryIndex.columns) {
            currentTable.columns.forEach(column => {
              if (primaryIndex.columns.includes(column.name)) {
                column.isPrimaryKey = true;
              }
            });
          }
        }
        tables.push(currentTable);
        currentTable = null;
        inTable = false;
        continue;
      }
    }
    
    // Parsear columnas dentro de la tabla
    if (inTable && currentTable) {
      // Formato: COLUMN_NAME type [NOTE: 'description', NOT NULL] o [note: "description"]
      const columnMatch = line.match(/^(\w+)\s+(\w+(?:\(\d+\))?)\s*(?:\[(?:note|NOTE):\s*['"]([^'"]+)['"](?:,\s*(?:NOT NULL|not null))?\])?/i);
      if (columnMatch) {
        const [, name, type, note] = columnMatch;
        currentTable.columns.push({
          name,
          type,
          note: note || '',
          isPrimaryKey: false
        });
      }
    }
    
    // Parsear índices
    if (inIndexes) {
      // Ignorar comentarios
      if (line.startsWith('//')) {
        continue;
      }
      
      // Formato: index_name (column1, column2, ...) o (column1, column2) [UNIQUE]
      const indexMatch = line.match(/^(?:(\w+)\s+)?\(([^)]+)\)(?:\s*\[(\w+)\])?/);
      if (indexMatch) {
        const [, indexName, columnsStr, modifier] = indexMatch;
        const columns = columnsStr.split(',').map(col => col.trim());
        currentIndexes.push({
          name: indexName || `index_${currentIndexes.length + 1}`,
          columns,
          unique: modifier === 'UNIQUE'
        });
      }
    }
  }
  
  return tables;
};

// Función para cargar todas las tablas de la carpeta tablas
export const loadAllTables = async () => {
  try {
    const modules = importAllDbmlFiles();
    const allTables = [];
    
    for (const [path, content] of Object.entries(modules)) {
      const fileName = path.split('/').pop().replace('.dbml', '');
      const parsedTables = parseDBML(content);
      
      // Añadir información del archivo a cada tabla
      parsedTables.forEach(table => {
        table.fileName = fileName;
      });
      
      allTables.push(...parsedTables);
    }
    
    return allTables;
  } catch (error) {
    console.error('Error loading DBML files:', error);
    return [];
  }
};