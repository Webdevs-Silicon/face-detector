import { File } from "expo-file-system";
import { useState } from "react";
import { Camera } from "react-native-vision-camera";

interface UseFaceCaptureOptions {
  throttleTime?: number;
  onCaptureStart?: () => void;
  onCaptureSuccess?: (base64: string) => void;
  onCaptureError?: (error: Error) => void;
}

interface UseFaceCaptureReturn {
  captureAndProcess: () => Promise<void>;
  isCapturing: boolean;
  lastCaptureTime: number;
}

export const useFaceCapture = (
  cameraRef: React.RefObject<Camera | null>,
  options: UseFaceCaptureOptions = {}
): UseFaceCaptureReturn => {
  const {
    throttleTime = 2000,
    onCaptureStart,
    onCaptureSuccess,
    onCaptureError,
  } = options;

  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  const sendToBackend = async (base64Image: string) => {
    try {
      // TODO: Uncomment when backend is ready
      // const response = await fetch("YOUR_BACKEND_URL/api/face-detection", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     image: base64Image,
      //     timestamp: new Date().toISOString(),
      //   }),
      // });
      // const result = await response.json();
      // console.log("Backend response:", result);
      // return result;

      // For now, log preview
      console.log(
        "Base64 preview (first 50 chars):",
        base64Image.substring(0, 50)
      );
      console.log("Full base64 length:", base64Image.length);

      return { success: true, preview: base64Image.substring(0, 50) };
    } catch (error) {
      console.error("Error sending to backend:", error);
      throw error;
    }
  };

  const convertToBase64 = async (filePath: string): Promise<string> => {
    try {
      // Read file as blob using fetch
      const response = await fetch(`file://${filePath}`);
      const blob = await response.blob();

      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting to base64:", error);
      throw error;
    }
  };

  const captureAndProcess = async () => {
    if (!cameraRef.current || isCapturing) {
      console.log("⏭Capture skipped: camera not ready or already capturing");
      return;
    }

    const now = Date.now();
    if (now - lastCaptureTime < throttleTime) {
      console.log(
        `⏸Capture throttled. Wait ${throttleTime - (now - lastCaptureTime)}ms`
      );
      return;
    }

    let photoFile: File | null = null;
    let fileDeleted = false;

    try {
      setIsCapturing(true);
      setLastCaptureTime(now);
      onCaptureStart?.();

      console.log("Starting image capture...");

      // Take photo
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
        enableShutterSound: false,
      });

      console.log("Photo captured at:", photo.path);

      // Create File object for the new API
      photoFile = new File(`file://${photo.path}`);

      // Convert to base64
      console.log("Converting to base64...");
      const base64Image = await convertToBase64(photo.path);

      console.log("Conversion complete. Size:", base64Image.length, "chars");

      // Send to backend (or log for now)
      await sendToBackend(base64Image);

      onCaptureSuccess?.(base64Image);

      // Clean up temporary file using new API
      if (photoFile) {
        try {
          await photoFile.delete();
          fileDeleted = true;
          console.log("Temporary file deleted");
        } catch (deleteError) {
          console.warn("Could not delete file:", deleteError);
        }
      }

      console.log("Capture process completed successfully");
    } catch (error) {
      const err = error as Error;
      console.error("Error in capture process:", err.message);
      onCaptureError?.(err);

      if (photoFile && !fileDeleted) {
        try {
          await photoFile.delete();
          fileDeleted = true;
        } catch (deleteError) {
          // Silently ignore deletion errors during error cleanup
        }
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    captureAndProcess,
    isCapturing,
    lastCaptureTime,
  };
};
