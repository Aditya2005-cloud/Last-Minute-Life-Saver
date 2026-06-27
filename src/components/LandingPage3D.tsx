import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles as SparklesIcon, 
  ArrowRight, 
  Clock, 
  Brain, 
  Layout, 
  AlertTriangle, 
  ChevronDown 
} from "lucide-react";

// --- WEBGL DETECTOR ---
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// --- 3D SCENE SUB-COMPONENTS ---

interface SceneContentProps {
  scrollProgress: number;
}

function SceneContent({ scrollProgress }: SceneContentProps) {
  const { camera } = useThree();
  const mainOrbRef = useRef<THREE.Mesh>(null);
  const subOrbsRef = useRef<THREE.Group>(null);
  const fragmentsRef = useRef<THREE.Group>(null);

  // Targets for position and look-at based on scroll section
  // Section ranges: 
  // 0.0 - 0.2: Hero
  // 0.2 - 0.4: Problem
  // 0.4 - 0.6: Solution
  // 0.6 - 0.8: Agentic Power
  // 0.8 - 1.0: CTA
  const cameraTargets = useMemo(() => {
    return [
      { pos: new THREE.Vector3(0, 0, 5), look: new THREE.Vector3(0, 0, 0) },        // Hero
      { pos: new THREE.Vector3(-2, 1, 4.5), look: new THREE.Vector3(1, -0.5, 0) },   // Problem
      { pos: new THREE.Vector3(2, -0.8, 5), look: new THREE.Vector3(-0.5, 0.2, 0) },  // Solution
      { pos: new THREE.Vector3(0, 2.2, 5.5), look: new THREE.Vector3(0, -0.3, 0) },   // Agentic Power
      { pos: new THREE.Vector3(0, 0, 3.2), look: new THREE.Vector3(0, 0, 0) }         // CTA
    ];
  }, []);

  // Compute positions of fragments dynamically to animate based on scroll progress
  // Fragment distribution configurations
  const fragmentInitialPositions = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      return {
        // Chaotic / scattered positions
        scattered: new THREE.Vector3(
          Math.cos(angle) * radius + (Math.random() - 0.5),
          Math.sin(angle) * radius + (Math.random() - 0.5),
          (Math.random() - 0.5) * 2
        ),
        // Linear organized timeline positions
        ordered: new THREE.Vector3(
          (i - 7) * 0.4,
          -0.5 + Math.sin(i * 0.5) * 0.15,
          0
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          0
        ),
        scale: 0.12 + Math.random() * 0.08
      };
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. ANIME ORB PULSE
    if (mainOrbRef.current) {
      // Glow and pulse scale dynamically
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      mainOrbRef.current.scale.set(pulse, pulse, pulse);
    }

    // 2. CAMERA SCROLL LERP
    // Determine target index and exact weight
    const scaledProgress = scrollProgress * 4; // 0 to 4
    const index = Math.floor(scaledProgress);
    const fraction = scaledProgress - index;

    let targetPos = cameraTargets[0].pos;
    let targetLook = cameraTargets[0].look;

    if (index >= 4) {
      targetPos = cameraTargets[4].pos;
      targetLook = cameraTargets[4].look;
    } else {
      const current = cameraTargets[index];
      const next = cameraTargets[index + 1];
      targetPos = new THREE.Vector3().lerpVectors(current.pos, next.pos, fraction);
      targetLook = new THREE.Vector3().lerpVectors(current.look, next.look, fraction);
    }

    // Eased lerp for camera position
    camera.position.lerp(targetPos, 0.08);
    
    // Smooth camera lookAt vector
    const currentLook = new THREE.Vector3(0, 0, 0);
    // Find where the camera is currently looking by adding camera direction
    camera.getWorldDirection(currentLook);
    currentLook.add(camera.position);
    currentLook.lerp(targetLook, 0.08);
    camera.lookAt(currentLook);

    // 3. FRAGMENTS (PROBLEMS TO SOLUTION TRANSITION)
    if (fragmentsRef.current) {
      const children = fragmentsRef.current.children;
      // Interpolate each child's position based on scrollProgress
      // Section 1 (0 to 0.2): hidden/scattered
      // Section 2 (0.2 to 0.4): highly scattered and chaotic
      // Section 3 (0.4 to 0.6): gathering into ordered line (timeline)
      // Section 4+ (0.6 to 1.0): fading or grouped very tight near main orb
      
      let interpolationFactor = 0;
      if (scrollProgress < 0.25) {
        interpolationFactor = 0; // standard scattered
      } else if (scrollProgress >= 0.25 && scrollProgress < 0.55) {
        // Lerp from scattered to ordered line
        interpolationFactor = (scrollProgress - 0.25) / 0.3;
      } else {
        interpolationFactor = 1; // fully ordered
      }

      for (let i = 0; i < children.length; i++) {
        const mesh = children[i] as THREE.Mesh;
        const config = fragmentInitialPositions[i];
        
        if (config) {
          // Position lerping
          const currentTargetPos = new THREE.Vector3().lerpVectors(
            config.scattered,
            config.ordered,
            interpolationFactor
          );
          
          // If scroll progress is high (Agentic section), pull them super close to represent subtasks
          if (scrollProgress >= 0.6) {
            const pullFactor = Math.min((scrollProgress - 0.6) / 0.2, 1);
            const subtaskTarget = new THREE.Vector3(
              Math.sin(i) * 0.8,
              Math.cos(i) * 0.8 + 0.3,
              Math.sin(i * 2) * 0.4
            );
            currentTargetPos.lerp(subtaskTarget, pullFactor);
          }

          mesh.position.lerp(currentTargetPos, 0.1);
          
          // Rotation drift
          mesh.rotation.x += 0.005;
          mesh.rotation.y += 0.008;
        }
      }
    }

    // 4. SUB-ORBS (AGENTIC SECTOR)
    if (subOrbsRef.current) {
      // Rotate sub-orbs around the main orb
      subOrbsRef.current.rotation.y = t * 0.5;
      
      // Control expansion factor
      let expansion = 0;
      if (scrollProgress > 0.55) {
        expansion = Math.min((scrollProgress - 0.55) / 0.2, 1);
      }
      
      const children = subOrbsRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as THREE.Mesh;
        const angle = (i / children.length) * Math.PI * 2;
        const targetRadius = 1.2 * expansion;
        
        child.position.set(
          Math.cos(angle) * targetRadius,
          Math.sin(angle) * targetRadius * 0.5,
          Math.sin(angle) * targetRadius
        );
        
        child.scale.setScalar(0.25 * expansion);
      }
    }
  });

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#f59e0b" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <directionalLight position={[0, 5, 2]} intensity={0.8} />

      {/* Main Genie Orb */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={mainOrbRef} position={[0, 0, 0]}>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={1.2}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </Float>

      {/* Scattered Clock / Calendar Fragments (Problem vs. Solution) */}
      <group ref={fragmentsRef}>
        {fragmentInitialPositions.map((config, idx) => (
          <mesh
            key={idx}
            position={config.scattered}
            rotation={config.rotation}
            scale={config.scale}
          >
            {idx % 3 === 0 ? (
              <boxGeometry args={[1, 1, 0.15]} /> // represents calendar cards
            ) : idx % 3 === 1 ? (
              <torusGeometry args={[0.5, 0.08, 8, 24]} /> // represents clock rings
            ) : (
              <coneGeometry args={[0.4, 0.8, 4]} /> // abstract deadline pins
            )}
            <meshStandardMaterial
              color={idx % 2 === 0 ? "#8b5cf6" : "#6366f1"}
              roughness={0.3}
              metalness={0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>

      {/* Sub-Orbs representing Agentic Subtask break-down */}
      <group ref={subOrbsRef} position={[0, 0, 0]}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <mesh key={idx} position={[0, 0, 0]} scale={0}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={1.5}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Drift Particle Dust */}
      <Sparkles
        count={75}
        scale={8}
        size={2.5}
        speed={0.4}
        color="#f59e0b"
        opacity={0.6}
      />
      <Sparkles
        count={50}
        scale={10}
        size={1.8}
        speed={0.2}
        color="#a78bfa"
        opacity={0.4}
      />
    </>
  );
}

// --- MAIN LANDING PAGE COMPONENT ---

interface LandingPage3DProps {
  onGetStarted: () => void;
}

export default function LandingPage3D({ onGetStarted }: LandingPage3DProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor scroll progress
  useEffect(() => {
    // Check WebGL compatibility on load
    setIsSupported(isWebGLAvailable());

    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll <= 0) return;
      
      const rawProgress = scrollTop / totalScroll;
      // Clamp between 0 and 1
      const progress = Math.max(0, Math.min(rawProgress, 1));
      setScrollProgress(progress);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleSkip = () => {
    onGetStarted();
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white font-sans overflow-hidden select-none">
      
      {/* 3D CANVAS OR GRADIENT FALLBACK */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {isSupported ? (
          <Canvas
            camera={{ position: [0, 0, 5], fov: 60 }}
            gl={{ antialias: true, alpha: false }}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#030303"]} />
            <fog attach="fog" args={["#030303", 3, 10]} />
            <Suspense fallback={null}>
              <SceneContent scrollProgress={scrollProgress} />
            </Suspense>
          </Canvas>
        ) : (
          // BEAUTIFUL CSS BACKUP GRADIENT + DRIFTING PARTICLES
          <div className="w-full h-full bg-[#050508] relative overflow-hidden flex items-center justify-center">
            {/* Soft Radial Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse duration-[8000ms]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl animate-pulse duration-[6000ms]" />
            
            {/* Flowing Grid background */}
            <div className="absolute inset-0 grid-dots opacity-20" />
          </div>
        )}
      </div>

      {/* TOP NAVIGATION HUD (STAYS STATIC) */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 py-5 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <SparklesIcon className="h-4.5 w-4.5 text-black" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-white uppercase tracking-widest">
            DeadlineGenie <span className="text-amber-500">AI</span>
          </span>
        </div>

        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold font-mono rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer backdrop-blur-sm"
          id="skip-landing-btn"
        >
          Skip Intro
        </button>
      </header>

      {/* SCROLL-INDICATOR */}
      <div className="absolute left-6 md:left-12 top-1/2 transform -translate-y-1/2 z-30 hidden md:flex flex-col gap-3 font-mono text-[9px] font-bold text-zinc-600 tracking-wider uppercase">
        <div className="flex flex-col gap-1.5 items-center">
          {[
            { label: "01 / Hero", active: scrollProgress < 0.2 },
            { label: "02 / Conflict", active: scrollProgress >= 0.2 && scrollProgress < 0.4 },
            { label: "03 / Harmony", active: scrollProgress >= 0.4 && scrollProgress < 0.6 },
            { label: "04 / Division", active: scrollProgress >= 0.6 && scrollProgress < 0.8 },
            { label: "05 / Access", active: scrollProgress >= 0.8 }
          ].map((sec, i) => (
            <div key={i} className="flex items-center gap-2.5 w-32 justify-start group">
              <span className={`h-1.5 rounded-full transition-all duration-300 ${sec.active ? "w-6 bg-amber-500" : "w-1.5 bg-zinc-800"}`} />
              <span className={`transition-colors duration-300 text-left ${sec.active ? "text-amber-500" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                {sec.label.split(" / ")[1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN SCROLLABLE CONTAINER FOR TEXT PANELS */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-10 overflow-y-auto scroll-smooth snap-y snap-mandatory"
        id="landing-scroll-container"
      >
        
        {/* SECTION 1: HERO */}
        <section className="h-screen w-full flex items-center justify-center px-6 snap-start relative">
          <div className="max-w-3xl text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="space-y-4"
            >
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest font-mono rounded-full">
                Tactical Task Interceptor
              </span>
              <h2 className="text-4xl md:text-6xl font-black text-white font-display tracking-tight leading-none">
                Confront Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Deadlines</span> Proactively
              </h2>
              <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto font-medium">
                DeadlineGenie is an active autonomous productivity companion that parses, schedules, and aggressively protects your calendar blocks.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-500 text-[10px] font-bold font-mono tracking-widest uppercase animate-bounce"
            >
              <span>Scroll to Begin Journey</span>
              <ChevronDown className="h-4 w-4 text-amber-500" />
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: THE PROBLEM */}
        <section className="h-screen w-full flex items-center justify-center md:justify-end px-6 md:px-24 snap-start relative">
          <div className="max-w-lg space-y-5 bg-black/40 p-6 md:p-8 rounded-2xl border border-zinc-900/50 backdrop-blur-sm">
            <span className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg inline-flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white font-display">
              The Scattered Chaos
            </h3>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
              Every day starts with the same illusion of order, only to dissolve into missing hours, broken timelines, and looming panic scores. Passive alarm lists don't save you from procrastination.
            </p>
            <div className="h-1 w-12 bg-red-500/60 rounded" />
          </div>
        </section>

        {/* SECTION 3: THE SOLUTION */}
        <section className="h-screen w-full flex items-center justify-center md:justify-start px-6 md:px-24 snap-start relative">
          <div className="max-w-lg space-y-5 bg-black/40 p-6 md:p-8 rounded-2xl border border-zinc-900/50 backdrop-blur-sm">
            <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg inline-flex items-center justify-center">
              <Layout className="h-4 w-4" />
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white font-display">
              The Harmonized Grid
            </h3>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
              The genie system instantly aligns fragments of chaotic commitments into a prioritized, real-time visual grid. Your cognitive load is immediately reduced as urgency tiers lock.
            </p>
            <div className="h-1 w-12 bg-amber-500/60 rounded" />
          </div>
        </section>

        {/* SECTION 4: AGENTIC POWER */}
        <section className="h-screen w-full flex items-center justify-center md:justify-end px-6 md:px-24 snap-start relative">
          <div className="max-w-lg space-y-5 bg-black/40 p-6 md:p-8 rounded-2xl border border-zinc-900/50 backdrop-blur-sm">
            <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg inline-flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white font-display">
              Autonomous Division
            </h3>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
              No task is too heavy. Let our autonomous AI subdivide large initiatives into clear, atomic, sequentially linked focus blocks synchronized automatically to Google Workspace.
            </p>
            <div className="h-1 w-12 bg-blue-500/60 rounded" />
          </div>
        </section>

        {/* SECTION 5: FINAL CTA */}
        <section className="h-screen w-full flex items-center justify-center px-6 snap-start relative">
          <div className="max-w-xl text-center space-y-8 bg-black/60 p-8 md:p-12 rounded-3xl border border-zinc-900 backdrop-blur-md relative overflow-hidden shadow-2xl">
            <span className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white font-display leading-tight">
                Authorize Focus Mode
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                Step into a tactical workspace where deadlines are predicted, schedules are structured, and goals are aggressively crushed.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={onGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 transition-all flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                id="landing-cta-btn"
              >
                Secure Your Deadlines
                <ArrowRight className="h-4 w-4 text-black group-hover:translate-x-1 transition-transform" />
              </button>
              
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                NO CC REQUIRED • INSTANT OFFLINE MODE INCLUDED
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
