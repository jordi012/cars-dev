const { app, BrowserWindow, ipcMain } = require('electron')
const axios = require('axios')
const cheerio = require('cheerio')

let mainWindow
let carMakeMappings = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Fetch and cache car make mappings
async function fetchCarMakeMappings() {
  if (carMakeMappings) return carMakeMappings;

  try {
    const response = await axios.get('https://web.gw.coches.net/makes?categoryId=2500');
    carMakeMappings = response.data.items.reduce((acc, item) => {
      acc[item.label.toLowerCase()] = item.id;
      return acc;
    }, {});
    return carMakeMappings;
  } catch (error) {
    console.error('Error fetching car make mappings:', error);
    return {};
  }
}

// Handle API request for AutoScout24
ipcMain.handle('fetch-cars', async (event, query, page) => {
  const baseUrl = "https://www.autoscout24.es";
  const fullUrl = `${baseUrl}${query}&page=${page}`;
  try {
    const response = await axios.get(fullUrl);
    const $ = cheerio.load(response.data);
    const cars = [];

    $('.ListItem_article__qyYw7').each((index, element) => {
      const title = $(element).find('.ListItem_title__ndA4s').text().trim();
      const price = $(element).find('.Price_price__APlgs').text().trim();
      let carUrl = $(element).find('a').attr('href');
      if (carUrl && !carUrl.startsWith('http')) {
        carUrl = baseUrl + carUrl;
      }
      cars.push({ title, price, url: carUrl });
    });

    // Extract total pages from pagination
    const totalPagesElement = $('.pagination-item--page-indicator span').text();
    const totalPages = parseInt(totalPagesElement.split('/')[1].trim()) || 1;

    return { cars, totalPages, currentPage: page };
  } catch (error) {
    console.error('Error fetching cars:', error);
    return { cars: [], totalPages: 0, currentPage: page };
  }
});

// Handle API request for Coches.net
ipcMain.handle('fetch-cars-coches', async (event, carMake, minPrice, maxPrice, page) => {
  const mappings = await fetchCarMakeMappings();
  const makeId = mappings[carMake.toLowerCase()] || 0;

  const baseUrl = "https://www.coches.net";
  const searchUrl = `${baseUrl}/search/`;
  const fullUrl = `${searchUrl}?MinPrice=${minPrice}&MaxPrice=${maxPrice}&MakeIds%5B0%5D=${makeId}&ModelIds%5B0%5D=0&fi=Price&or=1&pg=${page}`;

  try {
    const response = await axios.get(fullUrl);
    const $ = cheerio.load(response.data);
    const cars = [];

    $('.mt-CardAd').each((index, element) => {
      const title = $(element).find('.mt-CardBasic-title').text().trim();
      const price = $(element).find('.mt-CardAdPrice-cashAmount .mt-TitleBasic-title').text().trim();
      let url = $(element).find('a.mt-CardBasic-titleLink').attr('href');
      
      // Ensure the URL is complete
      if (url && !url.startsWith('http')) {
        url = baseUrl + url;
      }
      
      // Only add cars with non-empty titles
      if (title) {
        cars.push({ title, price, url });
      }
    });

    // Extract total pages from pagination
    const totalPages = $('.sui-MoleculePagination-item').length > 0 
      ? parseInt($('.sui-MoleculePagination-item:last-child').prev().text().trim())
      : 1;

    console.log(`Fetched ${cars.length} cars from page ${page}. Total pages: ${totalPages}`);

    return { cars, totalPages, currentPage: page };
  } catch (error) {
    console.error('Error fetching cars from Coches.net:', error);
    return { cars: [], totalPages: 0, currentPage: page };
  }
});
