// ASL Sign Language gesture mappings
// Maps finger positions and hand configurations to letters/words

export interface SignGesture {
  name: string;
  description: string;
  fingerPositions: {
    thumb: 'extended' | 'folded' | 'across';
    index: 'extended' | 'folded' | 'bent';
    middle: 'extended' | 'folded' | 'bent';
    ring: 'extended' | 'folded' | 'bent';
    pinky: 'extended' | 'folded' | 'bent';
  };
}

export const ASL_ALPHABET: Record<string, SignGesture> = {
  A: {
    name: 'A',
    description: 'Fist with thumb on the side',
    fingerPositions: {
      thumb: 'across',
      index: 'folded',
      middle: 'folded',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  B: {
    name: 'B',
    description: 'Flat hand with thumb folded',
    fingerPositions: {
      thumb: 'folded',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended',
    },
  },
  C: {
    name: 'C',
    description: 'Curved hand forming C shape',
    fingerPositions: {
      thumb: 'extended',
      index: 'bent',
      middle: 'bent',
      ring: 'bent',
      pinky: 'bent',
    },
  },
  D: {
    name: 'D',
    description: 'Index up, others form circle with thumb',
    fingerPositions: {
      thumb: 'across',
      index: 'extended',
      middle: 'folded',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  E: {
    name: 'E',
    description: 'All fingers bent into palm, thumb across',
    fingerPositions: {
      thumb: 'across',
      index: 'bent',
      middle: 'bent',
      ring: 'bent',
      pinky: 'bent',
    },
  },
  F: {
    name: 'F',
    description: 'Index and thumb form circle, others extended',
    fingerPositions: {
      thumb: 'across',
      index: 'bent',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended',
    },
  },
  G: {
    name: 'G',
    description: 'Index and thumb pointing, others folded',
    fingerPositions: {
      thumb: 'extended',
      index: 'extended',
      middle: 'folded',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  H: {
    name: 'H',
    description: 'Index and middle extended horizontally',
    fingerPositions: {
      thumb: 'folded',
      index: 'extended',
      middle: 'extended',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  I: {
    name: 'I',
    description: 'Pinky extended, others folded',
    fingerPositions: {
      thumb: 'folded',
      index: 'folded',
      middle: 'folded',
      ring: 'folded',
      pinky: 'extended',
    },
  },
  K: {
    name: 'K',
    description: 'Index and middle up in V, thumb between',
    fingerPositions: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  L: {
    name: 'L',
    description: 'L shape with thumb and index',
    fingerPositions: {
      thumb: 'extended',
      index: 'extended',
      middle: 'folded',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  O: {
    name: 'O',
    description: 'All fingers form O shape',
    fingerPositions: {
      thumb: 'across',
      index: 'bent',
      middle: 'bent',
      ring: 'bent',
      pinky: 'bent',
    },
  },
  V: {
    name: 'V',
    description: 'Peace sign - index and middle extended',
    fingerPositions: {
      thumb: 'folded',
      index: 'extended',
      middle: 'extended',
      ring: 'folded',
      pinky: 'folded',
    },
  },
  W: {
    name: 'W',
    description: 'Three fingers extended',
    fingerPositions: {
      thumb: 'folded',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'folded',
    },
  },
  Y: {
    name: 'Y',
    description: 'Thumb and pinky extended (hang loose)',
    fingerPositions: {
      thumb: 'extended',
      index: 'folded',
      middle: 'folded',
      ring: 'folded',
      pinky: 'extended',
    },
  },
};

export const COMMON_PHRASES: Record<string, string> = {
  'thumbs_up': 'Yes / Good / OK',
  'thumbs_down': 'No / Bad',
  'wave': 'Hello / Goodbye',
  'open_palm': 'Stop / Wait',
  'pointing': 'Look / There',
  'peace': 'Peace / Victory',
  'rock_on': 'Rock on / Cool',
  'ok_sign': 'OK / Perfect',
  'fist': 'Power / Solidarity',
  'clap': 'Applause / Great job',
};

// Simplified gesture detection based on landmark positions
export const detectGestureFromLandmarks = (landmarks: any[]): string | null => {
  if (!landmarks || landmarks.length < 21) return null;

  // Landmark indices for each finger tip and base
  const THUMB_TIP = 4;
  const INDEX_TIP = 8;
  const MIDDLE_TIP = 12;
  const RING_TIP = 16;
  const PINKY_TIP = 20;
  
  const THUMB_BASE = 2;
  const INDEX_BASE = 5;
  const MIDDLE_BASE = 9;
  const RING_BASE = 13;
  const PINKY_BASE = 17;

  const WRIST = 0;

  // Helper function to check if finger is extended
  const isFingerExtended = (tipIdx: number, baseIdx: number): boolean => {
    return landmarks[tipIdx].y < landmarks[baseIdx].y;
  };

  const isThumbExtended = (): boolean => {
    // For thumb, check x position relative to palm
    return Math.abs(landmarks[THUMB_TIP].x - landmarks[WRIST].x) > 0.1;
  };

  const thumbUp = isThumbExtended();
  const indexUp = isFingerExtended(INDEX_TIP, INDEX_BASE);
  const middleUp = isFingerExtended(MIDDLE_TIP, MIDDLE_BASE);
  const ringUp = isFingerExtended(RING_TIP, RING_BASE);
  const pinkyUp = isFingerExtended(PINKY_TIP, PINKY_BASE);

  // Count extended fingers
  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  // Detect specific gestures
  
  // Thumbs up
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 'THUMBS_UP';
  }

  // Open palm / Stop (all fingers extended)
  if (thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
    return 'OPEN_PALM';
  }

  // Peace / V sign
  if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
    return 'V';
  }

  // OK sign (thumb and index form circle) - simplified detection
  if (thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 'L';
  }

  // Rock on / I love you
  if (thumbUp && indexUp && !middleUp && !ringUp && pinkyUp) {
    return 'I_LOVE_YOU';
  }

  // Pointing (index extended only)
  if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 'D';
  }

  // Fist (no fingers extended)
  if (!thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 'A';
  }

  // Three fingers (W)
  if (!thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
    return 'W';
  }

  // Four fingers (B without thumb)
  if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
    return 'B';
  }

  // Y sign (thumb and pinky only)
  if (thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
    return 'Y';
  }

  // Pinky only (I)
  if (!thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
    return 'I';
  }

  return null;
};

export const gestureToSpeech: Record<string, string> = {
  'THUMBS_UP': 'Yes, that\'s correct!',
  'OPEN_PALM': 'Hello! Nice to meet you.',
  'V': 'Peace! Victory!',
  'L': 'L - Look at this',
  'I_LOVE_YOU': 'I love you!',
  'D': 'D - Look over there',
  'A': 'A - Fist bump!',
  'W': 'W - Three, or W',
  'B': 'B - Four fingers',
  'Y': 'Y - Call me!',
  'I': 'I - One, or I',
};

export const getGestureDescription = (gesture: string): string => {
  return gestureToSpeech[gesture] || gesture;
};
