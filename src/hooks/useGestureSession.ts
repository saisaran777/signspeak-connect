import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GestureLogEntry {
  id: string;
  gesture_name: string;
  gesture_description: string | null;
  confidence: number | null;
  detected_at: string;
}

export interface SessionData {
  id: string;
  session_name: string | null;
  started_at: string;
  ended_at: string | null;
  total_gestures: number | null;
}

export const useGestureSession = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [gestureLogs, setGestureLogs] = useState<GestureLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionRef = useRef<SessionData | null>(null);
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Start a new session
  const startSession = useCallback(async (sessionName?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gesture_sessions')
        .insert({
          session_name: sessionName || `Session ${new Date().toLocaleString()}`,
        })
        .select()
        .single();

      if (error) throw error;
      
      setSession(data);
      setGestureLogs([]);
      
      toast({
        title: "Session Started",
        description: "Your gesture session has been created.",
      });
      
      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // End the current session
  const endSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('gesture_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_gestures: gestureLogs.length,
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      toast({
        title: "Session Ended",
        description: `Session completed with ${gestureLogs.length} gestures detected.`,
      });
      
      setSession(null);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [gestureLogs.length, toast]);

  // Log a detected gesture
  const logGesture = useCallback(async (
    gestureName: string,
    description: string,
    confidence: number
  ) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const { data, error } = await supabase
        .from('gesture_logs')
        .insert({
          session_id: currentSession.id,
          gesture_name: gestureName,
          gesture_description: description,
          confidence: Math.round(confidence * 100) / 100,
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setGestureLogs(prev => [data, ...prev].slice(0, 100));
      }
    } catch (error) {
      console.error('Error logging gesture:', error);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel('gesture-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gesture_logs',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newLog = payload.new as GestureLogEntry;
          setGestureLogs(prev => {
            if (prev.some(log => log.id === newLog.id)) return prev;
            return [newLog, ...prev].slice(0, 100);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Fetch session history
  const fetchSessionHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gesture_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }, []);

  return {
    session,
    gestureLogs,
    isLoading,
    startSession,
    endSession,
    logGesture,
    fetchSessionHistory,
  };
};
