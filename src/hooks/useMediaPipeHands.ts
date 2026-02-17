import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMediaPipeHandsOptions {
  onGestureDetected?: (gesture: string | null, landmarks: any[]) => void;
  maxNumHands?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

// Load a script from CDN and return a promise
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

export const useMediaPipeHands = ({
  onGestureDetected,
  maxNumHands = 2,
  minDetectionConfidence = 0.7,
  minTrackingConfidence = 0.5,
}: UseMediaPipeHandsOptions = {}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onGestureRef = useRef(onGestureDetected);

  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);

  // Keep callback ref in sync
  useEffect(() => {
    onGestureRef.current = onGestureDetected;
  }, [onGestureDetected]);

  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    });

    landmarks.forEach((landmark, index) => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, index === 0 ? 8 : 5, 0, 2 * Math.PI);
      if ([4, 8, 12, 16, 20].includes(index)) {
        ctx.fillStyle = '#f97316';
      } else if (index === 0) {
        ctx.fillStyle = '#0d9488';
      } else {
        ctx.fillStyle = '#2dd4bf';
      }
      ctx.fill();
      if ([4, 8, 12, 16, 20].includes(index)) {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    if (isRunning || isLoading) return;

    try {
      setError(null);
      setIsLoading(true);

      // Load MediaPipe scripts from CDN
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.min.js');

      const win = window as any;
      if (!win.Hands) {
        throw new Error('MediaPipe Hands failed to load');
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Initialize MediaPipe Hands
      const hands = new win.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      hands.setOptions({
        maxNumHands,
        modelComplexity: 1,
        minDetectionConfidence,
        minTrackingConfidence,
      });

      hands.onResults((results: any) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setHandDetected(true);
          results.multiHandLandmarks.forEach((landmarks: any[]) => {
            drawLandmarks(ctx, landmarks);
            if (onGestureRef.current) {
              onGestureRef.current(null, landmarks);
            }
          });
        } else {
          setHandDetected(false);
          if (onGestureRef.current) {
            onGestureRef.current(null, []);
          }
        }
      });

      handsRef.current = hands;

      // Processing loop using requestAnimationFrame
      const processFrame = async () => {
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            // Ignore frame processing errors
          }
        }
        animFrameRef.current = requestAnimationFrame(processFrame);
      };

      setIsRunning(true);
      setIsLoading(false);
      animFrameRef.current = requestAnimationFrame(processFrame);

    } catch (err) {
      console.error('Error starting camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera. Please allow camera access.');
      setIsLoading(false);
    }
  }, [maxNumHands, minDetectionConfidence, minTrackingConfidence, drawLandmarks, isRunning, isLoading]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
