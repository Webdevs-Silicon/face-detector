import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import {
  Face,
  useFaceDetector,
} from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { useFaceCapture } from "../src/hooks/useFaceCapture";

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const cameraRef = useRef<Camera>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const [largestFace, setLargestFace] = useState<Face | null>(null);
  const hasNavigated = useRef(false);
  const isCapturingRef = useRef(false);
  const [frameSize, setFrameSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    landmarkMode: "none",
    contourMode: "none",
  });

  const { captureAndProcess, isCapturing } = useFaceCapture(cameraRef, {
    throttleTime: 3000,
    onCaptureStart: () => {
      console.log("Capture started");
      isCapturingRef.current = true;
    },
    onCaptureSuccess: (base64) => {
      if (hasNavigated.current) return;
      console.log("Capture successful!");
      console.log("Base64 ready to send to backend");
      hasNavigated.current = true;
      isCapturingRef.current = false;
      setIsCameraActive(false);
      router.push({
        pathname: "/success",
        params: {
          base64Preview: base64.substring(0, 100),
        },
      });
    },
    onCaptureError: (error) => {
      console.error("Capture failed:", error.message);
      isCapturingRef.current = false;
    },
  });

  // Function to find the largest face by bounding box area
  const findLargestFace = (faces: Face[]): Face | null => {
    if (faces.length === 0) return null;

    return faces.reduce((largest, current) => {
      const largestArea = largest.bounds.width * largest.bounds.height;
      const currentArea = current.bounds.width * current.bounds.height;
      return currentArea > largestArea ? current : largest;
    });
  };

  const handleDetectedFaces = Worklets.createRunOnJS(
    (faces: Face[], frameWidth: number, frameHeight: number) => {
      setDetectedFaces(faces);
      if (!frameSize) {
        setFrameSize({ width: frameWidth, height: frameHeight });
      }

      const largest = findLargestFace(faces);
      setLargestFace(largest);

      // Check both the hook's isCapturing state AND our ref to prevent double captures
      if (
        largest &&
        !isCapturing &&
        !hasNavigated.current &&
        !isCapturingRef.current &&
        previewSize &&
        frameSize
      ) {
        const originalBounds = largest.bounds;

        // Transform frame coordinates to preview coordinates
        const scaleX = previewSize.width / frameSize.height;
        const scaleY = previewSize.height / frameSize.width;

        const scaledWidth = originalBounds.width * scaleX;
        const scaledHeight = originalBounds.height * scaleY;
        const scaledX = originalBounds.x * scaleX;
        const scaledY = originalBounds.y * scaleY;

        // Apply mirror flip for front camera
        const flippedX = previewSize.width - scaledX - scaledWidth;

        // These are the bounds in preview coordinate system
        const previewBounds = {
          x: flippedX,
          y: scaledY,
          width: scaledWidth,
          height: scaledHeight,
        };

        captureAndProcess(previewBounds, previewSize.width, previewSize.height);
      }
    }
  );

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  useEffect(() => {
    hasNavigated.current = false;
    isCapturingRef.current = false;
    setIsCameraActive(true);
    return () => {
      setIsCameraActive(false);
    };
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const faces = detectFaces(frame);
      handleDetectedFaces(faces, frame.width, frame.height);
    },
    [detectFaces, handleDetectedFaces]
  );

  if (!hasPermission) {
    return <Text>Requesting Camera Permission...</Text>;
  }

  if (device == null) {
    return <Text>No Camera Device Found</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
        photo={true}
        resizeMode="contain"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!previewSize) setPreviewSize({ width, height });
        }}
      />

      {/* {previewSize &&
        frameSize &&
        detectedFaces.map((face, index) => {
          const scaleX = previewSize.width / frameSize.height; // 393 / 480
          const scaleY = previewSize.height / frameSize.width; // 873 / 640

          // Scale the face bounds
          const scaledWidth = face.bounds.width * scaleX;
          const scaledHeight = face.bounds.height * scaleY;
          const scaledX = face.bounds.x * scaleX;
          const scaledY = face.bounds.y * scaleY;

          // Calculate flipped X coordinate (for front camera mirror effect)
          const flippedX = previewSize.width - scaledX - scaledWidth;

          return (
            <View
              key={index}
              style={{
                position: "absolute",
                left: flippedX,
                top: scaledY,
                width: scaledWidth,
                height: scaledHeight,
                borderWidth: 3,
                borderColor: largestFace === face ? "red" : "lime",
                borderRadius: 4,
              }}
            />
          );
        })} */}

      <View style={styles.faceCountContainer}>
        <Text style={styles.faceCountText}>
          Faces Detected: {detectedFaces.length}
        </Text>

        {/* {largestFace && (
          <Text style={styles.faceInfoText}>
            Largest Face Area:{" "}
            {(largestFace.bounds.width * largestFace.bounds.height).toFixed(0)}{" "}
            px²
          </Text>
        )} */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  faceCountContainer: {
    position: "absolute",
    top: 50,
    width: "100%",
    alignItems: "center",
  },
  faceCountText: {
    color: "white",
    fontSize: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  faceInfoText: {
    color: "white",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
});
