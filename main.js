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
ipcMain.handle('fetch-cars', async () => {
  const url = "https://www.autoscout24.es/lst/tesla?atype=C&cy=E&damaged_listing=exclude&desc=0&powertype=kw&priceto=100000&search_id=1zjmj03vo4p&sort=mileage&source=homepage_search-mask&ustate=N%2CU";
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const cars = [];

    $('.ListItem_article__qyYw7').each((index, element) => {
      const title = $(element).find('.ListItem_title__ndA4s').text().trim();
      const price = $(element).find('.Price_price__APlgs').text().trim();
      cars.push({ title, price });
    });

    return cars;
  } catch (error) {
    console.error('Error fetching cars:', error);
    return [];
  }
});
