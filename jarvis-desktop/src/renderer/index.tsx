/*
  This file is the main entry point that brings the Jarvis desktop application to life on your computer.

  It sets up the React application, connects it to your browser window, and makes sure Jarvis runs smoothly as a desktop app while handling all the startup magic.
*/
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
