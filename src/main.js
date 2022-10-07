const {
		app,
		BrowserWindow,
		Tray,
		Menu,
		shell
	} = require('electron'),
	path = require('path'),
	fs = require('fs-extra'),
	StartupHandler = require('./utils/startup_handler'),
	ListenHandler = require('./utils/listen_handler'),
	SYSTRAY_ICON = path.join(__dirname, '/assets/system-tray-icon.png'),
	home_dir = app.getPath('home'),
	custom_dir = path.join(home_dir, '/GChvibes')

var win, tray = null
global.app_version = app.getVersion()
global.custom_dir = custom_dir
fs.ensureDirSync(custom_dir)

function createWindow(show = true) {
	win = new BrowserWindow({
		width: 400,
		height: 600,
		webSecurity: false,
		resizable: false,
		minimizable: false,
		fullscreenable: false,
		webPreferences: {
			preload: path.join(__dirname, 'app.js'),
			contextIsolation: false,
			nodeIntegration: true
		}, show
	})
	win.removeMenu()
	win.loadFile('./src/app.html')
	// Open the DevTools.
	//win.openDevTools()
	//win.webContents.openDevTools()

	win.on('closed', function () { win = null })
	win.on('minimize', function (event) {
		if (process.platform === 'darwin') { app.dock.hide() }
		event.preventDefault()
		win.hide()
	})
	win.on('close', function (event) {
		if (!app.isQuiting) {
			if (process.platform === 'darwin') { app.dock.hide() }
			event.preventDefault()
			win.hide()
		}
		return false
	})
  return win
}

const gotTheLock = app.requestSingleInstanceLock()
app.on('second-instance', () => {
  if (win) {
    win.show()
    win.focus()
  }
})
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', () => {
		if (win) {
			if (win.isMinimized()) { win.restore() }
			win.show()
			win.focus()
		}
	})
	app.on('ready', () => {
		win = createWindow(true);
		tray = new Tray(SYSTRAY_ICON);
		tray.setToolTip('GChvibes')
		const startup_handler = new StartupHandler(app),
				listen_handler = new ListenHandler(app),
				contextMenu = Menu.buildFromTemplate([
			{
				label: 'Editor',
				click: function () { openEditorWindow() },
			},
			{
				label: 'Custom Folder',
				click: function () { shell.openItem(custom_dir) },
			},
			{
				label: 'Mute',
				type: 'checkbox',
				checked: listen_handler.is_muted,
				click: function () {
					listen_handler.toggle()
					win.webContents.send('muted', listen_handler.is_muted)
				},
			},
			{
				label: 'Enable at Startup',
				type: 'checkbox',
				checked: startup_handler.is_enabled,
				click: function () { startup_handler.toggle() },
			},
			{
				label: 'Quit',
				click: function () {
					app.isQuiting = true
					app.quit()
				},
			},
		])
		tray.on('click', () => { win.show() })
		tray.setContextMenu(contextMenu)
		if (process.platform == 'darwin') {
				const { powerMonitor } = require('electron')
				powerMonitor.on('shutdown', () => { app.quit() })
			}
		})
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit() })
app.on('activate', function () { if (win === null) createWindow() })
app.on('quit', () => { app.quit() })

var editor_window = null
function openEditorWindow() {
	if (editor_window) {
		editor_window.focus()
		return
	}
	editor_window = new BrowserWindow({
	  width: 1200,
	  height: 600,
	  resizable: false,
	  minimizable: false,
	  fullscreenable: false,
	  modal: true,
	  // parent: win,
	  webPreferences: {
	    // preload: path.join(__dirname, 'editor.js'),
	    nodeIntegration: true
	  }
	})
	// editor_window.openDevTools()
	editor_window.loadFile('./src/editor.html')
	editor_window.on('closed', function () { editor_window = null })
}