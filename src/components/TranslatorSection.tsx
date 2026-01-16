import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hand, Mic, ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CameraView from './CameraView';
import GestureHistory, { GestureHistoryItem } from './GestureHistory';
import SpeechControls from './SpeechControls';
import SpeechToSign from './SpeechToSign';
import SentenceBuilder from './SentenceBuilder';
import TutorialModal from './TutorialModal';
import PrivacyBadge from './PrivacyBadge';
import QualityIndicator from './QualityIndicator';
import SessionPanel from './SessionPanel';
import AdvancedStats from './AdvancedStats';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useGestureSession } from '@/hooks/useGestureSession';

const TranslatorSection = () => {
  const [mode, setMode] = useState<'sign-to-speech' | 'speech-to-sign'>('sign-to-speech');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [gestureHistory, setGestureHistory] = useState<GestureHistoryItem[]>([]);
  const [lastDetectedText, setLastDetectedText] = useState('');
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [fps, setFps] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [qualityData, setQualityData] = useState({
    handDetected: false,
    confidence: 0,
    lightingQuality: 'unknown' as 'good' | 'poor' | 'unknown',
  });
  
  const { speak } = useSpeechSynthesis();
  const { 
    session, 
    gestureLogs, 
    isLoading: sessionLoading, 
    startSession, 
    endSession, 
    logGesture 
  } = useGestureSession();
  
  const historyIdRef = useRef(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll into view when section is mounted
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#translator') {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleGestureDetected = useCallback((gesture: string | null, description: string) => {
    if (gesture && description) {
      setLastDetectedText(description);
      setCurrentGesture(gesture);
      setQualityData(prev => ({ ...prev, handDetected: true, confidence: 85 }));
      
      const newItem: GestureHistoryItem = {
        id: `gesture-${historyIdRef.current++}`,
        gesture,
        description,
        timestamp: new Date(),
      };
      
      setGestureHistory(prev => [newItem, ...prev].slice(0, 50));
      
      // Log to backend if session is active
      if (session) {
        logGesture(gesture, description, 0.85);
      }
      
      if (autoSpeak) {
        speak(description);
      }
    }
  }, [autoSpeak, speak, session, logGesture]);

  const handleClearHistory = useCallback(() => {
    setGestureHistory([]);
    setLastDetectedText('');
    setCurrentGesture(null);
  }, []);

  const handleReplay = useCallback((item: GestureHistoryItem) => {
    setCurrentGesture(item.gesture);
    setLastDetectedText(item.description);
    speak(item.description);
  }, [speak]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as typeof mode);
    // Reset states when switching modes
    if (newMode === 'speech-to-sign') {
      setIsCameraActive(false);
    } else {
      setIsSpeechActive(false);
    }
  };

  const handleStatsUpdate = useCallback((stats: { fps: number; confidence: number; handDetected: boolean }) => {
    setFps(stats.fps);
    setConfidence(stats.confidence);
    setQualityData(prev => ({
      ...prev,
      handDetected: stats.handDetected,
      confidence: Math.round(stats.confidence * 100),
    }));
  }, []);

  return (
    <section id="translator" ref={sectionRef} className="py-16 lg:py-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            whileInView={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Real-Time Translation
            <Wand2 className="w-4 h-4" />
          </motion.div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Start <span className="gradient-text">Translating</span> Now
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Choose your translation mode and start communicating instantly. 
            All processing happens locally in your browser for maximum privacy.
          </p>
          
          {/* Help & Privacy badges */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <TutorialModal />
            <PrivacyBadge />
          </div>
        </motion.div>

        {/* Session Panel */}
        <div className="max-w-6xl mx-auto mb-8">
          <SessionPanel
            session={session}
            gestureLogs={gestureLogs}
            isLoading={sessionLoading}
            onStartSession={startSession}
            onEndSession={endSession}
          />
        </div>

        {/* Mode selector */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-10 h-16 p-1.5 bg-muted/80 rounded-2xl shadow-lg border border-border/50">
              <TabsTrigger 
                value="sign-to-speech" 
                className="rounded-xl data-[state=active]:gradient-bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow h-full text-base font-semibold transition-all duration-300"
              >
                <Hand className="w-5 h-5 mr-2" />
                Sign to Speech
                <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
              </TabsTrigger>
              <TabsTrigger 
                value="speech-to-sign"
                className="rounded-xl data-[state=active]:gradient-bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-accent h-full text-base font-semibold transition-all duration-300"
              >
                <Mic className="w-5 h-5 mr-2" />
                Speech to Sign
                <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
              </TabsTrigger>
            </TabsList>

            {/* Sign to Speech Mode */}
            <TabsContent value="sign-to-speech" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Camera view */}
                  <div className="lg:col-span-2 space-y-6">
                    <CameraView
                      onGestureDetected={handleGestureDetected}
                      isActive={isCameraActive}
                      onToggle={() => setIsCameraActive(!isCameraActive)}
                      autoStart={true}
                      onStatsUpdate={handleStatsUpdate}
                    />
                    
                    {/* Quality Indicator */}
                    {isCameraActive && (
                      <QualityIndicator
                        handDetected={qualityData.handDetected}
                        gestureConfidence={qualityData.confidence}
                        lightingQuality={qualityData.lightingQuality}
                      />
                    )}
                    
                    {/* Sentence Builder */}
                    <SentenceBuilder
                      currentGesture={currentGesture}
                      onClear={() => setCurrentGesture(null)}
                    />
                  </div>

                  {/* Controls and history */}
                  <div className="space-y-6">
                    {/* Advanced Stats */}
                    {isCameraActive && (
                      <AdvancedStats
                        fps={fps}
                        confidence={confidence}
                        gestureCount={gestureHistory.length}
                        handDetected={qualityData.handDetected}
                        processingLatency={Math.round(1000 / (fps || 1))}
                      />
                    )}
                    
                    <SpeechControls
                      lastDetectedText={lastDetectedText}
                      autoSpeak={autoSpeak}
                      onAutoSpeakChange={setAutoSpeak}
                    />
                    <GestureHistory
                      history={gestureHistory}
                      onClear={handleClearHistory}
                      onReplay={handleReplay}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Speech to Sign Mode */}
            <TabsContent value="speech-to-sign" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SpeechToSign
                  isActive={isSpeechActive}
                  onToggle={() => setIsSpeechActive(!isSpeechActive)}
                  autoStart={true}
                  sessionId={session?.id || null}
                />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default TranslatorSection;
