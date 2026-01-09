import { useCallback, useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface UseMediaPipeHandsOptions {
  onGestureDetected?: (gesture: string | null, landmarks: any[]) => void;
  maxNumHands?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export const useMediaPipeHands = ({
  onGestureDetected,
  maxNumHands = 2,
  minDetectionConfidence = 0.7,
  minTrackingConfidence = 0.5,
}: UseMediaPipeHandsOptions = {}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);

  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Draw connections
    ctx.strokeStyle = '#14b8a6'; // Teal color matching primary
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((landmark, index) => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, index === 0 ? 8 : 5, 0, 2 * Math.PI);
      
      // Different colors for different finger tips
      if ([4, 8, 12, 16, 20].includes(index)) {
        ctx.fillStyle = '#f97316'; // Accent color for fingertips
      } else if (index === 0) {
        ctx.fillStyle = '#0d9488'; // Primary for wrist
      } else {
        ctx.fillStyle = '#2dd4bf'; // Primary glow for other points
      }
      
      ctx.fill();
      
      // Add glow effect to fingertips
      if ([4, 8, 12, 16, 20].includes(index)) {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, []);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      
      results.multiHandLandmarks.forEach((landmarks) => {
        drawLandmarks(ctx, landmarks);
        
        // Call gesture detection callback
        if (onGestureDetected) {
          onGestureDetected(null, landmarks);
        }
      });
    } else {
      setHandDetected(false);
      if (onGestureDetected) {
        onGestureDetected(null, []);
      }
    }
  }, [drawLandmarks, onGestureDetected]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setIsLoading(true);

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands,
        modelComplexity: 1,
        minDetectionConfidence,
        minTrackingConfidence,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Initialize camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      await camera.start();
      
      setIsRunning(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      setIsLoading(false);
    }
  }, [maxNumHands, minDetectionConfidence, minTrackingConfidence, onResults]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    
    setIsRunning(false);
    setHandDetected(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    isRunning,
    error,
    handDetected,
    startCamera,
    stopCamera,
  };
};
