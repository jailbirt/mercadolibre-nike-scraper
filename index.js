const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();

// Configuraciones desde variables de entorno
const COUNTRY_CODE = process.env.COUNTRY_CODE || 'mla'; // mla = Argentina por defecto
const SEARCH_TERM = process.env.SEARCH_TERM || 'zapatillas nike';
const MAX_RESULTS = parseInt(process.env.MAX_RESULTS || '50');
const PRICE_MIN = process.env.PRICE_MIN || '0';
const PRICE_MAX = process.env.PRICE_MAX || '50000';
const HEADLESS = process.env.HEADLESS === 'true';
const SAVE_SCREENSHOTS = process.env.SAVE_SCREENSHOTS === 'true';
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || './screenshots';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const OUTPUT_FILENAME = process.env.OUTPUT_FILENAME || 'nike_zapatillas';

// Crear directorios necesarios
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (SAVE_SCREENSHOTS && !fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Función principal
async function scrapeMercadoLibre() {
  console.log('Iniciando búsqueda de zapatillas Nike en MercadoLibre...');
  console.log(`Término de búsqueda: ${SEARCH_TERM}`);
  console.log(`Límite de resultados: ${MAX_RESULTS}`);
  console.log(`Rango de precios: ${PRICE_MIN} - ${PRICE_MAX}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: null,
    args: ['--window-size=1366,768']
  });
  
  try {
    const page = await browser.newPage();
    
    // Interceptar requests para mejorar rendimiento
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navegar a MercadoLibre
    console.log('Navegando a MercadoLibre...');
    const baseUrl = `https://${COUNTRY_CODE}.mercadolibre.com`;
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    
    if (SAVE_SCREENSHOTS) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png') });
    }
    
    // Buscar el término
    console.log(`Buscando: "${SEARCH_TERM}"...`);
    await page.waitForSelector('.nav-search-input');
    await page.type('.nav-search-input', SEARCH_TERM);
    await page.click('.nav-search-btn');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    
    if (SAVE_SCREENSHOTS) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-search-results.png') });
    }
    
    // Aplicar filtros de precio si están disponibles
    if (PRICE_MIN !== '0' || PRICE_MAX !== '50000') {
      console.log(`Aplicando filtro de precio: ${PRICE_MIN} - ${PRICE_MAX}...`);
      try {
        // Intentar usar el filtro de precio directo por URL
        const currentUrl = page.url();
        const priceFilterUrl = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}price=${PRICE_MIN}-${PRICE_MAX}`;
        await page.goto(priceFilterUrl, { waitUntil: 'domcontentloaded' });
        
        if (SAVE_SCREENSHOTS) {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-price-filtered.png') });
        }
      } catch (error) {
        console.error('Error al aplicar filtro de precio:', error.message);
      }
    }
    
    // Extraer resultados
    console.log('Extrayendo resultados...');
    const products = [];
    let hasNextPage = true;
    let currentPage = 1;
    
    while (hasNextPage && products.length < MAX_RESULTS) {
      console.log(`Procesando página ${currentPage}...`);
      
      // Esperar a que carguen los productos
      await page.waitForSelector('.ui-search-layout .ui-search-layout__item');
      
      // Extraer datos de productos
      const pageProducts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.ui-search-layout .ui-search-layout__item')).map(el => {
          // Elementos básicos
          const titleElement = el.querySelector('.ui-search-item__title');
          const priceElement = el.querySelector('.price-tag-amount .price-tag-fraction');
          const priceDecimalElement = el.querySelector('.price-tag-amount .price-tag-cents');
          const urlElement = el.querySelector('.ui-search-link');
          const freeShippingElement = el.querySelector('.ui-search-item__shipping');
          
          // Imagen
          const imgElement = el.querySelector('.ui-search-result-image__element') || el.querySelector('.slick-slide.slick-active img');
          
          // Datos de vendedor
          const sellerElement = el.querySelector('.ui-search-official-store-label');
          
          // Información adicional
          const reviewsElement = el.querySelector('.ui-search-reviews__rating-number');
          
          // Construir objeto de producto
          const price = priceElement ? priceElement.textContent.trim() : 'No disponible';
          const cents = priceDecimalElement ? priceDecimalElement.textContent.trim() : '00';
          
          return {
            title: titleElement ? titleElement.textContent.trim() : 'Sin título',
            price: `${price}${cents !== '00' ? ',' + cents : ''}`,
            priceNumeric: parseFloat(`${price.replace(/\\./g, '').replace(/,/g, '.')}.${cents}`),
            url: urlElement ? urlElement.href : '',
            image: imgElement ? imgElement.src : '',
            freeShipping: !!freeShippingElement && freeShippingElement.textContent.includes('gratis'),
            seller: sellerElement ? sellerElement.textContent.trim() : 'Vendedor estándar',
            reviews: reviewsElement ? parseFloat(reviewsElement.textContent.trim()) : null
          };
        });
      });
      
      // Agregar productos a la lista total
      products.push(...pageProducts);
      console.log(`Encontrados ${pageProducts.length} productos en la página ${currentPage}.`);
      
      if (SAVE_SCREENSHOTS) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `page-${currentPage}.png`) });
      }
      
      // Buscar y hacer click en el botón de siguiente página si existe
      // y si no hemos alcanzado el límite de resultados
      if (products.length < MAX_RESULTS) {
        const nextButtonExists = await page.evaluate(() => {
          const nextButton = document.querySelector('.andes-pagination__button--next:not(.andes-pagination__button--disabled)');
          return !!nextButton;
        });
        
        if (nextButtonExists) {
          console.log('Navegando a la siguiente página...');
          await Promise.all([
            page.click('.andes-pagination__button--next'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
          ]);
          currentPage++;
        } else {
          hasNextPage = false;
          console.log('No hay más páginas disponibles.');
        }
      } else {
        hasNextPage = false;
        console.log(`Se alcanzó el límite de ${MAX_RESULTS} resultados.`);
      }
    }
    
    // Limitar a MAX_RESULTS si se excedió
    const finalProducts = products.slice(0, MAX_RESULTS);
    
    // Ordenar por precio (de menor a mayor)
    finalProducts.sort((a, b) => a.priceNumeric - b.priceNumeric);
    
    // Guardar resultados en CSV
    const csvFilePath = path.join(OUTPUT_DIR, `${OUTPUT_FILENAME}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        {id: 'title', title: 'Título'},
        {id: 'price', title: 'Precio'},
        {id: 'priceNumeric', title: 'Precio Numérico'},
        {id: 'url', title: 'URL'},
        {id: 'image', title: 'Imagen'},
        {id: 'freeShipping', title: 'Envío Gratis'},
        {id: 'seller', title: 'Vendedor'},
        {id: 'reviews', title: 'Calificación'}
      ]
    });
    
    await csvWriter.writeRecords(finalProducts);
    console.log(`Resultados guardados en: ${csvFilePath}`);
    
    // Guardar resultados en JSON
    const jsonFilePath = path.join(OUTPUT_DIR, `${OUTPUT_FILENAME}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(finalProducts, null, 2));
    console.log(`Resultados guardados en: ${jsonFilePath}`);
    
    // Generar informe HTML
    const htmlContent = generateHtmlReport(finalProducts);
    const htmlFilePath = path.join(OUTPUT_DIR, `${OUTPUT_FILENAME}.html`);
    fs.writeFileSync(htmlFilePath, htmlContent);
    console.log(`Informe HTML guardado en: ${htmlFilePath}`);
    
    return finalProducts;
  } catch (error) {
    console.error('Error durante el scraping:', error);
    
    // Guardar screenshot de error si está habilitado
    if (SAVE_SCREENSHOTS) {
      const page = (await browser.pages())[0];
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
      console.log('Screenshot de error guardado.');
    }
    
    throw error;
  } finally {
    await browser.close();
    console.log('Navegador cerrado.');
  }
}

// Función para generar un informe HTML
function generateHtmlReport(products) {
  const productsHtml = products.map(product => `
    <div class="product">
      <div class="image">
        <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/150'">
      </div>
      <div class="details">
        <h3><a href="${product.url}" target="_blank">${product.title}</a></h3>
        <p class="price">$${product.price}</p>
        <p class="seller">Vendedor: ${product.seller}</p>
        ${product.freeShipping ? '<p class="shipping">Envío gratis</p>' : ''}
        ${product.reviews ? `<p class="reviews">Calificación: ${product.reviews}/5</p>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zapatillas Nike en MercadoLibre</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f4f4f4;
        }
        h1 {
          color: #333;
          text-align: center;
          margin-bottom: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .product {
          display: flex;
          margin-bottom: 20px;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .image {
          flex: 0 0 150px;
          padding: 10px;
        }
        .image img {
          width: 100%;
          height: auto;
          max-height: 150px;
          object-fit: contain;
        }
        .details {
          flex: 1;
          padding: 15px;
        }
        h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        a {
          color: #0066c0;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .price {
          font-size: 18px;
          font-weight: bold;
          color: #B12704;
          margin: 5px 0;
        }
        .shipping {
          color: #067D62;
          font-weight: bold;
        }
        .seller, .reviews {
          color: #555;
          margin: 5px 0;
        }
        .summary {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Zapatillas Nike en MercadoLibre</h1>
        
        <div class="summary">
          <h2>Resumen</h2>
          <p>Búsqueda: "${SEARCH_TERM}"</p>
          <p>Rango de precios: $${PRICE_MIN} - $${PRICE_MAX}</p>
          <p>Total de productos encontrados: ${products.length}</p>
          <p>Precio promedio: $${(products.reduce((sum, product) => sum + product.priceNumeric, 0) / products.length).toFixed(2)}</p>
          <p>Precio mínimo: $${products.length > 0 ? products[0].price : 'N/A'}</p>
          <p>Precio máximo: $${products.length > 0 ? products[products.length - 1].price : 'N/A'}</p>
          <p>Productos con envío gratis: ${products.filter(p => p.freeShipping).length}</p>
        </div>
        
        <h2>Productos (ordenados por precio, de menor a mayor)</h2>
        ${productsHtml}
      </div>
    </body>
    </html>
  `;
}

// Ejecutar el script principal
(async () => {
  try {
    console.log('='.repeat(80));
    console.log('MERCADOLIBRE NIKE SCRAPER');
    console.log('='.repeat(80));
    console.log('Fecha y hora de ejecución:', new Date().toLocaleString());
    
    const startTime = Date.now();
    const products = await scrapeMercadoLibre();
    const endTime = Date.now();
    
    console.log('='.repeat(80));
    console.log(`Scraping completado con éxito. Se encontraron ${products.length} productos.`);
    console.log(`Tiempo total de ejecución: ${((endTime - startTime) / 1000).toFixed(2)} segundos.`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error en la ejecución principal:', error);
    process.exit(1);
  }
})();