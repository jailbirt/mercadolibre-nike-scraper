# MercadoLibre Nike Scraper

Este proyecto es un script de Puppeteer para buscar zapatillas Nike baratas en MercadoLibre y extraer información relevante como precios, vendedores, envío gratis y demás características.

## Características

- 🔍 Busca zapatillas Nike en MercadoLibre con filtros de precio
- 📊 Extrae información detallada de los productos
- 📝 Genera reportes en múltiples formatos (CSV, JSON, HTML)
- 📸 Toma capturas de pantalla durante la ejecución (opcional)
- ⚙️ Configurable mediante variables de entorno

## Requisitos previos

- Node.js (v14 o superior)
- npm o yarn

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/jailbirt/mercadolibre-nike-scraper.git
   cd mercadolibre-nike-scraper
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o si usas yarn
   yarn install
   ```

3. Crea un archivo `.env` basado en el archivo `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edita el archivo `.env` según tus necesidades.

## Configuración

Puedes configurar el comportamiento del script mediante las siguientes variables de entorno en el archivo `.env`:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| COUNTRY_CODE | Código de país de MercadoLibre (mla=Argentina, mlm=México, etc.) | mla |
| SEARCH_TERM | Término de búsqueda | zapatillas nike |
| MAX_RESULTS | Número máximo de resultados a mostrar | 50 |
| PRICE_MIN | Precio mínimo | 0 |
| PRICE_MAX | Precio máximo | 50000 |
| HEADLESS | Ejecución sin interfaz gráfica | true |
| SAVE_SCREENSHOTS | Guardar capturas de pantalla | true |
| SCREENSHOTS_DIR | Directorio para las capturas | ./screenshots |
| OUTPUT_DIR | Directorio para los archivos de salida | ./output |
| OUTPUT_FILENAME | Nombre base para los archivos de salida | nike_zapatillas |

## Uso

Ejecuta el script con:

```bash
npm start
# o si usas yarn
yarn start
```

## Resultados

El script generará los siguientes archivos en el directorio especificado (`OUTPUT_DIR`):

- **CSV**: Lista de productos en formato CSV (`nike_zapatillas.csv`)
- **JSON**: Datos completos en formato JSON (`nike_zapatillas.json`)
- **HTML**: Reporte visual con imágenes y detalles de productos (`nike_zapatillas.html`)

Además, si está habilitado, se guardarán capturas de pantalla durante el proceso en la carpeta `SCREENSHOTS_DIR`.

## Funcionamiento

El script realiza las siguientes acciones:

1. Navega a la página principal de MercadoLibre del país configurado
2. Busca el término especificado ("zapatillas nike" por defecto)
3. Aplica filtros de precio si están configurados
4. Extrae información de los productos (título, precio, vendedor, envío, etc.)
5. Navega por las páginas de resultados hasta alcanzar el límite configurado
6. Ordena los resultados por precio (de menor a mayor)
7. Genera archivos CSV, JSON y HTML con los resultados

## Uso para QA

Este script está diseñado para ser utilizado en procesos de QA para probar:

- Rendimiento del sitio web de MercadoLibre
- Consistencia de datos de productos 
- Navegación y filtrado en la plataforma
- Extracción de datos estructurados
- Generación de reportes automatizados

## Solución de problemas

Si encuentras problemas al ejecutar el script:

1. Verifica que las dependencias estén instaladas correctamente
2. Comprueba tu conexión a internet
3. Revisa las variables de entorno en el archivo `.env`
4. Consulta las capturas de pantalla en la carpeta de screenshots para identificar problemas visuales

## Licencia

MIT