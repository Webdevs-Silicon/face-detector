import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useState } from "react";
import { Image } from "react-native";
import { Camera } from "react-native-vision-camera";

interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseFaceCaptureOptions {
  throttleTime?: number;
  onCaptureStart?: () => void;
  onCaptureSuccess?: (base64: string) => void;
  onCaptureError?: (error: Error) => void;
}

interface UseFaceCaptureReturn {
  captureAndProcess: (
    bounds?: FaceBounds,
    previewWidth?: number,
    previewHeight?: number
  ) => Promise<void>;
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

  const normalizePath = (p: string) => {
    if (p.startsWith("file://")) return p;
    return "file://" + p;
  };

  const sendToBackend = async (base64Image: string) => {
    try {
      const response = await fetch("http://192.168.29.241:5000/save-base64", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          timestamp: new Date().toISOString(),
        }),
      });
      const result = await response.json();
      console.log("Backend response:", result);
      return result;
    } catch (error) {
      console.error("Error sending to backend:", error);
      throw error;
    }
  };

  const convertToBase64 = async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`file://${filePath}`);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
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

  const cropFace = async (
    photoPath: string,
    bounds: FaceBounds,
    previewWidth: number,
    previewHeight: number
  ) => {
    const uri = normalizePath(photoPath);

    const { width: photoWidth, height: photoHeight } = await new Promise<{
      width: number;
      height: number;
    }>((resolve, reject) =>
      Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject)
    );

    // Scale preview coordinates to photo coordinates
    const scaleX = photoWidth / previewWidth;
    const scaleY = photoHeight / previewHeight;

    let x = bounds.x * scaleX;
    let y = bounds.y * scaleY;
    let w = bounds.width * scaleX;
    let h = bounds.height * scaleY;

    // Add padding around the face (adjust these values as needed)
    // Using percentage-based padding relative to face size
    const topPad = h * 0.3; // 30% of face height above
    const bottomPad = h * 0.3; // 30% of face height below
    const sidePad = w * 0.2; // 20% of face width on each side

    let originX = x - sidePad;
    let originY = y - topPad;
    let width = w + sidePad * 2;
    let height = h + topPad + bottomPad;

    // Clamp to image boundaries
    originX = Math.max(0, originX);
    originY = Math.max(0, originY);

    if (originX + width > photoWidth) width = photoWidth - originX;
    if (originY + height > photoHeight) height = photoHeight - originY;

    const cropRect = {
      originX: Math.round(originX),
      originY: Math.round(originY),
      width: Math.round(width),
      height: Math.round(height),
    };

    console.log("Crop rect:", cropRect);
    console.log("Face bounds scaled:", { x, y, w, h });
    // manipulate
    const manip = await ImageManipulator.manipulate(uri);
    const result = await manip.crop(cropRect).renderAsync();

    const saved = await result.saveAsync({
      base64: true,
      format: SaveFormat.JPEG,
      compress: 0.9,
    });

    return { base64: saved.base64 };
  };

  const captureAndProcess = async (
    bounds?: FaceBounds,
    previewWidth?: number,
    previewHeight?: number
  ) => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    const now = Date.now();
    if (now - lastCaptureTime < throttleTime) {
      return;
    }

    let photoFile: File | null = null;
    let fileDeleted = false;

    try {
      setIsCapturing(true);
      setLastCaptureTime(now);
      onCaptureStart?.();

      const photo = await cameraRef.current.takePhoto({
        flash: "off",
        enableShutterSound: false,
      });

      console.log("Photo captured at:", photo.path);
      photoFile = new File(`file://${photo.path}`);

      let base64Image: string;

      if (bounds && previewWidth && previewHeight) {
        // Crop the face if bounds are provided
        console.log("Cropping face...");
        const cropped = await cropFace(
          photo.path,
          bounds,
          previewWidth,
          previewHeight
        );
        base64Image = cropped.base64!;
        console.log("Face cropped. Base64 size:", base64Image.length, "chars");
      } else {
        // Use full image if no bounds provided
        console.log("Converting full image to base64...");
        base64Image = await convertToBase64(photo.path);
        console.log("Conversion complete. Size:", base64Image.length, "chars");
      }

      // Send to backend
      await sendToBackend(base64Image);

      onCaptureSuccess?.(base64Image);

      // Clean up temporary file
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
