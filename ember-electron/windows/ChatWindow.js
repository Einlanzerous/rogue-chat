const { BrowserWindow } = require('electron');
const { EventEmitter } = require('events');

module.exports = class ChatWindow extends EventEmitter {
    constructor(opts = {}) {
        super(...arguments);
        this.opts = opts;
        this.window = new BrowserWindow({
            width: 1000,
            height: 500,
            webPreferences: {
                webSecurity: false
            }
        });
        this.registerListeners();
    }

    registerListeners() {
        const { realtime } = this.opts;
        const { webContents } = this.window;

        //TODO: Should not subscribe to events until browser ask for them
        realtime.bindToEvent('message', '*', (messageEvent) => {
           webContents.send('message', messageEvent);
        });
    }

    sendEvent(event, message) {
        this.window.webContents.send(event, message);
    }

    show() {
        const { accessToken } = this.opts;
        this.window.loadURL(`serve://dist/chat?token=${accessToken}`);
        this.window.show();
    }

    close() {
        this.window.destroy();
    }
};
