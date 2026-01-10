import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Hand, Mic } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CameraView from './CameraView';
import GestureHistory, { GestureHistoryItem } from './GestureHistory';
import SpeechControls from './SpeechControls';
import SpeechToSign from './SpeechToSign';
import SentenceBuilder from './SentenceBuilder';
import TutorialModal from './TutorialModal';
import PrivacyBadge from './PrivacyBadge';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

const TranslatorSection = () => {
  const [mode, setMode] = useState<'sign-to-speech' | 'speech-to-sign'>('sign-to-speech');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [gestureHistory, setGestureHistory] = useState<GestureHistoryItem[]>([]);
  const [lastDetectedText, setLastDetectedText] = useState('');
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  
  const { speak } = useSpeechSynthesis();
  const historyIdRef = useRef(0);

  const handleGestureDetected = useCallback((gesture: string | null, description: string) => {
    if (gesture && description) {
      setLastDetectedText(description);
      setCurrentGesture(gesture);
      
      const newItem: GestureHistoryItem = {
        id: `gesture-${historyIdRef.current++}`,
        gesture,
        description,
        timestamp: new Date(),
      };
      
      setGestureHistory(prev => [newItem, ...prev].slice(0, 50));
      
      if (autoSpeak) {
        speak(description);
      }
    }
  }, [autoSpeak, speak]);

  const handleClearHistory = useCallback(() => {
    setGestureHistory([]);
    setLastDetectedText('');
    setCurrentGesture(null);
  }, []);

  const handleReplay = useCallback((item: GestureHistoryItem) => {
    setCurrentGesture(item.gesture);
    setLastDetectedText(item.description);
  }, []);

  return (
    <section id="translator" className="py-24">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-8"
        >
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Start <span className="gradient-text">Translating</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Choose your translation mode and start communicating instantly.
          </p>
          
          {/* Help & Privacy */}
          <div className="flex items-center justify-center gap-3">
            <TutorialModal />
            <PrivacyBadge />
          </div>
        </motion.div>

        {/* Mode selector */}
        <div className="max-w-5xl mx-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-14 p-1 bg-muted rounded-xl">
              <TabsTrigger 
                value="sign-to-speech" 
                className="rounded-lg data-[state=active]:gradient-bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow h-full text-base font-medium"
              >
                <Hand className="w-5 h-5 mr-2" />
                Sign to Speech
              </TabsTrigger>
              <TabsTrigger 
                value="speech-to-sign"
                className="rounded-lg data-[state=active]:gradient-bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-accent h-full text-base font-medium"
              >
                <Mic className="w-5 h-5 mr-2" />
                Speech to Sign
              </TabsTrigger>
            </TabsList>

            {/* Sign to Speech Mode */}
            <TabsContent value="sign-to-speech" className="mt-0">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Camera view */}
                <div className="lg:col-span-2">
                  <CameraView
                    onGestureDetected={handleGestureDetected}
                    isActive={isCameraActive}
                    onToggle={() => setIsCameraActive(!isCameraActive)}
                  />
                  
                  {/* Sentence Builder */}
                  <div className="mt-6">
                    <SentenceBuilder
                      currentGesture={currentGesture}
                      onClear={() => setCurrentGesture(null)}
                    />
                  </div>
                </div>

                {/* Controls and history */}
                <div className="space-y-6">
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
            </TabsContent>

            {/* Speech to Sign Mode */}
            <TabsContent value="speech-to-sign" className="mt-0">
              <SpeechToSign
                isActive={isSpeechActive}
                onToggle={() => setIsSpeechActive(!isSpeechActive)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default TranslatorSection;
