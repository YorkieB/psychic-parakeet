/**
 * Camera Access Hook
 * Provides real camera access for visual analysis
 */

import { useEffect, useRef, useState } from "react";

interface CameraState {
	available: boolean;
	active: boolean;
	stream: MediaStream | null;
	error: string | null;
}

export function useCamera() {
	const [camera, setCamera] = useState<CameraState>({
		available: false,
		active: false,
		stream: null,
		error: null,
	});
	const videoRef = useRef<HTMLVideoElement | null>(null);

	// Helper to report camera health via IPC
	const reportCameraHealth = async (
		status: "healthy" | "degraded" | "error" | "unavailable",
		message: string,
		details?: any,
	) => {
		try {
			if (typeof window !== "undefined" && (window as any).jarvisAPI?.reportSensorHealth) {
				await (window as any).jarvisAPI.reportSensorHealth("Camera", status, message, details);
			}
		} catch (_error) {
			// Silently fail if IPC not available
		}
	};

	useEffect(() => {
		// Check if camera is available
		const checkAvailability = async () => {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const hasCamera = devices.some((device) => device.kind === "videoinput");
				setCamera((prev) => ({ ...prev, available: hasCamera }));

				if (hasCamera) {
					reportCameraHealth("healthy", "Camera is available and ready to use.");
				} else {
					reportCameraHealth(
						"unavailable",
						"No camera found on this device. This is normal if your device does not have a camera.",
					);
				}
			} catch (error: any) {
				console.warn("Could not enumerate devices:", error);
				setCamera((prev) => ({ ...prev, available: false }));
				reportCameraHealth(
					"error",
					"Failed to check for camera. Cannot determine if a camera is available.",
					{ error: error.message },
				);
			}
		};

		checkAvailability();
	}, []);

	const startCamera = async (constraints: MediaStreamConstraints = { video: true }) => {
		try {
			const api = (window as any).jarvisAPI;
			if (api?.requestCameraAccess) {
				await api.requestCameraAccess();
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: constraints.video || true,
				audio: false,
			});

			setCamera({
				available: true,
				active: true,
				stream,
				error: null,
			});

			// Attach stream to video element if ref exists
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}

			reportCameraHealth("healthy", "Camera is now active and streaming video.");

			return stream;
		} catch (error: any) {
			const errorMessage = error.message || "Failed to access camera";
			setCamera((prev) => ({
				...prev,
				active: false,
				error: errorMessage,
			}));

			// Report error to Health API
			if (errorMessage.includes("permission") || errorMessage.includes("NotAllowedError")) {
				reportCameraHealth(
					"error",
					"Camera permission denied. Please grant camera access in your browser or system settings.",
					{ error: errorMessage },
				);
			} else if (errorMessage.includes("busy") || errorMessage.includes("in use")) {
				reportCameraHealth(
					"error",
					"Camera is already in use by another application. Close other apps using the camera and try again.",
					{ error: errorMessage },
				);
			} else if (errorMessage.includes("not found") || errorMessage.includes("NotFoundError")) {
				reportCameraHealth(
					"error",
					"Camera not found. Make sure a camera is connected to your device.",
					{ error: errorMessage },
				);
			} else {
				reportCameraHealth("error", `Failed to access camera: ${errorMessage}`, {
					error: errorMessage,
				});
			}

			throw error;
		}
	};

	const stopCamera = () => {
		if (camera.stream) {
			camera.stream.getTracks().forEach((track) => track.stop());

			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}

			setCamera((prev) => ({
				...prev,
				active: false,
				stream: null,
			}));

			reportCameraHealth("healthy", "Camera has been stopped.");
		}
	};

	const captureFrame = (): string | null => {
		if (videoRef.current && camera.active) {
			const canvas = document.createElement("canvas");
			canvas.width = videoRef.current.videoWidth;
			canvas.height = videoRef.current.videoHeight;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				ctx.drawImage(videoRef.current, 0, 0);
				return canvas.toDataURL("image/jpeg");
			}
		}
		return null;
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCamera();
		};
	}, []);

	return {
		camera,
		videoRef,
		startCamera,
		stopCamera,
		captureFrame,
	};
}
