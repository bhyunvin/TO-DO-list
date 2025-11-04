interface GeminiFunctionCall {
  name: string;
  args?: Record<string, any>;
}

interface GeminiFunctionResponse {
  name: string;
  response: {
    content: any;
  };
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}

interface GeminiContent {
  parts: GeminiPart[];
  role?: string;
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
  index: number;
  // 필요한 다른 속성들을 추가할 수 있습니다.
}

export interface GeminiApiResponse {
  candidates: GeminiCandidate[];
  // 필요한 다른 속성들을 추가할 수 있습니다.
}
