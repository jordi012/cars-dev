const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const axios = require('axios')

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
ipcMain.handle('fetch-products', async () => {
  const url = "https://fakestoreapi.com/products"
  try {
    const response = await axios.get(url)
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(`Error: ${response.status}`)
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
})
