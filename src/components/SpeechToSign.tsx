import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Hand, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { ASL_ALPHABET } from '@/lib/signLanguageData';

interface SpeechToSignProps {
  isActive: boolean;
  onToggle: () => void;
}

const SpeechToSign = ({ isActive, onToggle }: SpeechToSignProps) => {
  const [currentLetters, setCurrentLetters] = useState<string[]>([]);
  const [activeLetterIndex, setActiveLetterIndex] = useState(0);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Parse transcript into letters for sign display
  useEffect(() => {
    const fullText = (transcript + interimTranscript).toUpperCase().replace(/[^A-Z]/g, '');
    const letters = fullText.split('').filter(letter => ASL_ALPHABET[letter]);
    setCurrentLetters(letters);
    setActiveLetterIndex(0);
  }, [transcript, interimTranscript]);

  // Animate through letters
  useEffect(() => {
    if (currentLetters.length > 0) {
      const interval = setInterval(() => {
        setActiveLetterIndex(prev => 
          prev < currentLetters.length - 1 ? prev + 1 : prev
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentLetters.length]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
    onToggle();
  };

  const activeLetter = currentLetters[activeLetterIndex];
  const signInfo = activeLetter ? ASL_ALPHABET[activeLetter] : null;

  return (
    <div className="space-y-6">
      {/* Speech-to-Sign header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-bg-accent shadow-accent">
            <Mic className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Speech to Sign</h3>
            <p className="text-sm text-muted-foreground">Speak and see sign language</p>
          </div>
        </div>
        
        <Button
          onClick={handleToggle}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className={`rounded-xl ${!isListening ? 'gradient-bg-accent shadow-accent' : ''}`}
          disabled={!isSupported}
        >
          {isListening ? (
            <>
              <MicOff className="mr-2 w-5 h-5" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="mr-2 w-5 h-5" />
              Start Speaking
            </>
          )}
        </Button>
      </div>

      {/* Not supported warning */}
      {!isSupported && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <AlertCircle className="w-5 h-5 text-warning" />
          <p className="text-sm text-foreground">
            Speech recognition is not supported in your browser. Try Chrome or Edge.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {/* Main content area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Transcript display */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">Your Speech</h4>
          </div>
          
          <div className="min-h-[120px] p-4 rounded-xl bg-muted/50">
            {isListening && !transcript && !interimTranscript ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Listening...</span>
              </div>
            ) : transcript || interimTranscript ? (
              <p className="text-foreground leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground">{interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                Start speaking to see your words here...
              </p>
            )}
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 1.5, 1] }}
                  transition={{ 
                    duration: 0.5, 
                    repeat: Infinity, 
                    delay: i * 0.1,
                    ease: "easeInOut" 
                  }}
                  className="w-1 h-4 rounded-full bg-accent"
                />
              ))}
            </div>
          )}
        </div>

        {/* Sign display */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Hand className="w-5 h-5 text-accent" />
            <h4 className="font-medium text-foreground">Sign Language</h4>
          </div>

          <div className="min-h-[120px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {signInfo ? (
                <motion.div
                  key={activeLetter}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 rounded-2xl gradient-bg-primary flex items-center justify-center mb-4 mx-auto shadow-glow">
                    <span className="text-5xl font-display font-bold text-primary-foreground">
                      {activeLetter}
                    </span>
                  </div>
                  <p className="text-foreground font-medium">{signInfo.name}</p>
                  <p className="text-sm text-muted-foreground">{signInfo.description}</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center mb-4 mx-auto">
                    <Hand className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Signs will appear here
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Letter queue */}
          {currentLetters.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Letter sequence:</p>
              <div className="flex flex-wrap gap-1">
                {currentLetters.map((letter, index) => (
                  <span
                    key={index}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                      index === activeLetterIndex
                        ? 'gradient-bg-primary text-primary-foreground'
                        : index < activeLetterIndex
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToSign;
