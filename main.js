const { app, BrowserWindow, ipcMain } = require('electron')
const axios = require('axios')
const cheerio = require('cheerio')

let mainWindow

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

// Handle API request from renderer process
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
