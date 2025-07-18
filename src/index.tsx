import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { ThemeProvider } from "./theme";
import { store } from "./store";
import { Buffer } from "buffer";

import './global.css';

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
