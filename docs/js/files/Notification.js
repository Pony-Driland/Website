class TinyNotification {
  constructor() {
    this.allowed = false;
    this.sound = new Audio("/audio/notification.ogg");
  }

  requestPerm() {
    const tinyThis = this;
    return new Promise((resolve, reject) => {
      if (tinyThis.isCompatible()) {
        if (Notification.permission === "default") {
          Notification.requestPermission()
            .then((permission) => {
              if (permission === "granted") {
                tinyThis.allowed = true;
                resolve(true);
              } else if (permission === "denied") {
                tinyThis.allowed = false;
                resolve(false);
              }
            })
            .catch(reject);
        } else {
          if (Notification.permission === "granted") {
            tinyThis.allowed = true;
            resolve(true);
          } else if (Notification.permission === "denied") {
            tinyThis.allowed = false;
            resolve(false);
          }
        }
      } else {
        tinyThis.allowed = false;
        resolve(false);
      }
    });
  }

  isCompatible() {
    if (!("Notification" in window)) return false;
    return true;
  }

  send(
    title = null,
    body = null,
    config = { icon: "/img/icon/192.png", vibrate: [200, 100, 200] },
  ) {
    if (this.allowed) {
      const options = {
        body: body.length < 100 ? body : `${body.substring(100)}...`,
        icon: config.icon,
        vibrate: config.vibrate,
      };
      const notification = new Notification(title, options);
      notification.onclick = function (event) {
        event.preventDefault();
        if (window.focus) window.focus();
        notification.close();
      };
    }
    this.sound.play().catch((err) => console.error(err));
  }
}

const tinyNotification = new TinyNotification();
