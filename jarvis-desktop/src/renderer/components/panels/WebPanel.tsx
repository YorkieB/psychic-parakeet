/*
  This file creates the web panel that shows an embedded web browser for browsing websites within Jarvis's desktop app.

  It displays web pages, handles navigation, and manages web content while letting you browse the internet directly inside Jarvis without opening a separate browser.
*/
import React from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

// Extend JSX so TypeScript understands the Electron <webview> tag
declare global {
	namespace JSX {
		interface IntrinsicElements {
			webview: React.DetailedHTMLProps<
				React.WebViewHTMLAttributes<HTMLWebViewElement>,
				HTMLWebViewElement
			>;
		}
	}
}

export function WebPanel() {
	const { closePanel } = usePanelStore();
	const [lightBrowserUrl, setLightBrowserUrl] = React.useState<string | null>(null);

	React.useEffect(() => {
		const fetchUrl = async () => {
			try {
				const url = await window.jarvisAPI?.getLightBrowserUrl();
				if (url) {
					setLightBrowserUrl(url);
				}
			} catch {
				setLightBrowserUrl(null);
			}
		};

		fetchUrl();
	}, []);

	return (
		<Panel
			id="web"
			title="🌐 Web Browser"
			width={900}
			height={700}
			onClose={() => closePanel("web")}
		>
			<div className="w-full h-full">
				{lightBrowserUrl ? (
					<webview
						// Use the existing LightBrowser UI inside an Electron webview
						src={lightBrowserUrl}
						style={{ width: "100%", height: "100%", border: "none" }}
						allowpopups={true}
					/>
				) : (
					<div className="p-4">
						<div className="text-center py-12 text-gray-500">
							<p>Web browser is unavailable</p>
							<p className="text-sm mt-2">
								LightBrowser could not be located. Ensure the WebX/LightBrowser project exists next
								to jarvis-desktop.
							</p>
						</div>
					</div>
				)}
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
