/**
 * Camera View Component
 * Real camera access for visual analysis
 */

import { Camera, CameraOff, X } from "lucide-react";
import React from "react";
import { useCamera } from "../../hooks/useCamera";

export function CameraView() {
	const { camera, videoRef, startCamera, stopCamera, captureFrame } = useCamera();
	const [capturedImage, setCapturedImage] = React.useState<string | null>(null);

	const handleStart = async () => {
		try {
			await startCamera({ video: { width: 1280, height: 720 } });
		} catch (error: any) {
			console.error("Failed to start camera:", error);
		}
	};

	const handleStop = () => {
		stopCamera();
		setCapturedImage(null);
	};

	const handleCapture = () => {
		const image = captureFrame();
		if (image) {
			setCapturedImage(image);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Camera</h3>
				<div className="flex items-center space-x-2">
					{camera.active ? (
						<>
							<button
								onClick={handleCapture}
								className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
							>
								Capture
							</button>
							<button
								onClick={handleStop}
								className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center space-x-2"
							>
								<CameraOff className="w-4 h-4" />
								<span>Stop</span>
							</button>
						</>
					) : (
						<button
							onClick={handleStart}
							disabled={!camera.available}
							className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center space-x-2"
						>
							<Camera className="w-4 h-4" />
							<span>Start Camera</span>
						</button>
					)}
				</div>
			</div>

			{!camera.available && (
				<div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
					Camera not available. Please check your device permissions.
				</div>
			)}

			{camera.error && (
				<div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
					Error: {camera.error}
				</div>
			)}

			<div className="relative bg-black rounded-lg overflow-hidden aspect-video">
				{camera.active ? (
					<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-400">
						<CameraOff className="w-16 h-16" />
					</div>
				)}
			</div>

			{capturedImage && (
				<div className="relative">
					<button
						onClick={() => setCapturedImage(null)}
						className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
					>
						<X className="w-4 h-4" />
					</button>
					<img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
				</div>
			)}
		</div>
	);
}
