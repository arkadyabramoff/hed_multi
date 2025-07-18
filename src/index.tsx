import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { ThemeProvider } from "./theme";
import { store } from "./store";
import { Buffer } from "buffer";

import './global.css';

(window as any)._debugLogs = (window as any)._debugLogs || [];
function logToPage(msg: string) {
  (window as any)._debugLogs.push('[DEBUG] ' + msg);
  let el = document.getElementById('debug-log-box');
  if (!el) {
    el = document.createElement('div');
    el.id = 'debug-log-box';
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '100vw';
    el.style.zIndex = '99999';
    el.style.background = 'rgba(255,255,255,0.95)';
    el.style.color = 'red';
    el.style.fontSize = '16px';
    el.style.padding = '4px 8px';
    el.style.maxHeight = '40vh';
    el.style.overflowY = 'auto';
    el.style.wordBreak = 'break-all';
    document.body.appendChild(el);
  }
  el.innerHTML = (window as any)._debugLogs.join('<br>');
}
logToPage('Index loaded: ' + navigator.userAgent);

window.onerror = function(message, source, lineno, colno, error) {
  var el = document.createElement('div');
  el.style.color = 'red';
  el.style.fontSize = '16px';
  el.style.background = 'yellow';
  el.style.zIndex = '9999';
  el.style.position = 'relative';
  el.style.padding = '2px 8px';
  el.textContent = '[ERROR] ' + message + ' at ' + source + ':' + lineno;
  document.body.appendChild(el);
};

window.Buffer = window.Buffer || Buffer;

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
