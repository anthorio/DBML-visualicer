// Función para importar automáticamente todos los archivos .txt de la carpeta table_docs
const importAllTxtFiles = () => {
  // Usar Vite's import.meta.glob para importar archivos dinámicamente
  const modules = import.meta.glob('../../table_docs/*.txt', { 
    eager: true, 
    query: '?raw',
    import: 'default'
  });
  
  return modules;
};

// Función para convertir tipos del formato original a tipos estándar
const convertToStandardType = (tipo, ancho, precision) => {
  const tipoUpper = tipo?.toUpperCase() || '';
  
  switch (tipoUpper) {
    case 'N':
      if (precision && precision !== '0' && precision !== '') {
        return `decimal(${ancho},${precision})`;
      }
      return ancho <= 4 ? 'integer' : 'bigint';
    
    case 'VC':
    case 'VC2':
      return `varchar(${ancho})`;
    
    case 'C':
      return `char(${ancho})`;
    
    case 'D':
      return 'date';
    
    case 'T':
      return 'datetime';
    
    case 'B':
      return 'boolean';
    
    default:
      return ancho ? `varchar(${ancho})` : 'varchar(255)';
  }
};

// Parser mejorado que soporta el formato específico de archivos .txt
export const parseTxtToDBML = (text, fileName) => {
  const lines = text.split('\n').map(line => line.trim());
  const table = {
    name: '',
    description: '',
    columns: [],
    indexes: [],
    observations: '',
    relationships: [],
    fileName: fileName,
    source: 'txt'
  };
  
  let currentSection = 'header';
  let headerProcessed = false;
  let observationsMap = {}; // Para mapear números a observaciones
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Procesar nombre de la tabla
    if (line.startsWith('Nombre :') || line.startsWith('Nombre:')) {
      table.name = line.replace(/^Nombre\s*:\s*/, '').trim();
      continue;
    }
    
    // Procesar descripción
    if (line.startsWith('Descripción :') || line.startsWith('Descripción:')) {
      table.description = line.replace(/^Descripción\s*:\s*/, '').trim();
      continue;
    }
    
    // Detectar header de la tabla de columnas
    if (line.includes('Clave') && line.includes('Descripción de Campo') && line.includes('Nombre') && line.includes('Tipo')) {
      currentSection = 'columns';
      headerProcessed = true;
      continue;
    }
    
    // Detectar sección de índices
    if (line.startsWith('Índices:') || line === 'Índices') {
      currentSection = 'indexes';
      continue;
    }
    
    // Detectar sección de observaciones
    if (line.startsWith('Observaciones') || line === 'Observaciones') {
      currentSection = 'observations';
      continue;
    }
    
    // Detectar sección de relaciones
    if (line.includes('Relación de Códigos con otras tablas')) {
      currentSection = 'relationships';
      continue;
    }
    
    // Procesar según la sección actual
    if (currentSection === 'columns' && headerProcessed && line && !line.startsWith('Clave') && !line.includes('Descripción de Campo')) {
      // Parsear línea de columna usando tabs como separador principal
      const parts = line.split('\t');
      
      if (parts.length >= 4) {
        let clave, numero, descripcion, nombre, tipo, ancho, precision, nulo;
        
        // Detectar si la primera columna es una clave o un número
        const firstCol = (parts[0] || '').trim();
        const isKey = firstCol.toUpperCase() === 'K' || firstCol.startsWith('PK');
        
        if (isKey) {
          // Formato con clave: K | 1 | Descripción | Nombre | Tipo | Ancho | Prec | Nulo
          clave = parts[0].trim();
          numero = parts[1].trim();
          descripcion = parts[2].trim();
          nombre = parts[3].trim();
          tipo = parts[4].trim();
          ancho = parts[5] ? parts[5].trim() : '';
          precision = parts[6] ? parts[6].trim() : '';
          nulo = parts[7] ? parts[7].trim() : '';
        } else {
          // Formato sin clave: Número | Descripción | Nombre | Tipo | Ancho | Prec | Nulo
          clave = '';
          numero = parts[0].trim();
          descripcion = parts[1].trim();
          nombre = parts[2].trim();
          tipo = parts[3].trim();
          ancho = parts[4] ? parts[4].trim() : '';
          precision = parts[5] ? parts[5].trim() : '';
          nulo = parts[6] ? parts[6].trim() : '';
        }
        
        if (nombre && nombre.trim() && nombre !== 'Nombre' && nombre !== 'Campo') {
          const isPrimaryKey = isKey;
          const pkNumber = isPrimaryKey ? numero : '';
          
          // Solo usar asteriscos si hay una columna NULO explícita en el archivo
          // Verificar si hay datos en la columna 7 (posición del NULO)
          const hasNullColumn = parts.length > 7 && nulo && nulo.trim() !== '';
          let displayName = nombre;
          
          if (hasNullColumn) {
            // Solo poner asterisco si puede ser NULL (S)
            const isNullable = nulo.toUpperCase() === 'S';
            displayName = isNullable ? `*${nombre}` : nombre;
          }
          
          // Buscar referencias de observaciones en la descripción y expandirlas
          let expandedDescription = descripcion;
          const obsMatches = descripcion.match(/\((\d+)\)/g);
          if (obsMatches) {
            obsMatches.forEach(match => {
              const obsNumber = match.replace(/[()]/g, '');
              // Usaremos un placeholder temporal que reemplazaremos al final
              expandedDescription = expandedDescription.replace(match, `__OBS_${obsNumber}__`);
            });
          }

          table.columns.push({
            name: displayName,
            type: convertToStandardType(tipo, ancho, precision),
            note: expandedDescription,
            isPrimaryKey: isPrimaryKey,
            pkNumber: pkNumber,
            nullable: hasNullColumn ? (nulo.toUpperCase() === 'S') : undefined,
            originalType: tipo,
            width: ancho
          });
        }
      }
    } else if (currentSection === 'indexes' && line && !line.startsWith('Tipo') && line.includes('\t')) {
      // Parsear línea de índice
      const parts = line.split('\t').filter(part => part.trim() !== '');
      
      if (parts.length >= 3) {
        const tipo = parts[0] || '';
        const nombre = parts[1] || '';
        const campos = parts[2] || '';
        
        if (nombre.trim()) {
          table.indexes.push({
            name: nombre,
            columns: campos.split('+').map(col => col.trim()),
            unique: tipo.toUpperCase() === 'UNIQUE'
          });
        }
      }
    } else if (currentSection === 'observations' && line) {
      // Parsear observaciones numeradas - formato: (1) texto o (1): texto
      const obsMatch = line.match(/^\((\d+)\):?\s*(.+)/);
      if (obsMatch) {
        const obsNumber = obsMatch[1];
        let obsLines = [obsMatch[2]]; // Empezar con la primera línea
        
        // Buscar líneas adicionales de la misma observación (que empiecen con espacios/tabs)
        let j = i + 1;
        while (j < lines.length && lines[j].trim() && !lines[j].match(/^\((\d+)\)/) && lines[j].match(/^\s+/)) {
          obsLines.push(lines[j].trim());
          j++;
        }
        i = j - 1; // Ajustar el índice para no procesar las líneas ya procesadas
        
        // Crear una lista HTML bien estructurada
        if (obsLines.length === 1) {
          observationsMap[obsNumber] = obsLines[0];
        } else {
          const listItems = obsLines.map(line => `<li>${line}</li>`).join('');
          observationsMap[obsNumber] = `<ul>${listItems}</ul>`;
        }
      }
      
      // Acumular observaciones para mostrar
      if (table.observations) {
        table.observations += '\n' + line;
      } else {
        table.observations = line;
      }
    } else if (currentSection === 'relationships' && line && line.includes('\t')) {
      // Parsear línea de relación
      const parts = line.split('\t').filter(part => part.trim() !== '');
      
      if (parts.length >= 2) {
        const campo = parts[0] || '';
        const tabla = parts[1] || '';
        const campoRelacionado = parts[2] || '';
        const descripcion = parts[3] || '';
        
        if (campo.trim() && tabla.trim()) {
          table.relationships.push({
            field: campo,
            relatedTable: tabla,
            relatedField: campoRelacionado,
            description: descripcion
          });
        }
      }
    }
  }
  
  // Si no hay nombre de tabla, usar el nombre del archivo
  if (!table.name || table.name.trim() === '') {
    table.name = fileName;
  }
  
  // Expandir las observaciones en las descripciones de las columnas
  table.columns.forEach(column => {
    if (column.note && column.note.includes('__OBS_')) {
      let expandedNote = column.note;
      const obsPlaceholders = column.note.match(/__OBS_(\d+)__/g);
      if (obsPlaceholders) {
        obsPlaceholders.forEach(placeholder => {
          const obsNumber = placeholder.replace(/__OBS_|__/g, '');
          const obsText = observationsMap[obsNumber];
          if (obsText) {
            expandedNote = expandedNote.replace(placeholder, ` - ${obsText}`);
          } else {
            expandedNote = expandedNote.replace(placeholder, `(${obsNumber})`);
          }
        });
        column.note = expandedNote;
      }
    }
  });
  
  return table;
};

// Función para cargar todas las tablas de la carpeta table_docs
export const loadAllTxtTables = async () => {
  try {
    const modules = importAllTxtFiles();
    const allTables = [];
    
    for (const [path, content] of Object.entries(modules)) {
      const fileName = path.split('/').pop().replace('.txt', '');
      const parsedTable = parseTxtToDBML(content, fileName);
      
      // Solo agregar tablas que tengan columnas (el nombre ahora siempre se asigna)
      if (parsedTable.columns.length > 0) {
        allTables.push(parsedTable);
      }
    }
    
    return allTables;
  } catch (error) {
    console.error('Error loading TXT files:', error);
    return [];
  }
};