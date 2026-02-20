/**
 * Sample3DApp - 3D Human Model Viewer
 * Displays a local .glb model using WebView + Three.js
 */

import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>3D Viewer</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; touch-action: none; }
    canvas { display: block; width: 100%; height: 100%; }
    #loading {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px; text-align: center; z-index: 10;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #6c63ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    Loading 3D Model...
  </div>

  <script src="three.min.js"></script>
  <script src="GLTFLoader.js"></script>
  <script src="OrbitControls.js"></script>
  <script>
    var loading = document.getElementById('loading');

    try {
      // Scene setup
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);

      // Animation mixer
      var mixer = null;
      var clock = new THREE.Clock();

      // Camera
      var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);

      // Renderer
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      document.body.appendChild(renderer.domElement);

      // Lights
      var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      var dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight1.position.set(5, 10, 7);
      dirLight1.castShadow = true;
      scene.add(dirLight1);

      var dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
      dirLight2.position.set(-5, 5, -5);
      scene.add(dirLight2);

      var hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.4);
      scene.add(hemiLight);

      // Controls
      var controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = false;
      controls.target.set(0, 0, 0);
      controls.minDistance = 1;
      controls.maxDistance = 10;
      // Lock vertical rotation — only allow horizontal (left/right)
      controls.minPolarAngle = Math.PI / 2.4;
      controls.maxPolarAngle = Math.PI / 2.4;
      controls.update();

      // Load GLB model
      var loader = new THREE.GLTFLoader();
      loader.load(
        'Boy.glb',
        function (gltf) {
          var model = gltf.scene;

          // Center and scale model
          var box = new THREE.Box3().setFromObject(model);
          var center = box.getCenter(new THREE.Vector3());
          var size = box.getSize(new THREE.Vector3());
          var maxDim = Math.max(size.x, size.y, size.z);
          var scale = 2.0 / maxDim;
          model.scale.set(scale, scale, scale);

          // Re-center model at origin (center of screen)
          box.setFromObject(model);
          center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);

          // Auto-fit: calculate camera distance to see the full model
          box.setFromObject(model);
          var fitSize = box.getSize(new THREE.Vector3());
          var maxFitDim = Math.max(fitSize.x, fitSize.y);
          var fov = camera.fov * (Math.PI / 180);
          var cameraZ = (maxFitDim / 2) / Math.tan(fov / 2) * 1.3;

          scene.add(model);
          controls.target.set(0, 0, 0);
          camera.position.set(0, 0, cameraZ);
          controls.update();

          // Play animation named '1'
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            var clip = THREE.AnimationClip.findByName(gltf.animations, '1');
            if (!clip) clip = gltf.animations[0];
            var action = mixer.clipAction(clip);
            action.play();
          }

          loading.style.display = 'none';
        },
        function (xhr) {
          // Progress
          if (xhr.lengthComputable) {
            var pct = Math.round((xhr.loaded / xhr.total) * 100);
            loading.innerHTML = '<div class="spinner"></div>Loading... ' + pct + '%';
          }
        },
        function (error) {
          loading.innerHTML = 'Error: ' + (error.message || 'Could not load model');
        }
      );

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        var delta = clock.getDelta();
        if (mixer) mixer.update(delta);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      // Handle resize
      window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

    } catch (e) {
      loading.innerHTML = 'Error: ' + e.message;
    }
  </script>
</body>
</html>
`;

function App(): React.JSX.Element {
  const baseUrl =
    Platform.OS === 'android' ? 'file:///android_asset/' : '';

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        source={{ html: HTML_CONTENT, baseUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onError={syntheticEvent => {
          console.warn('WebView error:', syntheticEvent.nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default App;
