import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Hand, AlertCircle, Loader2, Zap, Eye, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { detectGestureFromLandmarks, getGestureDescription, getGestureEmoji, GestureResult } from '@/lib/signLanguageData';

interface CameraViewProps {
  onGestureDetected: (gesture: string | null, description: string) => void;
  isActive: boolean;
  onToggle: () => void;
  autoStart?: boolean;
  onStatsUpdate?: (stats: { fps: number; confidence: number; handDetected: boolean }) => void;
}

const CameraView = ({ onGestureDetected, isActive, onToggle, autoStart = true, onStatsUpdate }: CameraViewProps) => {
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [gestureStability, setGestureStability] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [fingerStates, setFingerStates] = useState<GestureResult['fingerStates'] | null>(null);
  
  const lastGestureRef = useRef<string | null>(null);
  const gestureCountRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const autoStartedRef = useRef(false);
  
  const STABILITY_THRESHOLD = 8;

  const handleGestureDetected = useCallback((gesture: string | null, landmarks: any[]) => {
    // Calculate FPS
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      const currentFps = frameCountRef.current;
      setFps(currentFps);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
      
      // Report stats to parent
      if (onStatsUpdate) {
        onStatsUpdate({
          fps: currentFps,
          confidence,
          handDetected,
        });
      }
    }

    if (landmarks.length === 0) {
      setCurrentGesture(null);
      setGestureStability(0);
      setConfidence(0);
      setFingerStates(null);
      gestureCountRef.current = 0;
      lastGestureRef.current = null;
      return;
    }

    const result = detectGestureFromLandmarks(landmarks);
    
    if (!result) {
      setGestureStability(Math.max(0, gestureStability - 10));
      return;
    }

    setFingerStates(result.fingerStates);
    setConfidence(result.confidence);
    
    if (result.gesture === lastGestureRef.current) {
      gestureCountRef.current++;
      setGestureStability(Math.min((gestureCountRef.current / STABILITY_THRESHOLD) * 100, 100));
      
      if (gestureCountRef.current >= STABILITY_THRESHOLD && result.gesture !== currentGesture) {
        setCurrentGesture(result.gesture);
        const description = getGestureDescription(result.gesture);
        onGestureDetected(result.gesture, description);
      }
    } else {
      lastGestureRef.current = result.gesture;
      gestureCountRef.current = 1;
      setGestureStability(0);
    }
  }, [currentGesture, onGestureDetected, gestureStability]);

  const {
    videoRef,
    canvasRef,
    isLoading,
    isRunning,
    error,
    handDetected,
    startCamera,
    stopCamera,
  } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
  });

  // Auto-start camera when component mounts and autoStart is true
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // Start camera directly after a small delay
      const timer = setTimeout(() => {
        console.log('Auto-starting camera directly...');
        startCamera();
        if (!isActive) {
          onToggle();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startCamera, isActive, onToggle]);

  // Handle manual toggle
  useEffect(() => {
    // Only handle manual toggles after autostart has happened
    if (!autoStartedRef.current) return;
    
    if (isActive && !isRunning && !isLoading) {
      console.log('Starting camera from manual toggle...');
      startCamera();
    } else if (!isActive && isRunning) {
      console.log('Stopping camera...');
      stopCamera();
      setCurrentGesture(null);
    }
  }, [isActive, isRunning, isLoading, startCamera, stopCamera]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto">
      {/* Camera frame container */}
      <div className="camera-frame bg-card relative overflow-hidden rounded-2xl border-2 border-primary/20">
        {/* Video element */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          playsInline
          muted
        />
        
        {/* Canvas overlay for hand tracking visualization */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
          width={1280}
          height={720}
        />

        {/* Status overlays */}
        <AnimatePresence>
          {!isActive && !isLoading && !isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted/95 to-background/95 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <CameraOff className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                  />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">Camera Ready</h3>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                  Start the camera to begin real-time sign language detection
                </p>
                <Button 
                  onClick={() => {
                    startCamera();
                    onToggle();
                  }}
                  size="lg"
                  className="gradient-bg-primary shadow-glow text-lg px-8 py-6"
                >
                  <Camera className="mr-2 w-6 h-6" />
                  Start Camera
                </Button>
              </motion.div>
            </motion.div>
          )}

          {(isLoading || (isActive && !isRunning && !error)) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted/95 to-background/95 backdrop-blur-md"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mt-6 mb-2">
                {isLoading ? 'Initializing AI...' : 'Starting Camera...'}
              </h3>
              <p className="text-muted-foreground">
                {isLoading ? 'Loading MediaPipe hand detection model' : 'Requesting camera access'}
              </p>
              <div className="flex gap-1 mt-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-md"
            >
              <AlertCircle className="w-16 h-16 text-destructive mb-4" />
              <h3 className="text-xl font-display font-bold text-foreground mb-2">Camera Error</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">{error}</p>
              <Button 
                onClick={startCamera}
                variant="outline"
                size="lg"
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live stats panel */}
        {isActive && isRunning && !error && (
          <>
            {/* Top stats bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 right-4 flex items-center justify-between"
            >
              {/* FPS and Detection Stats */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">{fps} FPS</span>
                <span className="text-muted-foreground">|</span>
                <Eye className="w-3.5 h-3.5 text-accent" />
                <span className="text-foreground font-medium">
                  {handDetected ? 'Tracking' : 'Waiting'}
                </span>
              </div>

              {/* Recording indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-white"
                />
                <span className="text-xs font-medium text-white">LIVE</span>
              </div>
            </motion.div>

            {/* Bottom info panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <div className="flex items-stretch gap-3">
                {/* Hand detection status */}
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl glass">
                  <div className={`p-2 rounded-lg ${handDetected ? 'bg-success/20' : 'bg-muted'}`}>
                    <Hand className={`w-5 h-5 ${handDetected ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${handDetected ? 'text-success' : 'text-muted-foreground'}`}>
                      {handDetected ? 'Hand Detected' : 'Show Your Hand'}
                    </p>
                    {handDetected && fingerStates && (
                      <div className="flex gap-1 mt-1">
                        {['👍', '☝️', '🖕', '💍', '🤙'].map((emoji, i) => {
                          const isUp = [fingerStates.thumb, fingerStates.index, fingerStates.middle, fingerStates.ring, fingerStates.pinky][i];
                          return (
                            <span 
                              key={i} 
                              className={`text-xs ${isUp ? 'opacity-100' : 'opacity-30'}`}
                            >
                              {['T', 'I', 'M', 'R', 'P'][i]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {handDetected && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-success"
                    />
                  )}
                </div>

                {/* Gesture stability indicator */}
                {handDetected && (
                  <div className="flex-1 flex flex-col gap-2 px-4 py-3 rounded-xl glass">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${gestureStability >= 100 ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium text-foreground">
                          {gestureStability >= 100 ? 'Confirmed!' : 'Hold still...'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full gradient-bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${gestureStability}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Current gesture display */}
        <AnimatePresence>
          {currentGesture && isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2"
            >
              <div className="px-8 py-4 rounded-2xl glass shadow-2xl border border-primary/20">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getGestureEmoji(currentGesture)}</span>
                  <div>
                    <p className="text-2xl font-display font-bold gradient-text">
                      {getGestureDescription(currentGesture)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {Math.round(confidence * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera controls */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-4"
        >
          <Button
            onClick={onToggle}
            variant="outline"
            size="lg"
            className="rounded-xl"
          >
            <CameraOff className="mr-2 w-5 h-5" />
            Stop Camera
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default CameraView;
