import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpeechTranscriptEntry {
  id: string;
  original_text: string;
  converted_signs: string[] | null;
  created_at: string;
}

export const useSpeechTranscript = () => {
  const [transcripts, setTranscripts] = useState<SpeechTranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Save a speech transcript
  const saveTranscript = useCallback(async (
    sessionId: string | null,
    originalText: string,
    convertedSigns: string[]
  ) => {
    try {
      const { data, error } = await supabase
        .from('speech_transcripts')
        .insert({
          session_id: sessionId,
          original_text: originalText,
          converted_signs: convertedSigns,
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setTranscripts(prev => [data, ...prev].slice(0, 50));
      }
      
      return data;
    } catch (error) {
      console.error('Error saving transcript:', error);
      return null;
    }
  }, []);

  // Fetch recent transcripts
  const fetchTranscripts = useCallback(async (limit = 20) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('speech_transcripts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      setTranscripts(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast({
        title: "Error",
        description: "Failed to load transcripts.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Clear all transcripts (local state only)
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    transcripts,
    isLoading,
    saveTranscript,
    fetchTranscripts,
    clearTranscripts,
  };
};
