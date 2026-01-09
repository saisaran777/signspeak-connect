import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Hand, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { detectGestureFromLandmarks, getGestureDescription } from '@/lib/signLanguageData';

interface CameraViewProps {
  onGestureDetected: (gesture: string | null, description: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

const CameraView = ({ onGestureDetected, isActive, onToggle }: CameraViewProps) => {
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [gestureStability, setGestureStability] = useState(0);
  const lastGestureRef = useRef<string | null>(null);
  const gestureCountRef = useRef(0);
  
  const STABILITY_THRESHOLD = 10; // Number of frames to confirm gesture

  const handleGestureDetected = useCallback((gesture: string | null, landmarks: any[]) => {
    if (landmarks.length === 0) {
      setCurrentGesture(null);
      setGestureStability(0);
      gestureCountRef.current = 0;
      lastGestureRef.current = null;
      return;
    }

    const detectedGesture = detectGestureFromLandmarks(landmarks);
    
    if (detectedGesture === lastGestureRef.current) {
      gestureCountRef.current++;
      setGestureStability(Math.min((gestureCountRef.current / STABILITY_THRESHOLD) * 100, 100));
      
      if (gestureCountRef.current >= STABILITY_THRESHOLD && detectedGesture !== currentGesture) {
        setCurrentGesture(detectedGesture);
        const description = getGestureDescription(detectedGesture);
        onGestureDetected(detectedGesture, description);
      }
    } else {
      lastGestureRef.current = detectedGesture;
      gestureCountRef.current = 1;
      setGestureStability(0);
    }
  }, [currentGesture, onGestureDetected]);

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

  useEffect(() => {
    if (isActive && !isRunning && !isLoading) {
      startCamera();
    } else if (!isActive && isRunning) {
      stopCamera();
      setCurrentGesture(null);
    }
  }, [isActive, isRunning, isLoading, startCamera, stopCamera]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto">
      {/* Camera frame container */}
      <div className="camera-frame bg-card relative overflow-hidden">
        {/* Video element (hidden but used for processing) */}
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
          {!isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 backdrop-blur-sm"
            >
              <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Camera is off</p>
              <p className="text-sm text-muted-foreground mb-6">Click the button below to start</p>
              <Button 
                onClick={onToggle}
                size="lg"
                className="gradient-bg-primary shadow-glow"
              >
                <Camera className="mr-2 w-5 h-5" />
                Start Camera
              </Button>
            </motion.div>
          )}

          {isLoading && isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 backdrop-blur-sm"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-foreground">Initializing camera...</p>
              <p className="text-sm text-muted-foreground">Please allow camera access</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm"
            >
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Camera Error</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
              <Button 
                onClick={startCamera}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hand detection indicator */}
        {isActive && isRunning && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
              <Hand className={`w-5 h-5 ${handDetected ? 'text-success' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${handDetected ? 'text-success' : 'text-muted-foreground'}`}>
                {handDetected ? 'Hand Detected' : 'Show your hand'}
              </span>
              {handDetected && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                </div>
              )}
            </div>

            {/* Gesture stability indicator */}
            {handDetected && gestureStability > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full gradient-bg-primary"
                    style={{ width: `${gestureStability}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {gestureStability === 100 ? 'Confirmed!' : 'Hold...'}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Current gesture display */}
        <AnimatePresence>
          {currentGesture && isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl glass shadow-lg"
            >
              <p className="text-xl font-display font-bold gradient-text text-center">
                {getGestureDescription(currentGesture)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording indicator */}
        {isActive && isRunning && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90">
            <div className="w-2 h-2 rounded-full bg-white animate-recording" />
            <span className="text-xs font-medium text-white">LIVE</span>
          </div>
        )}
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
