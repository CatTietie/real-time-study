import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "antd/dist/reset.css";
import "./index.css";
import App from "./App.tsx";
import { store } from "./app/store";

console.log('=== main.tsx 开始执行 ===');
console.log('root element:', document.getElementById("root"));

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
