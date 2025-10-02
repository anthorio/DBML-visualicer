# DBML Visualizer

Un visualizador sencillo de esquemas de base de datos en formato DBML (Database Markup Language) construido con React y Vite.

## Características

- 🎨 **Visualización de Tablas**: Muestra las tablas y columnas de forma visual
- 📁 **Carga Automática**: Carga automáticamente todos los archivos .dbml de la carpeta `src/tablas/`
- 🔑 **Primary Keys**: Identifica y muestra las primary keys con emoji de llave
- 🖱️ **Tooltips Interactivos**: Muestra las descripciones al pasar el ratón
- 📊 **Índices**: Visualiza los índices de cada tabla
- 🎨 **Tipos de Datos Codificados por Color**: Diferentes colores para diferentes tipos de datos
- 📱 **Diseño Responsivo**: Funciona en dispositivos móviles y desktop

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd DBML\ visualicer
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre tu navegador en `http://localhost:5173/`

## Uso

### Añadir Tablas DBML
1. Coloca tus archivos `.dbml` en la carpeta `src/tablas/`
2. Reinicia el servidor de desarrollo con `npm run dev`
3. Las tablas se cargarán automáticamente al iniciar la aplicación

### Interactuar con las Tablas
- **Pasa el ratón** sobre cualquier columna para ver su descripción completa
- **Primary keys** se muestran con emoji de llave 🔑 y fondo destacado
- **Índices** se listan al final de cada tabla
- **Tipos de datos** están codificados por colores para fácil identificación

## Formato DBML Soportado

El visualizador soporta el siguiente formato básico de DBML:

```dbml
Table NOMBRE_TABLA {
  NOMBRE_COLUMNA tipo [note: "descripción"]
  OTRA_COLUMNA tipo [note: "otra descripción"]
  ...
}
```

### Ejemplo:
```dbml
Table DTCLMA {
  CLMACDDE integer [note: "Delegación"]
  CLMANPOL integer [note: "Núm. Póliza"]
  CLMACDCE integer [note: "Cód. Certificado"]
  CLMANUOR integer [note: "Núm. Orden"]
  CLMACDCL integer [note: "Cód. Cliente"]
  CLMAANIO char(4) [note: "Año"]
}
```

## Comandos Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la construcción de producción
- `npm run lint` - Ejecuta el linter ESLint

## Tecnologías Utilizadas

- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Herramienta de construcción y desarrollo
- **CSS3** - Estilos y animaciones
- **ESLint** - Linting de código

## Estructura del Proyecto

```
src/
├── components/
│   ├── TableVisualizer.jsx # Componente de visualización
│   └── TableVisualizer.css # Estilos del visualizador
├── services/
│   └── dbmlLoader.js       # Servicio para cargar archivos DBML
├── tablas/                 # Carpeta con archivos .dbml
│   └── DTDOBA.dbml        # Ejemplo de tabla
├── App.jsx                 # Componente principal
├── App.css                 # Estilos principales
├── main.jsx               # Punto de entrada
└── index.css              # Estilos globales
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu característica (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para detalles.