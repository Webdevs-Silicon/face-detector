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
  const device = useCameraDevice("back");
  const cameraRef = useRef<Camera>(null);

  const [isCameraActive, setIsCameraActive] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const hasNavigated = useRef(false);

  // Use the hook provided by the package
  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    landmarkMode: "none",
    contourMode: "none",
  });

  const { captureAndProcess, isCapturing } = useFaceCapture(cameraRef, {
    throttleTime: 3000, // Wait 3 seconds between captures
    onCaptureStart: () => {
      console.log("Capture started");
    },
    onCaptureSuccess: (base64) => {
      if (hasNavigated.current) return;

      console.log("Capture successful!");
      console.log("Base64 ready to send to backend");

      hasNavigated.current = true;
      setIsCameraActive(false);

      router.push({
        pathname: "/success",
        params: {
          base64Preview: base64.substring(0, 100), // Pass first 100 chars as preview
        },
      });
    },
    onCaptureError: (error) => {
      console.error("Capture failed:", error.message);
    },
  });

  const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
    setDetectedFaces(faces);

    if (faces.length > 0 && !isCapturing && !hasNavigated.current) {
      console.log(`${faces.length} face(s) detected, triggering capture...`);
      captureAndProcess();
    }
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  useEffect(() => {
    hasNavigated.current = false;
    setIsCameraActive(true);

    return () => {
      setIsCameraActive(false);
    };
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const faces = detectFaces(frame);
      handleDetectedFaces(faces);
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
      />
      <View style={styles.faceCountContainer}>
        <Text style={styles.faceCountText}>
          Faces Detected: {detectedFaces.length}
        </Text>
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
});
