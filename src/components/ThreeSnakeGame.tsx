import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SkinId, ThemeId, SKINS_DATA, THEMES_DATA } from "../types";
import { sound } from "../lib/sound";

interface ThreeSnakeGameProps {
  activeSkin: SkinId;
  activeTheme: ThemeId;
  onGameOver: (finalScore: number) => void;
  isGameRunning: boolean;
  onGameStart: () => void;
}

export default function ThreeSnakeGame({
  activeSkin,
  activeTheme,
  onGameOver,
  isGameRunning,
  onGameStart,
}: ThreeSnakeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Grid dimensions
  const GRID_SIZE = 20;

  // Game Core State
  const [score, setScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  // References to keep track of game logic inside requestAnimationFrame loop
  const snakeRef = useRef<THREE.Vector3[]>([
    new THREE.Vector3(10, 0.5, 10),
    new THREE.Vector3(10, 0.5, 11),
    new THREE.Vector3(10, 0.5, 12),
  ]);
  const directionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -1)); // Moving Up
  const nextDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -1));
  const foodRef = useRef<THREE.Vector3>(new THREE.Vector3(5, 0.5, 5));

  // Three.js object meshes to manipulate
  const snakeMeshesRef = useRef<THREE.Mesh[]>([]);
  const foodMeshRef = useRef<THREE.Mesh | null>(null);
  const particleGroupRef = useRef<THREE.Group | null>(null);
  const borderLightRef = useRef<THREE.LineSegments | null>(null);

  // Game loop tickers
  const lastMoveTimeRef = useRef<number>(0);
  const gameRunningRef = useRef<boolean>(isGameRunning);
  const scoreRef = useRef<number>(0);

  // Keep ref to props to access in tickers
  useEffect(() => {
    gameRunningRef.current = isGameRunning;
  }, [isGameRunning]);

  // Handle Controls Input
  const handleDirectionChange = (newDir: THREE.Vector3) => {
    const currentDir = directionRef.current;
    // Prevent 180 degree turns
    if (newDir.dot(currentDir) === 0) {
      nextDirectionRef.current = newDir;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRunningRef.current) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleDirectionChange(new THREE.Vector3(0, 0, -1));
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleDirectionChange(new THREE.Vector3(0, 0, 1));
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handleDirectionChange(new THREE.Vector3(-1, 0, 0));
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handleDirectionChange(new THREE.Vector3(1, 0, 0));
          break;
        case " ":
          setIsPaused((p) => !p);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Generate Food in safe spot
  const generateNewFood = () => {
    let attempts = 0;
    while (attempts < 200) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const z = Math.floor(Math.random() * GRID_SIZE);
      const potentialFood = new THREE.Vector3(x, 0.5, z);

      // Check if food spawns on snake body
      const onSnake = snakeRef.current.some((seg) => seg.distanceTo(potentialFood) < 0.1);
      if (!onSnake) {
        foodRef.current = potentialFood;
        if (foodMeshRef.current) {
          foodMeshRef.current.position.copy(potentialFood);
        }
        return;
      }
      attempts++;
    }
  };

  // Spark Particle Effects
  const spawnExplosionParticles = (pos: THREE.Vector3, colorHex: string) => {
    if (!particleGroupRef.current || !sceneRef.current) return;

    const particleCount = 20;
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions.push(pos.x, pos.y, pos.z);
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        )
      );
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(colorHex),
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geom, mat);
    particleGroupRef.current.add(points);

    // Fade out and move particles
    const creationTime = performance.now();
    const animateParticles = () => {
      const elapsed = (performance.now() - creationTime) / 1000;
      if (elapsed > 0.8) {
        if (particleGroupRef.current) {
          particleGroupRef.current.remove(points);
        }
        geom.dispose();
        mat.dispose();
        return;
      }

      const posArr = geom.attributes.position.array as any;
      for (let i = 0; i < particleCount; i++) {
        const vel = velocities[i];
        posArr[i * 3] += vel.x * 0.016;
        posArr[i * 3 + 1] += vel.y * 0.016;
        posArr[i * 3 + 2] += vel.z * 0.016;

        // Apply light gravity
        vel.y -= 0.12;
      }
      geom.attributes.position.needsUpdate = true;
      mat.opacity = 1.0 - elapsed / 0.8;

      requestAnimationFrame(animateParticles);
    };

    animateParticles();
  };

  // Initialise Three.js Environment
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 450;

    // 1. Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const theme = THEMES_DATA[activeTheme];
    scene.background = new THREE.Color(theme.backgroundColor);
    scene.fog = new THREE.FogExp2(theme.backgroundColor, 0.04);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(GRID_SIZE / 2, 14, GRID_SIZE + 6);
    camera.lookAt(new THREE.Vector3(GRID_SIZE / 2, 0.5, GRID_SIZE / 2));
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Ambient Lights and directional lighting (warmer for meadow/desert)
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#ffffff", 1.2);
    dirLight.position.set(12, 24, 18);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Spot light targeting game board
    const boardSpot = new THREE.SpotLight("#ffffff", 1.5, 40, Math.PI / 4, 0.5, 1);
    boardSpot.position.set(GRID_SIZE / 2, 18, GRID_SIZE / 2);
    boardSpot.target.position.set(GRID_SIZE / 2, 0.5, GRID_SIZE / 2);
    scene.add(boardSpot);
    scene.add(boardSpot.target);

    // 5. Creating Grid Ground
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, theme.gridColor, theme.gridColor);
    gridHelper.position.set(GRID_SIZE / 2 - 0.5, 0.01, GRID_SIZE / 2 - 0.5);
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((mat: any) => {
        mat.transparent = true;
        mat.opacity = 0.15;
      });
    } else if (gridHelper.material) {
      const mat = gridHelper.material as any;
      mat.transparent = true;
      mat.opacity = 0.15;
    }
    scene.add(gridHelper);

    // Solid Cozy Floor (Lawn, Oasis Sand, or Ice rink)
    const floorGeom = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: theme.backgroundColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5);
    floor.receiveShadow = true;
    scene.add(floor);

    // 6. Cozy Boundary Fences
    const borderGeom = new THREE.BoxGeometry(GRID_SIZE + 0.5, 0.8, 0.2);
    const borderMat = new THREE.MeshStandardMaterial({
      color: theme.gridColor, // Uses the lovely primary theme color
      roughness: 0.5,
      metalness: 0.1,
    });

    const borderNorth = new THREE.Mesh(borderGeom, borderMat);
    borderNorth.position.set(GRID_SIZE / 2 - 0.5, 0.4, -0.6);
    scene.add(borderNorth);

    const borderSouth = new THREE.Mesh(borderGeom, borderMat);
    borderSouth.position.set(GRID_SIZE / 2 - 0.5, 0.4, GRID_SIZE - 0.4);
    scene.add(borderSouth);

    const borderEast = new THREE.Mesh(borderGeom, borderMat);
    borderEast.rotation.y = Math.PI / 2;
    borderEast.position.set(GRID_SIZE - 0.4, 0.4, GRID_SIZE / 2 - 0.5);
    scene.add(borderEast);

    const borderWest = new THREE.Mesh(borderGeom, borderMat);
    borderWest.rotation.y = Math.PI / 2;
    borderWest.position.set(-0.6, 0.4, GRID_SIZE / 2 - 0.5);
    scene.add(borderWest);

    // 7. Render Particle Group
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    particleGroupRef.current = particleGroup;

    // 8. Food Mesh (Red Apple with stem and leaf)
    const foodGroup = new THREE.Group();
    
    // Apple base
    const appleGeom = new THREE.SphereGeometry(0.38, 16, 16);
    const appleMat = new THREE.MeshStandardMaterial({
      color: "#ef4444", // Juicy red apple
      roughness: 0.2,
      metalness: 0.1,
    });
    const appleMesh = new THREE.Mesh(appleGeom, appleMat);
    appleMesh.castShadow = true;
    foodGroup.add(appleMesh);

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: "#78350f" });
    const stemMesh = new THREE.Mesh(stemGeom, stemMat);
    stemMesh.position.set(0, 0.38, 0);
    stemMesh.rotation.z = 0.15;
    stemMesh.castShadow = true;
    foodGroup.add(stemMesh);

    // Leaf
    const leafGeom = new THREE.ConeGeometry(0.07, 0.16, 4);
    const leafMat = new THREE.MeshStandardMaterial({ color: "#16a34a" });
    const leafMesh = new THREE.Mesh(leafGeom, leafMat);
    leafMesh.position.set(0.06, 0.4, 0);
    leafMesh.rotation.z = -0.55;
    foodGroup.add(leafMesh);

    foodGroup.position.copy(foodRef.current);
    scene.add(foodGroup);
    foodMeshRef.current = foodGroup;

    // Subtle sweet glow to locate it
    const foodLight = new THREE.PointLight("#f87171", 1.0, 4);
    foodGroup.add(foodLight);

    // 9. Initialise Snake Mesh Container
    const skin = SKINS_DATA[activeSkin];
    snakeRef.current = [
      new THREE.Vector3(10, 0.5, 10),
      new THREE.Vector3(10, 0.5, 11),
      new THREE.Vector3(10, 0.5, 12),
    ];
    directionRef.current = new THREE.Vector3(0, 0, -1);
    nextDirectionRef.current = new THREE.Vector3(0, 0, -1);
    setScore(0);
    scoreRef.current = 0;
    setSpeedMultiplier(1);

    // Function to re-render snake meshes
    const updateSnakeModels = () => {
      // Remove and dispose old meshes to prevent massive memory leaks
      snakeMeshesRef.current.forEach((m) => {
        scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
      snakeMeshesRef.current = [];

      // Create new meshes
      snakeRef.current.forEach((segment, idx) => {
        const isHead = idx === 0;
        // Make head/body segments rounded and bouncy
        const radius = isHead ? 0.46 : Math.max(0.28, 0.4 - idx * 0.008);
        const geom = new THREE.SphereGeometry(radius, 16, 16);

        const customMat = new THREE.MeshStandardMaterial({
          color: skin.color,
          roughness: isHead ? 0.2 : 0.4,
          metalness: skin.metalness,
        });

        const mesh = new THREE.Mesh(geom, customMat);
        mesh.position.copy(segment);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        snakeMeshesRef.current.push(mesh);
      });
    };

    updateSnakeModels();
    generateNewFood();

    // 10. Frame Loop
    let animId: number;

    const tick = (time: number) => {
      animId = requestAnimationFrame(tick);

      // Rotate Food diamond mesh dynamically
      if (foodMeshRef.current) {
        foodMeshRef.current.rotation.y += 0.025;
        foodMeshRef.current.rotation.x += 0.015;
        // Float effect
        foodMeshRef.current.position.y = 0.5 + Math.sin(time * 0.005) * 0.1;
      }

      // Check speed based on score (starts at 200ms ticks, gets faster)
      const baseTickInterval = 200; // ms
      const currentTickInterval = Math.max(70, baseTickInterval - scoreRef.current * 4);
      setSpeedMultiplier(parseFloat((baseTickInterval / currentTickInterval).toFixed(1)));

      if (gameRunningRef.current && !isPaused) {
        const elapsed = time - lastMoveTimeRef.current;
        if (elapsed >= currentTickInterval) {
          lastMoveTimeRef.current = time;

          // Commit Direction Change
          directionRef.current.copy(nextDirectionRef.current);

          // Calculate New Head Position
          const currentHead = snakeRef.current[0];
          const newHead = currentHead.clone().add(directionRef.current);

          // Wall Collisions (Grid limits 0 to 19 inclusive)
          if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.z < 0 || newHead.z >= GRID_SIZE) {
            // CRASH!
            gameRunningRef.current = false;
            sound.playCrash();
            onGameOver(scoreRef.current);
            return;
          }

          // Body Collisions (skip tail segment which moves out of the way)
          const crashedIntoSelf = snakeRef.current
            .slice(0, -1)
            .some((segment) => segment.distanceTo(newHead) < 0.1);

          if (crashedIntoSelf) {
            // CRASH!
            gameRunningRef.current = false;
            sound.playCrash();
            onGameOver(scoreRef.current);
            return;
          }

          // Insert New Head
          snakeRef.current.unshift(newHead);

          // Check Food Collisions
          if (newHead.distanceTo(foodRef.current) < 0.1) {
            // EAT!
            sound.playEat();
            spawnExplosionParticles(foodRef.current, skin.glowColor);
            setScore((prev) => {
              const s = prev + 10;
              scoreRef.current = s;
              return s;
            });
            generateNewFood();
          } else {
            // Remove Tail Segment
            snakeRef.current.pop();
          }

          // Dynamic Camera trailing
          if (cameraRef.current) {
            // Smoothly ease camera slightly towards the snake's position
            const headPos = snakeRef.current[0];
            const targetCamX = GRID_SIZE / 2 + (headPos.x - GRID_SIZE / 2) * 0.15;
            const targetCamZ = GRID_SIZE + 4 + (headPos.z - GRID_SIZE / 2) * 0.15;
            cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.08;
            cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.08;
          }

          // Update meshes to match mathematical state
          updateSnakeModels();
        }
      }

      // Smooth interp of segments for liquid visual motion
      snakeMeshesRef.current.forEach((mesh, idx) => {
        const targetPos = snakeRef.current[idx];
        if (targetPos) {
          mesh.position.lerp(targetPos, 0.28);
        }
      });

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    // 11. Handle Resizes
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 450;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // 12. Cleanup on destruction
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Dispose snake meshes
      snakeMeshesRef.current.forEach((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
      snakeMeshesRef.current = [];

      // Dispose items
      scene.clear();
      renderer.dispose();
      floorGeom.dispose();
      floorMat.dispose();
      borderGeom.dispose();
      borderMat.dispose();
      appleGeom.dispose();
      appleMat.dispose();
      stemGeom.dispose();
      stemMat.dispose();
      leafGeom.dispose();
      leafMat.dispose();
    };
  }, [activeSkin, activeTheme, isPaused]);

  // Mobile/On-screen directional buttons
  const renderDpad = () => {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        {/* Up Button */}
        <button
          onClick={() => {
            sound.playStart(); // Warm up sound
            handleDirectionChange(new THREE.Vector3(0, 0, -1));
          }}
          className="arcade-btn h-14 w-14 bg-slate-800 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white active:scale-95 text-lg font-bold shadow-lg"
          id="dpad-up"
        >
          ▲
        </button>

        {/* Left & Right Buttons */}
        <div className="flex gap-14 my-1">
          <button
            onClick={() => {
              sound.playStart();
              handleDirectionChange(new THREE.Vector3(-1, 0, 0));
            }}
            className="arcade-btn h-14 w-14 bg-slate-800 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white active:scale-95 text-lg font-bold shadow-lg"
            id="dpad-left"
          >
            ◀
          </button>
          <button
            onClick={() => {
              sound.playStart();
              handleDirectionChange(new THREE.Vector3(1, 0, 0));
            }}
            className="arcade-btn h-14 w-14 bg-slate-800 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white active:scale-95 text-lg font-bold shadow-lg"
            id="dpad-right"
          >
            ▶
          </button>
        </div>

        {/* Down Button */}
        <button
          onClick={() => {
            sound.playStart();
            handleDirectionChange(new THREE.Vector3(0, 0, 1));
          }}
          className="arcade-btn h-14 w-14 bg-slate-800 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white active:scale-95 text-lg font-bold shadow-lg"
          id="dpad-down"
        >
          ▼
        </button>
      </div>
    );
  };

  const currentThemeData = THEMES_DATA[activeTheme];
  const currentSkinData = SKINS_DATA[activeSkin];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-2">
      {/* 3D Render Canvas Viewport */}
      <div className="flex-1 flex flex-col">
        {/* HUD Stats */}
        <div className="arcade-panel p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center bg-slate-900/95 border-emerald-500/20 animate-fade-in">
          <div>
            <div className="text-xs font-mono text-green-400 tracking-wider">SCORE</div>
            <div className="text-2xl font-bold font-mono text-glow-green text-green-200">{score}</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-xs font-mono text-amber-400 tracking-wider font-semibold">SKIN IN USE</div>
            <div className="text-sm font-bold text-amber-200 truncate max-w-[120px] mx-auto md:mx-0">{currentSkinData.name}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-mono text-green-400 tracking-wider font-semibold">SPEED ENGINE</div>
            <div className="text-lg font-bold font-mono text-green-300">{speedMultiplier}x</div>
          </div>
          <div className="text-right">
            <button
              onClick={() => {
                const muted = sound.toggleMute();
                setIsMuted(muted);
                sound.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all uppercase tracking-wider font-bold ${
                isMuted
                  ? "bg-red-950/30 text-red-400 border-red-500/20 hover:border-red-500/40"
                  : "bg-green-950/30 text-green-400 border-green-500/20 hover:border-green-500/40"
              }`}
              id="btn-toggle-sound"
            >
              {isMuted ? "🔇 MUTED" : "🔊 AUDIO ON"}
            </button>
          </div>
        </div>

        {/* Canvas Element Container */}
        <div className="relative border border-green-500/20 rounded-2xl overflow-hidden shadow-2xl bg-[#0b131a]">
          <div ref={containerRef} className="w-full h-[400px] md:h-[450px]" id="game-canvas-3d" />

          {/* Start Screen Overlay */}
          {!isGameRunning && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center text-center p-6 z-10">
              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-amber-400 tracking-wider uppercase mb-2 animate-pulse">
                3D CLASSIC SNAKE
              </h2>
              <p className="text-xs text-green-300/80 max-w-md font-sans tracking-wide mb-8">
                Welcome to the beautiful Orchard. Control your snake to collect sweet red apples. Watch out for the boundaries and your own tail!
              </p>

              <button
                onClick={() => {
                  sound.playStart();
                  onGameStart();
                }}
                className="arcade-btn px-10 py-4 bg-green-500 text-slate-950 hover:bg-green-400 hover:shadow-green-400/50 hover:shadow-lg font-extrabold uppercase tracking-widest transition-all text-sm"
                id="btn-play-now"
              >
                START GAME
              </button>

              <div className="mt-8 flex gap-6 text-[10px] font-mono text-slate-500">
                <span>[W,A,S,D] / [ARROWS] = STEER</span>
                <span>|</span>
                <span>[SPACE] = PAUSE</span>
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {isPaused && isGameRunning && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col justify-center items-center z-10">
              <div className="text-4xl font-extrabold text-amber-500 uppercase tracking-widest text-glow-amber animate-bounce">
                GAME PAUSED
              </div>
              <button
                onClick={() => setIsPaused(false)}
                className="arcade-btn mt-4 px-6 py-2 bg-amber-600 text-white font-bold tracking-wider"
                id="btn-resume-paused"
              >
                RESUME
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Touch DPAD / Information sidebar */}
      <div className="w-full lg:w-72 flex flex-col gap-4">
        <div className="arcade-panel p-4 bg-slate-900/95 border-green-500/10 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-green-400 border-b border-green-500/10 pb-2 mb-3 tracking-wider uppercase">
              GAMEPLAY CONTROLS
            </h3>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-4">
              If playing on a touch screen, use the buttons below to steer your snake. Collect apples to grow longer and earn coins to unlock skins in the Shop!
            </p>
          </div>

          {/* Touch Controls rendering */}
          <div className="my-auto">
            {renderDpad()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center font-mono text-[10px] text-slate-500">
            <span>STATUS: ACTIVE</span>
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
