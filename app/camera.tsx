import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Camera,
  runAsync,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { detectFaces, Face } from "react-native-vision-camera-face-detector";
// 🚨 You must import runOnJS to update state from a worklet!
// import { runOnJS } from "react-native-reanimated";
import { Worklets } from "react-native-worklets-core";

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);

  // 1. Define a regular JS function to update the state
  // This function will be called on the main JS thread via runOnJS
  // const updateFaces = (faces: Face[]) => {
  //   setDetectedFaces(faces);
  //   // You can also log here, on the main thread
  //   console.log("Faces detected (Main Thread):", faces.length);
  // };

  const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
    console.log("faces detected", faces);
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // 2. Wrap the state update with runOnJS inside the frame processor
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      runAsync(frame, async () => {
        "worklet";
        const faces = await detectFaces(frame as any);

        // 3. Call the main thread function using runOnJS
        handleDetectedFaces(faces);

        // Note: console.log here runs on the worklet thread
        // console.log("Faces detected (Worklet):", faces.length);
      });
    },
    [handleDetectedFaces]
  ); // 4. Include updateFaces in the dependency array (optional but good practice)

  if (!hasPermission) {
    return <Text>Requesting Camera Permission...</Text>;
  }

  if (device == null) {
    return <Text>No Camera Device Found</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      {/* Display the count of detected faces */}
      <View style={styles.faceCountContainer}>
        <Text style={styles.faceCountText}>
          Faces Detected: {detectedFaces.length}
        </Text>
      </View>
    </View>
  );
}
// ... (styles remain the same)

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

// import { useEffect, useState } from "react";
// import { StyleSheet, Text, View } from "react-native";
// import {
//   Camera,
//   runAsync,
//   runOnJS,
//   useCameraDevice,
//   useCameraPermission,
//   useFrameProcessor,
// } from "react-native-vision-camera";
// import { detectFaces, Face } from "react-native-vision-camera-face-detector";

// export default function CameraScreen() {
//   const { hasPermission, requestPermission } = useCameraPermission();
//   const device = useCameraDevice("back");
//   const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);

//   useEffect(() => {
//     if (!hasPermission) {
//       requestPermission();
//     }
//   }, [hasPermission]);

//   const frameProcessor = useFrameProcessor((frame) => {
//     "worklet";
//     runAsync(frame, async () => {
//       "worklet";
//       const faces = await detectFaces(frame as any);
//       console.log("Faces detected:", faces);
//       // Use runOnJS to call the state setter on the JS thread
//       runOnJS(setDetectedFaces)(faces);
//     });
//   }, []);

//   console.log("Current detected faces:", detectedFaces);

//   if (!hasPermission) {
//     return <Text>Requesting Camera Permission...</Text>;
//   }

//   if (device == null) {
//     return <Text>No Camera Device Found</Text>;
//   }

//   return (
//     <View style={styles.container}>
//       <Camera
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={true}
//         frameProcessor={frameProcessor}
//       />
//       <View style={styles.faceCountContainer}>
//         <Text style={styles.faceCountText}>
//           Faces Detected: {detectedFaces.length}
//         </Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   faceCountContainer: {
//     position: "absolute",
//     top: 50,
//     width: "100%",
//     alignItems: "center",
//   },
//   faceCountText: {
//     color: "white",
//     fontSize: 20,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     padding: 10,
//     borderRadius: 5,
//   },
// });
